import { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { stopService } from '../../services/stopService';
import type { Stop, StopCategory } from '../../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../../types/stops';
import type { WorkflowPipeData } from '../../types/workflow';

interface AbnormalPipeInfo {
  pipeNumber: string;
  data: WorkflowPipeData;
  reasons: ('deviation' | 'reed_adjust' | 'recheck_mark')[];
}

const REASON_LABELS: Record<'deviation' | 'reed_adjust' | 'recheck_mark', string> = {
  deviation: '偏差超限',
  reed_adjust: '簧片需微调',
  recheck_mark: '备注含复检标记',
};

const REASON_COLORS: Record<'deviation' | 'reed_adjust' | 'recheck_mark', string> = {
  deviation: '#dc2626',
  reed_adjust: '#f59e0b',
  recheck_mark: '#8b5cf6',
};

export function WorkflowReinspectionStep() {
  const { state, nextStep, prevStep, updatePipeData } = useWorkflow();
  const [stops] = useState<Stop[]>(() => stopService.getAll());
  const [filterCategory, setFilterCategory] = useState<StopCategory | 'all'>('all');
  const [filterReason, setFilterReason] = useState<'all' | 'deviation' | 'reed_adjust' | 'recheck_mark'>('all');
  const [showReinspected, setShowReinspected] = useState(true);
  const [reinspectingPipe, setReinspectingPipe] = useState<string | null>(null);
  const [reinspectionNote, setReinspectionNote] = useState('');

  const getAbnormalReasons = (data: WorkflowPipeData): ('deviation' | 'reed_adjust' | 'recheck_mark')[] => {
    const reasons: ('deviation' | 'reed_adjust' | 'recheck_mark')[] = [];
    if (data.centDeviation !== undefined && Math.abs(data.centDeviation) > 5) {
      reasons.push('deviation');
    }
    if (data.reedStatus === '需微调') {
      reasons.push('reed_adjust');
    }
    if (data.remarks && (data.remarks.includes('复检') || data.remarks.includes('标记复检'))) {
      reasons.push('recheck_mark');
    }
    return reasons;
  };

  const abnormalPipes = useMemo<AbnormalPipeInfo[]>(() => {
    const result: AbnormalPipeInfo[] = [];
    for (const pipeNumber of state.pipeNumbers) {
      const data = state.pipeData[pipeNumber] || {};
      const reasons = getAbnormalReasons(data);
      if (reasons.length > 0) {
        result.push({ pipeNumber, data, reasons });
      }
    }
    return result;
  }, [state.pipeNumbers, state.pipeData]);

  const filteredPipes = useMemo(() => {
    return abnormalPipes.filter((info) => {
      if (!showReinspected && info.data.reinspected) return false;
      if (filterReason !== 'all' && !info.reasons.includes(filterReason)) return false;
      if (filterCategory !== 'all') {
        const stop = info.data.stopId ? stops.find((s) => s.id === info.data.stopId) : null;
        if (!stop || stop.category !== filterCategory) return false;
      }
      return true;
    });
  }, [abnormalPipes, filterCategory, filterReason, showReinspected, stops]);

  const pendingCount = abnormalPipes.filter((p) => !p.data.reinspected).length;
  const completedCount = abnormalPipes.filter((p) => p.data.reinspected).length;

  const byReasonStats = useMemo(() => {
    const stats = { deviation: 0, reed_adjust: 0, recheck_mark: 0 };
    for (const info of abnormalPipes) {
      if (info.data.reinspected) continue;
      for (const reason of info.reasons) {
        stats[reason]++;
      }
    }
    return stats;
  }, [abnormalPipes]);

  const handleMarkReinspected = (pipeNumber: string) => {
    setReinspectingPipe(pipeNumber);
    const existing = state.pipeData[pipeNumber]?.reinspectionNote || '';
    setReinspectionNote(existing);
  };

  const handleConfirmReinspection = () => {
    if (!reinspectingPipe) return;
    updatePipeData(reinspectingPipe, {
      reinspected: true,
      reinspectedAt: new Date().toISOString(),
      reinspectionNote: reinspectionNote || undefined,
    });
    setReinspectingPipe(null);
    setReinspectionNote('');
  };

  const handleUndoReinspection = (pipeNumber: string) => {
    if (!confirm('确定要取消该音管的复检标记吗？')) return;
    updatePipeData(pipeNumber, {
      reinspected: false,
      reinspectedAt: undefined,
      reinspectionNote: undefined,
    });
  };

  const getStopDisplay = (data: WorkflowPipeData): { stop?: Stop; label: string } => {
    if (!data.stopId) return { label: data.stopName || '未分配音栓' };
    const stop = stops.find((s) => s.id === data.stopId);
    if (!stop) return { label: data.stopName || '未分配音栓' };
    return { stop, label: stopService.getDisplayLabel(stop) };
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterReason('all');
    setShowReinspected(true);
  };

  const hasActiveFilters =
    filterCategory !== 'all' || filterReason !== 'all' || !showReinspected;

  return (
    <div className="workflow-step-content">
      <div className="metrics">
        <article style={{ borderTopColor: '#dc2626' }}>
          <small>异常总数</small>
          <strong style={{ color: '#dc2626' }}>{abnormalPipes.length}</strong>
        </article>
        <article style={{ borderTopColor: '#f59e0b' }}>
          <small>待复检</small>
          <strong style={{ color: '#f59e0b' }}>{pendingCount}</strong>
        </article>
        <article style={{ borderTopColor: '#059669' }}>
          <small>已复检</small>
          <strong style={{ color: '#059669' }}>{completedCount}</strong>
        </article>
        <article style={{ borderTopColor: 'var(--accent)' }}>
          <small>筛选结果</small>
          <strong style={{ color: 'var(--accent)' }}>{filteredPipes.length}</strong>
        </article>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>异常原因统计</p>
            <h2>按原因分类（待复检）</h2>
          </div>
        </div>
        <div className="reason-stats-grid">
          {(['deviation', 'reed_adjust', 'recheck_mark'] as const).map((reason) => (
            <div
              key={reason}
              className="reason-stat-card"
              style={{ borderLeftColor: REASON_COLORS[reason] }}
            >
              <span className="reason-stat-label">{REASON_LABELS[reason]}</span>
              <span
                className="reason-stat-value"
                style={{ color: REASON_COLORS[reason] }}
              >
                {byReasonStats[reason]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
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
            <span>音栓类型</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as StopCategory | 'all')}
            >
              <option value="all">全部类型</option>
              {(['principal', 'reed', 'mixture', 'bourdon'] as StopCategory[]).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {STOP_CATEGORY_LABELS[cat]}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="filter-item">
            <span>异常原因</span>
            <select
              value={filterReason}
              onChange={(e) =>
                setFilterReason(e.target.value as 'all' | 'deviation' | 'reed_adjust' | 'recheck_mark')
              }
            >
              <option value="all">全部原因</option>
              {(['deviation', 'reed_adjust', 'recheck_mark'] as const).map((reason) => (
                <option key={reason} value={reason}>
                  {REASON_LABELS[reason]}
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
      </div>

      <div className="panel">
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
            <p>
              {hasActiveFilters
                ? '当前筛选条件下暂无异常音管'
                : abnormalPipes.length === 0
                  ? '🎉 太棒了！没有异常音管需要处理'
                  : '当前已隐藏已复检音管，暂无待处理项'}
            </p>
          </div>
        ) : (
          <div className="reinspection-list">
            {filteredPipes.map((info) => {
              const { stop, label } = getStopDisplay(info.data);
              const isReinspected = info.data.reinspected;
              return (
                <div
                  key={info.pipeNumber}
                  className={`reinspection-card ${
                    isReinspected ? 'reinspected' : 'pending'
                  }`}
                  style={
                    stop
                      ? { borderLeftColor: STOP_CATEGORY_COLORS[stop.category] }
                      : undefined
                  }
                >
                  <div className="reinspection-card-header">
                    <div className="reinspection-pipe-info">
                      <span className="pipe-number-text">{info.pipeNumber}</span>
                      {stop && (
                        <span
                          className="stop-category"
                          style={{
                            background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[stop.category]} 15%, #ffffff)`,
                            color: STOP_CATEGORY_COLORS[stop.category],
                          }}
                        >
                          {STOP_CATEGORY_LABELS[stop.category]}
                        </span>
                      )}
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
                      <p>
                        <strong>音栓：</strong>
                        {label}
                      </p>
                      {info.data.pitch && (
                        <p>
                          <strong>音高：</strong>
                          {info.data.pitch}
                        </p>
                      )}
                      {info.data.centDeviation !== undefined && (
                        <p>
                          <strong>音分偏差：</strong>
                          <span
                            style={{
                              color: Math.abs(info.data.centDeviation) > 5 ? '#dc2626' : '#059669',
                              fontWeight: 600,
                            }}
                          >
                            {info.data.centDeviation > 0 ? '+' : ''}
                            {info.data.centDeviation} cent
                          </span>
                        </p>
                      )}
                      {info.data.reedStatus && (
                        <p>
                          <strong>簧片状态：</strong>
                          {info.data.reedStatus}
                        </p>
                      )}
                      {info.data.remarks && (
                        <p>
                          <strong>备注：</strong>
                          {info.data.remarks}
                        </p>
                      )}
                    </div>
                    <div className="reinspection-reasons">
                      {info.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="reason-tag"
                          style={{
                            background: `color-mix(in srgb, ${REASON_COLORS[reason]} 12%, #ffffff)`,
                            color: REASON_COLORS[reason],
                            borderColor: REASON_COLORS[reason],
                          }}
                        >
                          {REASON_LABELS[reason]}
                        </span>
                      ))}
                    </div>
                    {isReinspected && info.data.reinspectedAt && (
                      <div className="reinspection-info">
                        <p>
                          <strong>复检时间：</strong>
                          {new Date(info.data.reinspectedAt).toLocaleString('zh-CN')}
                        </p>
                        {info.data.reinspectionNote && (
                          <p>
                            <strong>复检说明：</strong>
                            {info.data.reinspectionNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="reinspection-card-footer">
                    <span className="reinspection-date">
                      {info.data.centDeviation !== undefined || info.data.reedStatus
                        ? '存在异常需关注'
                        : '备注含复检标记'}
                    </span>
                    <div className="reinspection-actions">
                      {isReinspected ? (
                        <button
                          className="secondary-btn"
                          onClick={() => handleUndoReinspection(info.pipeNumber)}
                        >
                          取消复检
                        </button>
                      ) : (
                        <button
                          className="primary"
                          style={{ background: '#059669', borderColor: '#059669' }}
                          onClick={() => handleMarkReinspected(info.pipeNumber)}
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
      </div>

      <div className="workflow-nav-footer">
        <button onClick={prevStep}>← 上一步：温湿度采集</button>
        <button
          className="primary"
          onClick={nextStep}
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          下一步：报告生成 →
        </button>
      </div>

      {reinspectingPipe && (
        <div className="modal-overlay" onClick={() => setReinspectingPipe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>标记为已复检</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                  音管编号：
                  <strong style={{ color: 'var(--primary)' }}>{reinspectingPipe}</strong>
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setReinspectingPipe(null)}
              >
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
              <button
                className="primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={handleConfirmReinspection}
              >
                确认复检
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
