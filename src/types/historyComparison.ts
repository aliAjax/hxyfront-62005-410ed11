import type { PipeRecord } from './maintenance';

export type PipeTrendType = 'persistently_high' | 'persistently_low' | 'sudden_exceed' | 'stable' | 'insufficient_data';

export interface PipeHistoryEntry {
  taskId: string;
  maintenanceDate: string;
  venueId: string;
  venueName: string;
  centDeviation?: number;
  temperature?: number;
  humidity?: number;
  reedStatus?: string;
  remarks?: string;
  pipeRecord: PipeRecord;
}

export interface PipeComparisonResult {
  pipeNumber: string;
  stopId?: string;
  stopName?: string;
  history: PipeHistoryEntry[];
  trend: PipeTrendType;
  avgDeviation?: number;
  latestDeviation?: number;
  previousDeviation?: number;
  deviationChange?: number;
  exceedCount: number;
  totalRecords: number;
}

export interface HistoryComparisonFilter {
  venueId?: string;
  stopId?: string;
  pipeNumber?: string;
  trendType?: PipeTrendType;
}

export const PIPE_TREND_LABELS: Record<PipeTrendType, string> = {
  persistently_high: '持续偏高',
  persistently_low: '持续偏低',
  sudden_exceed: '本次突然超限',
  stable: '稳定',
  insufficient_data: '数据不足',
};

export const PIPE_TREND_COLORS: Record<PipeTrendType, string> = {
  persistently_high: '#dc2626',
  persistently_low: '#2563eb',
  sudden_exceed: '#f59e0b',
  stable: '#059669',
  insufficient_data: '#94a3b8',
};

export const PIPE_TREND_BACKGROUNDS: Record<PipeTrendType, string> = {
  persistently_high: '#fef2f2',
  persistently_low: '#eff6ff',
  sudden_exceed: '#fffbeb',
  stable: '#f0fdf4',
  insufficient_data: '#f8fafc',
};
