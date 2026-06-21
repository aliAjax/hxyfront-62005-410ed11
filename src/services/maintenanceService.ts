import type { MaintenanceTask, MaintenanceTaskFormData, PipeRecord, TemperatureHumidityRecord } from '../types/maintenance';
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
};
