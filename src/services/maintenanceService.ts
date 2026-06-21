import type { MaintenanceTask, MaintenanceTaskFormData, PipeRecord, TemperatureHumidityRecord, AbnormalPipeInfo, AbnormalReason } from '../types/maintenance';
import { venueService } from './venueService';

const STORAGE_KEY = 'organ_tuning_maintenance_tasks';

export const maintenanceService = {
  getAll(): MaintenanceTask[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const tasks = JSON.parse(data);
    return tasks.map((task: MaintenanceTask) => ({
      ...task,
      temperatureHumidityRecords: task.temperatureHumidityRecords || [],
    }));
  },

  getById(id: string): MaintenanceTask | undefined {
    const tasks = this.getAll();
    return tasks.find((t) => t.id === id);
  },

  create(formData: MaintenanceTaskFormData): MaintenanceTask {
    const tasks = this.getAll();
    const venue = venueService.getById(formData.venueId);
    const now = new Date().toISOString();

    const pipeRecords: PipeRecord[] = formData.pipeNumbers.map((pipeNumber) => ({
      id: `${Date.now()}-${pipeNumber}`,
      pipeNumber,
      createdAt: now,
      updatedAt: now,
    }));

    const newTask: MaintenanceTask = {
      id: Date.now().toString(),
      venueId: formData.venueId,
      venueName: venue?.name || '',
      maintenanceDate: formData.maintenanceDate,
      participants: formData.participants,
      pipeNumbers: formData.pipeNumbers,
      pipeRecords,
      temperatureHumidityRecords: [],
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(newTask);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return newTask;
  },

  update(id: string, updates: Partial<MaintenanceTask>): MaintenanceTask | undefined {
    const tasks = this.getAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    const updatedTask: MaintenanceTask = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updatedTask;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return updatedTask;
  },

  delete(id: string): boolean {
    const tasks = this.getAll();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  updatePipeRecord(taskId: string, pipeRecordId: string, updates: Partial<PipeRecord>): PipeRecord | undefined {
    const task = this.getById(taskId);
    if (!task) return undefined;

    const pipeIndex = task.pipeRecords.findIndex((p) => p.id === pipeRecordId);
    if (pipeIndex === -1) return undefined;

    const updatedRecord: PipeRecord = {
      ...task.pipeRecords[pipeIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    task.pipeRecords[pipeIndex] = updatedRecord;
    this.update(taskId, { pipeRecords: task.pipeRecords });
    return updatedRecord;
  },

  addTemperatureHumidityRecord(
    taskId: string,
    data: { temperature: number; humidity: number; note?: string }
  ): TemperatureHumidityRecord | undefined {
    const task = this.getById(taskId);
    if (!task) return undefined;

    const newRecord: TemperatureHumidityRecord = {
      id: `th-${Date.now()}`,
      temperature: data.temperature,
      humidity: data.humidity,
      recordedAt: new Date().toISOString(),
      note: data.note,
    };

    const updatedRecords = [...task.temperatureHumidityRecords, newRecord];
    this.update(taskId, { temperatureHumidityRecords: updatedRecords });
    return newRecord;
  },

  deleteTemperatureHumidityRecord(taskId: string, recordId: string): boolean {
    const task = this.getById(taskId);
    if (!task) return false;

    const filtered = task.temperatureHumidityRecords.filter((r) => r.id !== recordId);
    if (filtered.length === task.temperatureHumidityRecords.length) return false;

    this.update(taskId, { temperatureHumidityRecords: filtered });
    return true;
  },

  getLatestTemperatureHumidity(taskId: string): TemperatureHumidityRecord | undefined {
    const task = this.getById(taskId);
    if (!task || task.temperatureHumidityRecords.length === 0) return undefined;

    const sorted = [...task.temperatureHumidityRecords].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    return sorted[0];
  },

  getTemperatureHumidityStats(taskId: string): {
    maxTemp: number | undefined;
    minTemp: number | undefined;
    maxHumidity: number | undefined;
    minHumidity: number | undefined;
    latest: TemperatureHumidityRecord | undefined;
    count: number;
  } {
    const task = this.getById(taskId);
    if (!task || task.temperatureHumidityRecords.length === 0) {
      return {
        maxTemp: undefined,
        minTemp: undefined,
        maxHumidity: undefined,
        minHumidity: undefined,
        latest: undefined,
        count: 0,
      };
    }

    const records = task.temperatureHumidityRecords;
    const temperatures = records.map((r) => r.temperature);
    const humidities = records.map((r) => r.humidity);

    const latest = [...records].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )[0];

    return {
      maxTemp: Math.max(...temperatures),
      minTemp: Math.min(...temperatures),
      maxHumidity: Math.max(...humidities),
      minHumidity: Math.min(...humidities),
      latest,
      count: records.length,
    };
  },

  DEVIATION_THRESHOLD: 5,

  getAbnormalReasons(pipe: PipeRecord): AbnormalReason[] {
    const reasons: AbnormalReason[] = [];
    if (pipe.centDeviation !== undefined && Math.abs(pipe.centDeviation) > this.DEVIATION_THRESHOLD) {
      reasons.push('deviation');
    }
    if (pipe.reedStatus === '需微调') {
      reasons.push('reed_adjust');
    }
    if (pipe.remarks && (pipe.remarks.includes('复检') || pipe.remarks.includes('标记复检') || pipe.remarks.includes('需复检'))) {
      reasons.push('recheck_mark');
    }
    return reasons;
  },

  isPipeAbnormal(pipe: PipeRecord): boolean {
    return this.getAbnormalReasons(pipe).length > 0;
  },

  getAbnormalPipes(options?: {
    includeReinspected?: boolean;
    venueId?: string;
    stopCategory?: string;
    reason?: AbnormalReason;
  }): AbnormalPipeInfo[] {
    const { includeReinspected = false, venueId, stopCategory, reason } = options || {};
    const tasks = this.getAll();
    const abnormalPipes: AbnormalPipeInfo[] = [];

    for (const task of tasks) {
      if (venueId && task.venueId !== venueId) continue;

      for (const pipe of task.pipeRecords) {
        if (!includeReinspected && pipe.reinspected) continue;

        const reasons = this.getAbnormalReasons(pipe);
        if (reasons.length === 0) continue;
        if (reason && !reasons.includes(reason)) continue;

        abnormalPipes.push({
          taskId: task.id,
          task,
          pipe,
          reasons,
        });
      }
    }

    return abnormalPipes.sort((a, b) => {
      if (a.pipe.reinspected && !b.pipe.reinspected) return 1;
      if (!a.pipe.reinspected && b.pipe.reinspected) return -1;
      return new Date(b.pipe.updatedAt).getTime() - new Date(a.pipe.updatedAt).getTime();
    });
  },

  markAsReinspected(taskId: string, pipeRecordId: string, note?: string): PipeRecord | undefined {
    return this.updatePipeRecord(taskId, pipeRecordId, {
      reinspected: true,
      reinspectedAt: new Date().toISOString(),
      reinspectionNote: note || undefined,
    });
  },

  undoReinspected(taskId: string, pipeRecordId: string): PipeRecord | undefined {
    return this.updatePipeRecord(taskId, pipeRecordId, {
      reinspected: false,
      reinspectedAt: undefined,
      reinspectionNote: undefined,
    });
  },

  getAbnormalPipesStats(): {
    total: number;
    pending: number;
    completed: number;
    byReason: Record<AbnormalReason, number>;
  } {
    const allAbnormal = this.getAbnormalPipes({ includeReinspected: true });
    const pending = allAbnormal.filter((p) => !p.pipe.reinspected);
    const completed = allAbnormal.filter((p) => p.pipe.reinspected);

    const byReason: Record<AbnormalReason, number> = {
      deviation: 0,
      reed_adjust: 0,
      recheck_mark: 0,
    };

    for (const info of pending) {
      for (const reason of info.reasons) {
        byReason[reason]++;
      }
    }

    return {
      total: allAbnormal.length,
      pending: pending.length,
      completed: completed.length,
      byReason,
    };
  },

  updateReportSummary(taskId: string, summary: string): MaintenanceTask | undefined {
    return this.update(taskId, { reportSummary: summary });
  },

  updateMaintenanceNotes(taskId: string, notes: string): MaintenanceTask | undefined {
    return this.update(taskId, { maintenanceNotes: notes });
  },

  getStopStats(taskId: string): {
    totalUniqueStops: number;
    byStop: Array<{ stopId?: string; stopName: string; count: number; abnormalCount: number }>;
  } {
    const task = this.getById(taskId);
    if (!task) {
      return { totalUniqueStops: 0, byStop: [] };
    }

    const stopMap = new Map<string, { stopId?: string; stopName: string; count: number; abnormalCount: number }>();

    for (const pipe of task.pipeRecords) {
      const key = pipe.stopId || '__no_stop__';
      const displayName = pipe.stopName || (pipe.stopId ? `音栓#${pipe.stopId}` : '未指定音栓');

      if (!stopMap.has(key)) {
        stopMap.set(key, {
          stopId: pipe.stopId,
          stopName: displayName,
          count: 0,
          abnormalCount: 0,
        });
      }

      const entry = stopMap.get(key)!;
      entry.count++;
      if (this.isPipeAbnormal(pipe)) {
        entry.abnormalCount++;
      }
    }

    const byStop = Array.from(stopMap.values()).sort((a, b) => b.count - a.count);
    return {
      totalUniqueStops: byStop.filter((s) => s.stopId).length,
      byStop,
    };
  },

  getAbnormalReasonLabel(reason: AbnormalReason): string {
    const labels: Record<AbnormalReason, string> = {
      deviation: '音分偏差超限',
      reed_adjust: '簧片需微调',
      recheck_mark: '标记复检',
    };
    return labels[reason];
  },
};
