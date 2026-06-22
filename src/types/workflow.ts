import type { MaintenanceTask, PipeRecord, TemperatureHumidityRecord } from './maintenance';

export type WorkflowStep =
  | 'venue'
  | 'stops'
  | 'deviation'
  | 'environment'
  | 'reinspection'
  | 'report';

export const WORKFLOW_STEPS: WorkflowStep[] = [
  'venue',
  'stops',
  'deviation',
  'environment',
  'reinspection',
  'report',
];

export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  venue: '场馆选择',
  stops: '音栓资料',
  deviation: '调音偏差录入',
  environment: '温湿度采集',
  reinspection: '异常音管复检',
  report: '报告生成',
};

export const WORKFLOW_STEP_ICONS: Record<WorkflowStep, string> = {
  venue: '🏛️',
  stops: '🎵',
  deviation: '🎯',
  environment: '🌡️',
  reinspection: '🔍',
  report: '📑',
};

export interface WorkflowPipeData {
  stopId?: string;
  stopName?: string;
  pitch?: string;
  centDeviation?: number;
  temperature?: number;
  humidity?: number;
  reedStatus?: string;
  remarks?: string;
  reinspected?: boolean;
  reinspectedAt?: string;
  reinspectionNote?: string;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  taskId?: string;
  venueId: string;
  venueName: string;
  maintenanceDate: string;
  participants: string;
  pipeNumbers: string[];
  pipeData: Record<string, WorkflowPipeData>;
  temperatureHumidityRecords: TemperatureHumidityRecord[];
  reportSummary: string;
  maintenanceNotes: string;
  completedSteps: WorkflowStep[];
  lastSavedAt?: string;
}

export const DEFAULT_WORKFLOW_STATE: WorkflowState = {
  currentStep: 'venue',
  venueId: '',
  venueName: '',
  maintenanceDate: new Date().toISOString().split('T')[0],
  participants: '',
  pipeNumbers: [],
  pipeData: {},
  temperatureHumidityRecords: [],
  reportSummary: '',
  maintenanceNotes: '',
  completedSteps: [],
};

export interface WorkflowContextValue {
  state: WorkflowState;
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>;
  goToStep: (step: WorkflowStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  isStepCompleted: (step: WorkflowStep) => boolean;
  updatePipeData: (pipeNumber: string, data: Partial<WorkflowPipeData>) => void;
  bulkUpdatePipeData: (updates: Record<string, Partial<WorkflowPipeData>>) => void;
  addTemperatureHumidity: (data: { temperature: number; humidity: number; note?: string }) => void;
  removeTemperatureHumidity: (recordId: string) => void;
  saveWorkflowToStorage: () => void;
  loadWorkflowFromStorage: () => boolean;
  clearWorkflowStorage: () => void;
  resetWorkflow: () => void;
  finalizeAndSave: () => MaintenanceTask | null;
}
