export type DraftType = 'venue' | 'maintenance_task' | 'tuning_record' | 'maintenance_report';

export interface DraftBase {
  id: string;
  type: DraftType;
  title: string;
  subtitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueDraft extends DraftBase {
  type: 'venue';
  data: {
    name: string;
    type: 'church' | 'concert_hall' | 'other';
    address: string;
    organLocation: string;
    lastMaintenanceDate: string;
    defaultTemperature: number;
    defaultHumidity: number;
    remarks: string;
  };
  editingId?: string;
}

export interface MaintenanceTaskDraft extends DraftBase {
  type: 'maintenance_task';
  data: {
    venueId: string;
    maintenanceDate: string;
    participants: string;
    pipeNumbers: string[];
  };
}

export interface TuningRecordDraft extends DraftBase {
  type: 'tuning_record';
  data: {
    taskId: string;
    venueName: string;
    pipeRecords: Array<{
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
    }>;
    temperatureHumidityRecords: Array<{
      id: string;
      temperature: number;
      humidity: number;
      recordedAt: string;
      note?: string;
    }>;
  };
}

export interface MaintenanceReportDraft extends DraftBase {
  type: 'maintenance_report';
  data: {
    taskId: string;
    venueName: string;
    reportSummary: string;
    maintenanceNotes: string;
  };
}

export type Draft = VenueDraft | MaintenanceTaskDraft | TuningRecordDraft | MaintenanceReportDraft;

export const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  venue: '场馆档案',
  maintenance_task: '维护任务',
  tuning_record: '调音记录',
  maintenance_report: '维护报告',
};

export const DRAFT_TYPE_COLORS: Record<DraftType, string> = {
  venue: '#854d0e',
  maintenance_task: '#0ea5e9',
  tuning_record: '#475569',
  maintenance_report: '#7c3aed',
};
