import type {
  PipeHistoryEntry,
  PipeComparisonResult,
  PipeTrendType,
  HistoryComparisonFilter,
} from '../types/historyComparison';
import { maintenanceService } from './maintenanceService';

const DEVIATION_THRESHOLD = 5;
const PERSISTENT_MIN_OCCURRENCES = 2;
const PERSISTENT_RATIO = 0.7;

export const historyComparisonService = {
  getPipeComparisonForVenue(venueId: string): PipeComparisonResult[] {
    const tasks = maintenanceService
      .getAll()
      .filter((t) => t.venueId === venueId)
      .sort((a, b) => new Date(a.maintenanceDate).getTime() - new Date(b.maintenanceDate).getTime());

    if (tasks.length === 0) return [];

    const pipeMap = new Map<string, PipeHistoryEntry[]>();

    for (const task of tasks) {
      for (const pipe of task.pipeRecords) {
        if (pipe.centDeviation === undefined) continue;

        const key = pipe.pipeNumber;
        if (!pipeMap.has(key)) {
          pipeMap.set(key, []);
        }

        const entry: PipeHistoryEntry = {
          taskId: task.id,
          maintenanceDate: task.maintenanceDate,
          venueId: task.venueId,
          venueName: task.venueName,
          centDeviation: pipe.centDeviation,
          temperature: pipe.temperature,
          humidity: pipe.humidity,
          reedStatus: pipe.reedStatus,
          remarks: pipe.remarks,
          pipeRecord: pipe,
        };
        pipeMap.get(key)!.push(entry);
      }
    }

    const results: PipeComparisonResult[] = [];

    for (const [pipeNumber, history] of pipeMap) {
      const lastEntry = history[history.length - 1];
      const secondLastEntry = history.length >= 2 ? history[history.length - 2] : undefined;

      const deviations = history
        .map((h) => h.centDeviation)
        .filter((d): d is number => d !== undefined);

      const avgDeviation =
        deviations.length > 0
          ? deviations.reduce((s, v) => s + v, 0) / deviations.length
          : undefined;

      const latestDeviation = lastEntry?.centDeviation;
      const previousDeviation = secondLastEntry?.centDeviation;
      const deviationChange =
        latestDeviation !== undefined && previousDeviation !== undefined
          ? latestDeviation - previousDeviation
          : undefined;

      const exceedCount = deviations.filter((d) => Math.abs(d) > DEVIATION_THRESHOLD).length;

      const trend = this.determineTrend(deviations, exceedCount);

      results.push({
        pipeNumber,
        stopId: lastEntry?.pipeRecord.stopId,
        stopName: lastEntry?.pipeRecord.stopName,
        history,
        trend,
        avgDeviation,
        latestDeviation,
        previousDeviation,
        deviationChange,
        exceedCount,
        totalRecords: history.length,
      });
    }

    return results.sort((a, b) => {
      const trendOrder: Record<PipeTrendType, number> = {
        sudden_exceed: 0,
        persistently_high: 1,
        persistently_low: 2,
        stable: 3,
        insufficient_data: 4,
      };
      const ta = trendOrder[a.trend] ?? 99;
      const tb = trendOrder[b.trend] ?? 99;
      if (ta !== tb) return ta - tb;
      return a.pipeNumber.localeCompare(b.pipeNumber, undefined, { numeric: true });
    });
  },

  determineTrend(deviations: number[], exceedCount: number): PipeTrendType {
    if (deviations.length < 1) return 'insufficient_data';

    const latest = deviations[deviations.length - 1];

    if (deviations.length < 2) {
      return Math.abs(latest) > DEVIATION_THRESHOLD ? 'sudden_exceed' : 'insufficient_data';
    }

    const isLatestExceed = Math.abs(latest) > DEVIATION_THRESHOLD;
    const previousDeviations = deviations.slice(0, -1);
    const previousAllWithinLimit = previousDeviations.every(
      (d) => Math.abs(d) <= DEVIATION_THRESHOLD
    );

    if (isLatestExceed && previousAllWithinLimit) {
      return 'sudden_exceed';
    }

    const positiveDeviations = deviations.filter((d) => d > DEVIATION_THRESHOLD);
    const negativeDeviations = deviations.filter((d) => d < -DEVIATION_THRESHOLD);

    if (
      positiveDeviations.length >= PERSISTENT_MIN_OCCURRENCES &&
      positiveDeviations.length / deviations.length >= PERSISTENT_RATIO
    ) {
      return 'persistently_high';
    }

    if (
      negativeDeviations.length >= PERSISTENT_MIN_OCCURRENCES &&
      negativeDeviations.length / deviations.length >= PERSISTENT_RATIO
    ) {
      return 'persistently_low';
    }

    if (exceedCount > 0 && isLatestExceed) {
      if (latest > DEVIATION_THRESHOLD) return 'persistently_high';
      if (latest < -DEVIATION_THRESHOLD) return 'persistently_low';
    }

    if (exceedCount === 0) {
      return 'stable';
    }

    return 'stable';
  },

  filterResults(
    results: PipeComparisonResult[],
    filter: HistoryComparisonFilter
  ): PipeComparisonResult[] {
    return results.filter((r) => {
      if (filter.venueId) {
        const hasVenue = r.history.some((h) => h.venueId === filter.venueId);
        if (!hasVenue) return false;
      }
      if (filter.stopId && r.stopId !== filter.stopId) return false;
      if (filter.pipeNumber) {
        const search = filter.pipeNumber.toLowerCase();
        if (!r.pipeNumber.toLowerCase().includes(search)) return false;
      }
      if (filter.trendType && r.trend !== filter.trendType) return false;
      return true;
    });
  },

  getComparisonSummary(results: PipeComparisonResult[]): string {
    const trendCounts: Record<PipeTrendType, number> = {
      persistently_high: 0,
      persistently_low: 0,
      sudden_exceed: 0,
      stable: 0,
      insufficient_data: 0,
    };

    for (const r of results) {
      trendCounts[r.trend]++;
    }

    const lines: string[] = [];
    lines.push(`历史维护对比分析：共检查 ${results.length} 支音管。`);

    if (trendCounts.persistently_high > 0) {
      const pipes = results
        .filter((r) => r.trend === 'persistently_high')
        .map((r) => `${r.pipeNumber}(${r.latestDeviation !== undefined ? (r.latestDeviation > 0 ? '+' : '') + r.latestDeviation + 'cent' : 'N/A'})`);
      lines.push(
        `持续偏高 ${trendCounts.persistently_high} 支：${pipes.join('、')}，建议重点检查这些音管的物理状态及环境影响因素。`
      );
    }

    if (trendCounts.persistently_low > 0) {
      const pipes = results
        .filter((r) => r.trend === 'persistently_low')
        .map((r) => `${r.pipeNumber}(${r.latestDeviation !== undefined ? (r.latestDeviation > 0 ? '+' : '') + r.latestDeviation + 'cent' : 'N/A'})`);
      lines.push(
        `持续偏低 ${trendCounts.persistently_low} 支：${pipes.join('、')}，需关注音管漏气或簧片老化问题。`
      );
    }

    if (trendCounts.sudden_exceed > 0) {
      const pipes = results
        .filter((r) => r.trend === 'sudden_exceed')
        .map((r) => `${r.pipeNumber}(${r.latestDeviation !== undefined ? (r.latestDeviation > 0 ? '+' : '') + r.latestDeviation + 'cent' : 'N/A'})`);
      lines.push(
        `本次突然超限 ${trendCounts.sudden_exceed} 支：${pipes.join('、')}，需排查本次维护中的突发因素（温湿度变化、搬运损伤等）。`
      );
    }

    if (trendCounts.stable > 0) {
      lines.push(`稳定 ${trendCounts.stable} 支，音分偏差在正常范围内。`);
    }

    return lines.join('\n');
  },

  getComparisonForTask(taskId: string): PipeComparisonResult[] {
    const task = maintenanceService.getById(taskId);
    if (!task) return [];
    return this.getPipeComparisonForVenue(task.venueId);
  },
};
