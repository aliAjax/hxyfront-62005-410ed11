import { useState, useEffect, useMemo } from 'react';
import { historyComparisonService } from '../services/historyComparisonService';
import { venueService } from '../services/venueService';
import { stopService } from '../services/stopService';
import type {
  PipeComparisonResult,
  PipeTrendType,
  HistoryComparisonFilter,
} from '../types/historyComparison';
import { PIPE_TREND_LABELS, PIPE_TREND_COLORS, PIPE_TREND_BACKGROUNDS } from '../types/historyComparison';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';

interface HistoryComparisonProps {
  onBack: () => void;
  onApplyToReport?: (summary: string) => void;
}

export function HistoryComparison({ onBack, onApplyToReport }: HistoryComparisonProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [pipeNumberSearch, setPipeNumberSearch] = useState<string>('');
  const [selectedTrendType, setSelectedTrendType] = useState<PipeTrendType | ''>('');
  const [expandedPipe, setExpandedPipe] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<PipeComparisonResult[]>([]);

  const venues = useMemo(() => venueService.getVenueNames(), []);
  const stops = useMemo(() => stopService.getAllDisplayLabels(), []);

  const venueStops = useMemo(() => {
    if (!selectedVenueId) return stops;
    return stops;
  }, [selectedVenueId, stops]);

  useEffect(() => {
    if (selectedVenueId) {
      const results = historyComparisonService.getPipeComparisonForVenue(selectedVenueId);
      setAllResults(results);
    } else {
      setAllResults([]);
    }
  }, [selectedVenueId]);

  const filteredResults = useMemo(() => {
    const filter: HistoryComparisonFilter = {};
    if (selectedVenueId) filter.venueId = selectedVenueId;
    if (selectedStopId) filter.stopId = selectedStopId;
    if (pipeNumberSearch.trim()) filter.pipeNumber = pipeNumberSearch.trim();
    if (selectedTrendType) filter.trendType = selectedTrendType;
    return historyComparisonService.filterResults(allResults, filter);
  }, [allResults, selectedVenueId, selectedStopId, pipeNumberSearch, selectedTrendType]);

  const trendStats = useMemo(() => {
    const counts: Record<PipeTrendType, number> = {
      persistently_high: 0,
      persistently_low: 0,
      sudden_exceed: 0,
      stable: 0,
      insufficient_data: 0,
    };
    for (const r of filteredResults) {
      counts[r.trend]++;
    }
    return counts;
  }, [filteredResults]);

  const summary = useMemo(() => {
    if (filteredResults.length === 0) return '';
    return historyComparisonService.getComparisonSummary(filteredResults);
  }, [filteredResults]);

  const handleApplyToReport = () => {
    if (onApplyToReport && summary) {
      onApplyToReport(summary);
    }
  };

  const formatDeviation = (val: number | undefined): string => {
    if (val === undefined) return '--';
    return `${val > 0 ? '+' : ''}${val.toFixed(1)} cent`;
  };

  const getStopColor = (stopId?: string): string => {
    if (!stopId) return '#64748b';
    const stop = stops.find((s) => s.id === stopId);
    return stop ? STOP_CATEGORY_COLORS[stop.category] : '#64748b';
  };

  const getStopCategoryLabel = (stopId?: string): string => {
    if (!stopId) return '';
    const stop = stops.find((s) => s.id === stopId);
    return stop ? STOP_CATEGORY_LABELS[stop.category] : '';
  };

  return (
    <main className="app">
      <section className="hero venue-hero history-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>历史维护对比</p>
        <h1>音管音分偏差变化分析</h1>
        <span>比较同一场馆同一音管在多次维护中的音分偏差变化，识别持续偏高、持续偏低和本次突然超限的音管</span>
      </section>

      <section className="panel history-filter-panel">
        <div className="heading">
          <div>
            <p>筛选条件</p>
            <h2>查询设置</h2>
          </div>
        </div>
        <div className="history-filter-grid">
          <label>
            <span>选择场馆</span>
            <select
              value={selectedVenueId}
              onChange={(e) => {
                setSelectedVenueId(e.target.value);
                setSelectedStopId('');
              }}
            >
              <option value="">-- 请选择场馆 --</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>音栓筛选</span>
            <select
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
            >
              <option value="">全部音栓</option>
              {venueStops.map((s) => (
                <option key={s.id} value={s.id}>
                  [{getStopCategoryLabel(s.id)}] {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>音管编号搜索</span>
            <input
              type="text"
              placeholder="输入音管编号..."
              value={pipeNumberSearch}
              onChange={(e) => setPipeNumberSearch(e.target.value)}
            />
          </label>
          <label>
            <span>趋势类型</span>
            <select
              value={selectedTrendType}
              onChange={(e) => setSelectedTrendType(e.target.value as PipeTrendType | '')}
            >
              <option value="">全部类型</option>
              {Object.entries(PIPE_TREND_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!selectedVenueId ? (
        <section className="panel">
          <div className="empty-state">
            <p>请先选择一个场馆以查看历史维护对比数据</p>
          </div>
        </section>
      ) : (
        <>
          <section className="panel history-stats-panel">
            <div className="heading">
              <div>
                <p>分析概览</p>
                <h2>趋势统计</h2>
                <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
                  共 {filteredResults.length} 支音管有历史记录
                </p>
              </div>
            </div>
            <div className="history-trend-stats-grid">
              {(['persistently_high', 'persistently_low', 'sudden_exceed', 'stable'] as PipeTrendType[]).map(
                (trend) => (
                  <div
                    key={trend}
                    className="trend-stat-card"
                    style={{
                      borderLeftColor: PIPE_TREND_COLORS[trend],
                      background: PIPE_TREND_BACKGROUNDS[trend],
                      cursor: 'pointer',
                    }}
                    onClick={() =>
                      setSelectedTrendType(selectedTrendType === trend ? '' : trend)
                    }
                  >
                    <span className="trend-stat-label">{PIPE_TREND_LABELS[trend]}</span>
                    <span
                      className="trend-stat-value"
                      style={{ color: PIPE_TREND_COLORS[trend] }}
                    >
                      {trendStats[trend]}
                    </span>
                    <span className="trend-stat-unit">支</span>
                  </div>
                )
              )}
            </div>
          </section>

          {summary && (
            <section className="panel history-summary-panel">
              <div className="heading">
                <div>
                  <p>分析结论</p>
                  <h2>对比总结</h2>
                </div>
                {onApplyToReport && (
                  <button
                    className="primary"
                    onClick={handleApplyToReport}
                    style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                  >
                    📋 带入维护报告
                  </button>
                )}
              </div>
              <div className="history-summary-content">
                {summary.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>
          )}

          <section className="panel history-results-panel">
            <div className="heading">
              <div>
                <p>详细对比</p>
                <h2>音管历史记录</h2>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div className="empty-state">
                <p>没有匹配的音管历史记录</p>
              </div>
            ) : (
              <div className="history-results-list">
                {filteredResults.map((result) => (
                  <div
                    key={result.pipeNumber}
                    className={`history-pipe-card ${expandedPipe === result.pipeNumber ? 'expanded' : ''}`}
                    style={{ borderLeftColor: PIPE_TREND_COLORS[result.trend] }}
                  >
                    <div
                      className="history-pipe-header"
                      onClick={() =>
                        setExpandedPipe(
                          expandedPipe === result.pipeNumber ? null : result.pipeNumber
                        )
                      }
                    >
                      <div className="history-pipe-info">
                        <span className="history-pipe-number">{result.pipeNumber}</span>
                        {result.stopName && (
                          <span
                            className="stop-category"
                            style={{
                              background: `color-mix(in srgb, ${getStopColor(result.stopId)} 15%, #ffffff)`,
                              color: getStopColor(result.stopId),
                            }}
                          >
                            {getStopCategoryLabel(result.stopId)} · {result.stopName}
                          </span>
                        )}
                        <span
                          className="trend-badge"
                          style={{
                            background: PIPE_TREND_BACKGROUNDS[result.trend],
                            color: PIPE_TREND_COLORS[result.trend],
                          }}
                        >
                          {PIPE_TREND_LABELS[result.trend]}
                        </span>
                      </div>
                      <div className="history-pipe-deviations">
                        <div className="deviation-item">
                          <span className="deviation-label">平均</span>
                          <span className="deviation-value">{formatDeviation(result.avgDeviation)}</span>
                        </div>
                        <div className="deviation-item">
                          <span className="deviation-label">本次</span>
                          <span
                            className="deviation-value"
                            style={{
                              color:
                                result.latestDeviation !== undefined &&
                                Math.abs(result.latestDeviation) > 5
                                  ? '#dc2626'
                                  : undefined,
                              fontWeight:
                                result.latestDeviation !== undefined &&
                                Math.abs(result.latestDeviation) > 5
                                  ? 600
                                  : undefined,
                            }}
                          >
                            {formatDeviation(result.latestDeviation)}
                          </span>
                        </div>
                        {result.deviationChange !== undefined && (
                          <div className="deviation-item">
                            <span className="deviation-label">变化</span>
                            <span
                              className="deviation-value"
                              style={{
                                color:
                                  Math.abs(result.deviationChange) > 5
                                    ? '#f59e0b'
                                    : '#059669',
                              }}
                            >
                              {result.deviationChange > 0 ? '+' : ''}
                              {result.deviationChange.toFixed(1)} cent
                            </span>
                          </div>
                        )}
                        <div className="deviation-item">
                          <span className="deviation-label">超限</span>
                          <span className="deviation-value">
                            {result.exceedCount}/{result.totalRecords} 次
                          </span>
                        </div>
                      </div>
                      <span className="history-expand-icon">
                        {expandedPipe === result.pipeNumber ? '▲' : '▼'}
                      </span>
                    </div>

                    {expandedPipe === result.pipeNumber && (
                      <div className="history-pipe-detail">
                        <div className="history-timeline">
                          <div className="history-timeline-header">
                            <h4>维护历史时间线</h4>
                            <span className="history-count">
                              共 {result.history.length} 次记录
                            </span>
                          </div>
                          <div className="history-timeline-chart">
                            {result.history.map((entry, idx) => {
                              const maxAbs = Math.max(
                                ...result.history
                                  .map((h) => Math.abs(h.centDeviation || 0))
                                  .filter(Boolean),
                                10
                              );
                              const deviation = entry.centDeviation || 0;
                              const barWidth =
                                maxAbs > 0
                                  ? Math.min((Math.abs(deviation) / maxAbs) * 100, 100)
                                  : 0;
                              const isExceed = Math.abs(deviation) > 5;

                              return (
                                <div key={idx} className="history-timeline-row">
                                  <span className="timeline-date">
                                    {entry.maintenanceDate}
                                  </span>
                                  <div className="timeline-bar-container">
                                    <div className="timeline-bar-zero" />
                                    <div
                                      className={`timeline-bar ${deviation >= 0 ? 'positive' : 'negative'} ${isExceed ? 'exceed' : ''}`}
                                      style={{
                                        width: `${barWidth}%`,
                                        [deviation >= 0 ? 'marginLeft' : 'marginRight']: '50%',
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`timeline-value ${isExceed ? 'exceed' : ''}`}
                                  >
                                    {formatDeviation(entry.centDeviation)}
                                  </span>
                                  {entry.temperature !== undefined && (
                                    <span className="timeline-env">
                                      {entry.temperature}°C / {entry.humidity}%
                                    </span>
                                  )}
                                  {entry.remarks && (
                                    <span className="timeline-remark">
                                      {entry.remarks}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
