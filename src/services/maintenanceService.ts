import type { MaintenanceTask, MaintenanceTaskFormData, PipeRecord } from '../types/maintenance';
import { venueService } from './venueService';

const STORAGE_KEY = 'organ_tuning_maintenance_tasks';

export const maintenanceService = {
  getAll(): MaintenanceTask[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
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
};
