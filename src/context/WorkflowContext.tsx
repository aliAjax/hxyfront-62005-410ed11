import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MaintenanceTask, PipeRecord } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import {
  DEFAULT_WORKFLOW_STATE,
  WORKFLOW_STEPS,
  type WorkflowContextValue,
  type WorkflowPipeData,
  type WorkflowState,
  type WorkflowStep,
} from '../types/workflow';

const WORKFLOW_STORAGE_KEY = 'organ_tuning_workflow_state';

function getStateSnapshot(s: WorkflowState): string {
  const { lastSavedAt, ...rest } = s;
  return JSON.stringify(rest);
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkflowState>(() => {
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as WorkflowState;
      } catch {
        return DEFAULT_WORKFLOW_STATE;
      }
    }
    return DEFAULT_WORKFLOW_STATE;
  });

  const prevSnapshotRef = useRef<string>(getStateSnapshot(state));

  const saveWorkflowToStorage = useCallback(() => {
    setState((prev) => {
      const now = new Date().toISOString();
      const toSave: WorkflowState = { ...prev, lastSavedAt: now };
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(toSave));
      return toSave;
    });
  }, []);

  const clearWorkflowStorage = useCallback(() => {
    localStorage.removeItem(WORKFLOW_STORAGE_KEY);
  }, []);

  const loadWorkflowFromStorage = useCallback((): boolean => {
    const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorkflowState;
        setState(parsed);
        prevSnapshotRef.current = getStateSnapshot(parsed);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const resetWorkflow = useCallback(() => {
    clearWorkflowStorage();
    setState(DEFAULT_WORKFLOW_STATE);
    prevSnapshotRef.current = getStateSnapshot(DEFAULT_WORKFLOW_STATE);
  }, [clearWorkflowStorage]);

  useEffect(() => {
    const currentSnapshot = getStateSnapshot(state);
    if (currentSnapshot === prevSnapshotRef.current) return;
    prevSnapshotRef.current = currentSnapshot;
    const timeout = window.setTimeout(() => {
      const now = new Date().toISOString();
      const toSave: WorkflowState = { ...state, lastSavedAt: now };
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(toSave));
      setState((prev) => ({ ...prev, lastSavedAt: now }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const markStepCompleted = useCallback((step: WorkflowStep) => {
    setState((prev) => {
      if (prev.completedSteps.includes(step)) return prev;
      return { ...prev, completedSteps: [...prev.completedSteps, step] };
    });
  }, []);

  const isStepCompleted = useCallback(
    (step: WorkflowStep): boolean => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps]
  );

  const canGoNext = useCallback((): boolean => {
    const { currentStep, venueId, maintenanceDate, participants, pipeNumbers } = state;
    switch (currentStep) {
      case 'venue':
        return !!(venueId && maintenanceDate && participants && pipeNumbers.length > 0);
      case 'stops':
        return true;
      case 'deviation':
        return state.pipeNumbers.length > 0;
      case 'environment':
        return true;
      case 'reinspection':
        return true;
      case 'report':
        return false;
      default:
        return false;
    }
  }, [state]);

  const canGoPrev = useCallback((): boolean => {
    const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);
    return currentIndex > 0;
  }, [state.currentStep]);

  const goToStep = useCallback((step: WorkflowStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);
    if (currentIndex < WORKFLOW_STEPS.length - 1) {
      const next = WORKFLOW_STEPS[currentIndex + 1];
      markStepCompleted(state.currentStep);
      goToStep(next);
    }
  }, [state.currentStep, markStepCompleted, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prev = WORKFLOW_STEPS[currentIndex - 1];
      goToStep(prev);
    }
  }, [state.currentStep, goToStep]);

  const updatePipeData = useCallback((pipeNumber: string, data: Partial<WorkflowPipeData>) => {
    setState((prev) => ({
      ...prev,
      pipeData: {
        ...prev.pipeData,
        [pipeNumber]: { ...prev.pipeData[pipeNumber], ...data },
      },
    }));
  }, []);

  const bulkUpdatePipeData = useCallback(
    (updates: Record<string, Partial<WorkflowPipeData>>) => {
      setState((prev) => {
        const newPipeData = { ...prev.pipeData };
        for (const [pipeNumber, data] of Object.entries(updates)) {
          newPipeData[pipeNumber] = { ...newPipeData[pipeNumber], ...data };
        }
        return { ...prev, pipeData: newPipeData };
      });
    },
    []
  );

  const addTemperatureHumidity = useCallback(
    (data: { temperature: number; humidity: number; note?: string }) => {
      const newRecord = {
        id: `th-${Date.now()}`,
        temperature: data.temperature,
        humidity: data.humidity,
        recordedAt: new Date().toISOString(),
        note: data.note,
      };
      setState((prev) => ({
        ...prev,
        temperatureHumidityRecords: [...prev.temperatureHumidityRecords, newRecord],
      }));
    },
    []
  );

  const removeTemperatureHumidity = useCallback((recordId: string) => {
    setState((prev) => ({
      ...prev,
      temperatureHumidityRecords: prev.temperatureHumidityRecords.filter(
        (r) => r.id !== recordId
      ),
    }));
  }, []);

  const buildPipeRecords = useCallback((): PipeRecord[] => {
    const now = new Date().toISOString();
    return state.pipeNumbers.map((pipeNumber) => {
      const data = state.pipeData[pipeNumber] || {};
      return {
        id: `wf-${Date.now()}-${pipeNumber}`,
        pipeNumber,
        stopId: data.stopId,
        stopName: data.stopName,
        pitch: data.pitch,
        centDeviation: data.centDeviation,
        temperature: data.temperature,
        humidity: data.humidity,
        reedStatus: data.reedStatus,
        remarks: data.remarks,
        reinspected: data.reinspected,
        reinspectedAt: data.reinspectedAt,
        reinspectionNote: data.reinspectionNote,
        createdAt: now,
        updatedAt: now,
      };
    });
  }, [state.pipeNumbers, state.pipeData]);

  const finalizeAndSave = useCallback((): MaintenanceTask | null => {
    if (!state.venueId || state.pipeNumbers.length === 0) return null;

    const pipeRecords = buildPipeRecords();

    if (state.taskId) {
      const updated = maintenanceService.update(state.taskId, {
        venueId: state.venueId,
        venueName: state.venueName,
        maintenanceDate: state.maintenanceDate,
        participants: state.participants,
        pipeNumbers: state.pipeNumbers,
        pipeRecords,
        temperatureHumidityRecords: state.temperatureHumidityRecords,
        reportSummary: state.reportSummary || undefined,
        maintenanceNotes: state.maintenanceNotes || undefined,
      });
      clearWorkflowStorage();
      return updated || null;
    }

    const created = maintenanceService.create({
      venueId: state.venueId,
      maintenanceDate: state.maintenanceDate,
      participants: state.participants,
      pipeNumbers: state.pipeNumbers,
    });

    const finalTask = maintenanceService.update(created.id, {
      pipeRecords,
      temperatureHumidityRecords: state.temperatureHumidityRecords,
      reportSummary: state.reportSummary || undefined,
      maintenanceNotes: state.maintenanceNotes || undefined,
    });

    clearWorkflowStorage();
    return finalTask || null;
  }, [state, buildPipeRecords, clearWorkflowStorage]);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      state,
      setState,
      goToStep,
      nextStep,
      prevStep,
      canGoNext,
      canGoPrev,
      isStepCompleted,
      updatePipeData,
      bulkUpdatePipeData,
      addTemperatureHumidity,
      removeTemperatureHumidity,
      saveWorkflowToStorage,
      loadWorkflowFromStorage,
      clearWorkflowStorage,
      resetWorkflow,
      finalizeAndSave,
    }),
    [
      state,
      goToStep,
      nextStep,
      prevStep,
      canGoNext,
      canGoPrev,
      isStepCompleted,
      updatePipeData,
      bulkUpdatePipeData,
      addTemperatureHumidity,
      removeTemperatureHumidity,
      saveWorkflowToStorage,
      loadWorkflowFromStorage,
      clearWorkflowStorage,
      resetWorkflow,
      finalizeAndSave,
    ]
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return ctx;
}

export { WORKFLOW_STORAGE_KEY };
