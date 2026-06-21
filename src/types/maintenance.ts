export interface TemperatureHumidityRecord {
  id: string;
  temperature: number;
  humidity: number;
  recordedAt: string;
  note?: string;
}

export interface PipeRecord {
  id: string;
  pipeNumber: string;
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
  createdAt: string;
  updatedAt: string;
}

export type AbnormalReason = 'deviation' | 'reed_adjust' | 'recheck_mark';

export interface AbnormalPipeInfo {
  taskId: string;
  task: MaintenanceTask;
  pipe: PipeRecord;
  reasons: AbnormalReason[];
}

export interface MaintenanceTask {
  id: string;
  venueId: string;
  venueName: string;
  maintenanceDate: string;
  participants: string;
  pipeNumbers: string[];
  pipeRecords: PipeRecord[];
  temperatureHumidityRecords: TemperatureHumidityRecord[];
  reportSummary?: string;
  maintenanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTaskFormData {
  venueId: string;
  maintenanceDate: string;
  participants: string;
  pipeNumbers: string[];
}

export const DEFAULT_MAINTENANCE_FORM_DATA: MaintenanceTaskFormData = {
  venueId: '',
  maintenanceDate: new Date().toISOString().split('T')[0],
  participants: '',
  pipeNumbers: [],
};
