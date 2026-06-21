import { useState, useEffect, useMemo } from 'react';
import type { AbnormalPipeInfo, AbnormalReason } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import { stopService } from '../services/stopService';
import { venueService } from '../services/venueService';
import type { Stop, StopCategory } from '../types/stops';
import type { Venue } from '../types/venue';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';

interface ReinspectionDashboardProps {
  onBack: () => void;
}

const ABNORMAL_REASON_LABELS: Record<AbnormalReason, string> = {
  deviation: '偏差超限',
  reed_adjust: '簧片需微调',
  recheck_mark: '备注含复检标记',
};

const ABNORMAL_REASON_COLORS: Record<AbnormalReason, string> = {
  deviation: '#dc2626',
  reed_adjust: '#f59e0b',
  recheck_mark: '#8b5cf6',
};

export function ReinspectionDashboard({ onBack }: ReinspectionDashboardProps) {
  const [abnormalPipes, setAbnormalPipes] = useState<AbnormalPipeInfo[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [filterVenueId, setFilterVenueId] = useState<string>('all');
  const [filterStopCategory, setFilterStopCategory] = useState<StopCategory | 'all'>('all');
  const [filterReason, setFilterReason] = useState<AbnormalReason | 'all'>('all');
  const [showReinspected, setShowReinspected] = useState<boolean>(false);
  const [reinspectingPipe, setReinspectingPipe] = useState<AbnormalPipeInfo | null>(null);
  const [reinspectionNote, setReinspectionNote] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAbnormalPipes(maintenanceService.getAbnormalPipes({ includeReinspected: true }));
    setVenues(venueService.getAll());
    setStops(stopService.getAll());
  };

  const stats = useMemo(() => {
    return maintenanceService.getAbnormalPipesStats();
  }, [abnormalPipes]);

  const filteredPipes = useMemo(() => {
    return abnormalPipes.filter((info) => {
      if (!showReinspected && info.pipe.reinspected) return false;
      if (filterVenueId !== 'all' && info.task.venueId !== filterVenueId) return false;
      if (filterReason !== 'all' && !info.reasons.includes(filterReason)) return false;
      if (filterStopCategory !== 'all') {
        const stop = info.pipe.stopId ? stops.find((s) => s.id === info.pipe.stopId) : null;
        if (!stop || stop.category !== filterStopCategory) return false;
      }
      return true;
    });
  }, [abnormalPipes, filterVenueId, filterStopCategory, filterReason, showReinspected, stops]);

  const pendingCount = filteredPipes.filter((p) => !p.pipe.reinspected).length;
  const completedCount = filteredPipes.filter((p) => p.pipe.reinspected).length;

  const getStop = (stopId?: string): Stop | undefined => {
    if (!stopId) return undefined;
    return stops.find((s) => s.id === stopId);
  };

  const getStopDisplayLabel = (stopId?: string, stopName?: string): string => {
    const stop = getStop(stopId);
    if (stop) return stopService.getDisplayLabel(stop);
    return stopName || '未分配音栓';
  };

  const getStopCategory = (stopId?: string): StopCategory | null => {
    const stop = getStop(stopId);
    return stop?.category || null;
  };

  const handleMarkReinspected = (info: AbnormalPipeInfo) => {
    setReinspectingPipe(info);
    setReinspectionNote('');
  };

  const handleConfirmReinspection = () => {
    if (!reinspectingPipe) return;
    maintenanceService.markAsReinspected(
      reinspectingPipe.taskId,
      reinspectingPipe.pipe.id,
      reinspectionNote
    );
    setReinspectingPipe(null);
    setReinspectionNote('');
    loadData();
  };

  const handleUndoReinspection = (info: AbnormalPipeInfo) => {
    if (confirm('确定要取消该音管的复检标记吗？')) {
      maintenanceService.undoReinspected(info.taskId, info.pipe.id);
      loadData();
    }
  };

  const clearFilters = () => {
    setFilterVenueId('all');
    setFilterStopCategory('all');
    setFilterReason('all');
    setShowReinspected(false);
  };

  const hasActiveFilters = filterVenueId !== 'all' || filterStopCategory !== 'all' || filterReason !== 'all' || showReinspected;

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>异常音管管理</p>
        <h1>异常音管复检看板</h1>
        <span>集中展示所有偏差超限、簧片需微调、备注含复检标记的音管，支持多维度筛选和复检标记。</span>
      </section>

      <section className="metrics">
        <article style={{ borderTopColor: '#dc2626' }}>
          <small>异常总数</small>
          <strong style={{ color: '#dc2626' }}>{stats.total}</strong>
        </article>
        <article style={{ borderTopColor: '#f59e0b' }}>
          <small>待复检</small>
          <strong style={{ color: '#f59e0b' }}>{stats.pending}</strong>
        </article>
        <article style={{ borderTopColor: '#059669' }}>
          <small>已复检</small>
          <strong style={{ color: '#059669' }}>{stats.completed}</strong>
        </article>
        <article style={{ borderTopColor: 'var(--accent)' }}>
          <small>当前筛选结果</small>
          <strong style={{ color: 'var(--accent)' }}>{filteredPipes.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>异常原因统计</p>
            <h2>按原因分类</h2>
          </div>
        </div>
        <div className="reason-stats-grid">
          <div className="reason-stat-card" style={{ borderLeftColor: ABNORMAL_REASON_COLORS.deviation }}>
            <span className="reason-stat-label">{ABNORMAL_REASON_LABELS.deviation}</span>
            <span className="reason-stat-value" style={{ color: ABNORMAL_REASON_COLORS.deviation }}>
              {stats.byReason.deviation}
            </span>
          </div>
          <div className="reason-stat-card" style={{ borderLeftColor: ABNORMAL_REASON_COLORS.reed_adjust }}>
            <span className="reason-stat-label">{ABNORMAL_REASON_LABELS.reed_adjust}</span>
            <span className="reason-stat-value" style={{ color: ABNORMAL_REASON_COLORS.reed_adjust }}>
              {stats.byReason.reed_adjust}
            </span>
          </div>
          <div className="reason-stat-card" style={{ borderLeftColor: ABNORMAL_REASON_COLORS.recheck_mark }}>
            <span className="reason-stat-label">{ABNORMAL_REASON_LABELS.recheck_mark}</span>
            <span className="reason-stat-value" style={{ color: ABNORMAL_REASON_COLORS.recheck_mark }}>
              {stats.byReason.recheck_mark}
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>筛选条件</p>
            <h2>多维筛选</h2>
          </div>
          {hasActiveFilters && (
            <button className="clear-filter-btn" onClick={clearFilters}>
              ✕ 清除全部筛选
            </button>
          )}
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>场馆</span>
            <select value={filterVenueId} onChange={(e) => setFilterVenueId(e.target.value)}>
              <option value="all">全部场馆</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>音栓类型</span>
            <select
              value={filterStopCategory}
              onChange={(e) => setFilterStopCategory(e.target.value as StopCategory | 'all')}
            >
              <option value="all">全部类型</option>
              {(['principal', 'reed', 'mixture', 'bourdon'] as StopCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {STOP_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>异常原因</span>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value as AbnormalReason | 'all')}
            >
              <option value="all">全部原因</option>
              {(['deviation', 'reed_adjust', 'recheck_mark'] as AbnormalReason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {ABNORMAL_REASON_LABELS[reason]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item checkbox-item">
            <input
              type="checkbox"
              checked={showReinspected}
              onChange={(e) => setShowReinspected(e.target.checked)}
            />
            <span>显示已复检</span>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>异常音管列表</p>
            <h2>
              {showReinspected ? '全部异常音管' : '待复检音管'}
              <span className="list-count">
                {pendingCount} 待处理 · {completedCount} 已完成
              </span>
            </h2>
          </div>
        </div>

        {filteredPipes.length === 0 ? (
          <div className="empty-state">
            <p>{hasActiveFilters ? '当前筛选条件下暂无异常音管' : '🎉 太棒了！没有异常音管需要处理'}</p>
          </div>
        ) : (
          <div className="reinspection-list">
            {filteredPipes.map((info) => {
              const stop = getStop(info.pipe.stopId);
              const stopCategory = stop?.category;
              const isReinspected = info.pipe.reinspected;

              return (
                <div
                  key={`${info.taskId}-${info.pipe.id}`}
                  className={`reinspection-card ${isReinspected ? 'reinspected' : 'pending'}`}
                  style={stopCategory ? { borderLeftColor: STOP_CATEGORY_COLORS[stopCategory] } : undefined}
                >
                  <div className="reinspection-card-header">
                    <div className="reinspection-pipe-info">
                      <span className="pipe-number-text">{info.pipe.pipeNumber}</span>
                      {stopCategory && (
                        <span
                          className="stop-category"
                          style={{
                            background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[stopCategory]} 15%, #ffffff)`,
                            color: STOP_CATEGORY_COLORS[stopCategory],
                          }}
                        >
                          {STOP_CATEGORY_LABELS[stopCategory]}
                        </span>
                      )}
                      <span className="reinspection-venue">
                        🏛️ {info.task.venueName}
                      </span>
                    </div>
                    <div className="reinspection-status">
                      {isReinspected ? (
                        <span className="status-badge status-done">✓ 已复检</span>
                      ) : (
                        <span className="status-badge status-pending">待复检</span>
                      )}
                    </div>
                  </div>

                  <div className="reinspection-card-body">
                    <div className="reinspection-details">
                      <p><strong>音栓：</strong>{getStopDisplayLabel(info.pipe.stopId, info.pipe.stopName)}</p>
                      {info.pipe.pitch && <p><strong>音高：</strong>{info.pipe.pitch}</p>}
                      {info.pipe.centDeviation !== undefined && (
                        <p>
                          <strong>音分偏差：</strong>
                          <span
                            style={{
                              color: Math.abs(info.pipe.centDeviation) > 5 ? '#dc2626' : '#059669',
                              fontWeight: 600,
                            }}
                          >
                            {info.pipe.centDeviation > 0 ? '+' : ''}{info.pipe.centDeviation} cent
                          </span>
                        </p>
                      )}
                      {info.pipe.reedStatus && <p><strong>簧片状态：</strong>{info.pipe.reedStatus}</p>}
                      {info.pipe.remarks && <p><strong>备注：</strong>{info.pipe.remarks}</p>}
                    </div>

                    <div className="reinspection-reasons">
                      {info.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="reason-tag"
                          style={{
                            background: `color-mix(in srgb, ${ABNORMAL_REASON_COLORS[reason]} 12%, #ffffff)`,
                            color: ABNORMAL_REASON_COLORS[reason],
                            borderColor: ABNORMAL_REASON_COLORS[reason],
                          }}
                        >
                          {ABNORMAL_REASON_LABELS[reason]}
                        </span>
                      ))}
                    </div>

                    {isReinspected && info.pipe.reinspectedAt && (
                      <div className="reinspection-info">
                        <p>
                          <strong>复检时间：</strong>
                          {new Date(info.pipe.reinspectedAt).toLocaleString('zh-CN')}
                        </p>
                        {info.pipe.reinspectionNote && (
                          <p><strong>复检说明：</strong>{info.pipe.reinspectionNote}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="reinspection-card-footer">
                    <span className="reinspection-date">
                      更新于 {new Date(info.pipe.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                    <div className="reinspection-actions">
                      {isReinspected ? (
                        <button className="secondary-btn" onClick={() => handleUndoReinspection(info)}>
                          取消复检
                        </button>
                      ) : (
                        <button
                          className="primary"
                          style={{ background: '#059669', borderColor: '#059669' }}
                          onClick={() => handleMarkReinspected(info)}
                        >
                          ✓ 标记为已复检
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reinspectingPipe && (
        <div className="modal-overlay" onClick={() => setReinspectingPipe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>标记为已复检</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                  音管编号：<strong style={{ color: 'var(--primary)' }}>{reinspectingPipe.pipe.pipeNumber}</strong>
                  {' · '}{reinspectingPipe.task.venueName}
                </p>
              </div>
              <button className="close-btn" onClick={() => setReinspectingPipe(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="full-width">
                <span>复检说明（可选）</span>
                <textarea
                  value={reinspectionNote}
                  onChange={(e) => setReinspectionNote(e.target.value)}
                  placeholder="记录复检结果、处理措施等..."
                  rows={4}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button onClick={() => setReinspectingPipe(null)}>取消</button>
              <button className="primary" style={{ background: '#059669', borderColor: '#059669' }} onClick={handleConfirmReinspection}>
                确认复检
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
