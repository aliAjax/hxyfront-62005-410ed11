import { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { stopService } from '../../services/stopService';
import type { Stop } from '../../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../../types/stops';
import type { WorkflowPipeData } from '../../types/workflow';

interface PipeFormState {
  pitch: string;
  centDeviation: string;
  temperature: string;
  humidity: string;
  reedStatus: string;
  remarks: string;
}

const DEFAULT_FORM: PipeFormState = {
  pitch: '',
  centDeviation: '',
  temperature: '',
  humidity: '',
  reedStatus: '',
  remarks: '',
};

export function WorkflowDeviationStep() {
  const { state, nextStep, prevStep, updatePipeData } = useWorkflow();
  const [editingPipeNumber, setEditingPipeNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState<PipeFormState>(DEFAULT_FORM);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'abnormal'>('all');
  const [stops] = useState<Stop[]>(() => stopService.getAll());

  const isPipeCompleted = (pipeNumber: string): boolean => {
    const d = state.pipeData[pipeNumber];
    return !!(d?.pitch || d?.centDeviation !== undefined || d?.remarks);
  };

  const isPipeAbnormal = (pipeNumber: string): boolean => {
    const d = state.pipeData[pipeNumber];
    if (!d) return false;
    if (d.centDeviation !== undefined && Math.abs(d.centDeviation) > 5) return true;
    if (d.reedStatus === '需微调') return true;
    if (d.remarks && (d.remarks.includes('复检') || d.remarks.includes('标记复检'))) return true;
    return false;
  };

  const filteredPipes = useMemo(() => {
    switch (filter) {
      case 'pending':
        return state.pipeNumbers.filter((n) => !isPipeCompleted(n));
      case 'completed':
        return state.pipeNumbers.filter((n) => isPipeCompleted(n));
      case 'abnormal':
        return state.pipeNumbers.filter((n) => isPipeAbnormal(n));
      default:
        return state.pipeNumbers;
    }
  }, [state.pipeNumbers, state.pipeData, filter]);

  const stats = useMemo(() => {
    const total = state.pipeNumbers.length;
    const completed = state.pipeNumbers.filter(isPipeCompleted).length;
    const abnormal = state.pipeNumbers.filter(isPipeAbnormal).length;
    return { total, completed, abnormal };
  }, [state.pipeNumbers, state.pipeData]);

  const handleEdit = (pipeNumber: string) => {
    const existing = state.pipeData[pipeNumber] || ({} as WorkflowPipeData);
    setFormData({
      pitch: existing.pitch || '',
      centDeviation: existing.centDeviation?.toString() || '',
      temperature: existing.temperature?.toString() || '',
      humidity: existing.humidity?.toString() || '',
      reedStatus: existing.reedStatus || '',
      remarks: existing.remarks || '',
    });
    setEditingPipeNumber(pipeNumber);
  };

  const handleClose = () => {
    setEditingPipeNumber(null);
    setFormData(DEFAULT_FORM);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipeNumber) return;

    const update: Partial<WorkflowPipeData> = {
      pitch: formData.pitch || undefined,
      centDeviation: formData.centDeviation ? Number(formData.centDeviation) : undefined,
      temperature: formData.temperature ? Number(formData.temperature) : undefined,
      humidity: formData.humidity ? Number(formData.humidity) : undefined,
      reedStatus: formData.reedStatus || undefined,
      remarks: formData.remarks || undefined,
    };

    updatePipeData(editingPipeNumber, update);
    handleClose();
  };

  const getStopDisplay = (pipeNumber: string): { stop?: Stop; label: string } => {
    const d = state.pipeData[pipeNumber];
    if (!d?.stopId) return { label: '未分配音栓' };
    const stop = stops.find((s) => s.id === d.stopId);
    if (!stop) return { label: d.stopName || '未分配音栓' };
    return { stop, label: stopService.getDisplayLabel(stop) };
  };

  return (
    <div className="workflow-step-content">
      <div className="metrics">
        <article>
          <small>音管总数</small>
          <strong>{stats.total}</strong>
        </article>
        <article style={{ borderTopColor: '#059669' }}>
          <small>已完成</small>
          <strong style={{ color: '#059669' }}>
            {stats.completed}/{stats.total}
          </strong>
        </article>
        <article style={{ borderTopColor: '#dc2626' }}>
          <small>偏差异常</small>
          <strong style={{ color: '#dc2626' }}>{stats.abnormal}</strong>
        </article>
        <article style={{ borderTopColor: 'var(--primary)' }}>
          <small>完成率</small>
          <strong style={{ color: 'var(--primary)' }}>
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </strong>
        </article>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>调音偏差录入</p>
            <h2>逐支录入调音数据</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              点击任意音管卡片开始录入音高、音分偏差、温湿度、簧片状态和备注
            </p>
          </div>
          <div className="category-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
            {(['all', 'pending', 'completed', 'abnormal'] as const).map((f) => (
              <button
                key={f}
                className={`category-tab ${filter === f ? 'active' : ''}`}
                style={
                  filter === f
                    ? {
                        background: 'var(--primary)',
                        color: '#fff',
                        borderColor: 'var(--primary)',
                      }
                    : undefined
                }
                onClick={() => setFilter(f)}
              >
                {f === 'all'
                  ? '全部'
                  : f === 'pending'
                    ? '待录入'
                    : f === 'completed'
                      ? '已完成'
                      : '异常'}
              </button>
            ))}
          </div>
        </div>

        {filteredPipes.length === 0 ? (
          <div className="empty-state">
            <p>
              {filter === 'pending'
                ? '所有音管数据已录入完成'
                : filter === 'completed'
                  ? '暂无已完成录入的音管'
                  : filter === 'abnormal'
                    ? '暂无异常音管'
                    : '暂无音管'}
            </p>
          </div>
        ) : (
          <div className="pipe-record-list">
            {filteredPipes.map((pipeNumber) => {
              const data = state.pipeData[pipeNumber] || {};
              const completed = isPipeCompleted(pipeNumber);
              const abnormal = isPipeAbnormal(pipeNumber);
              const { stop, label } = getStopDisplay(pipeNumber);

              return (
                <div
                  key={pipeNumber}
                  className={`pipe-record-card ${completed ? 'completed' : 'pending'} ${
                    abnormal ? 'abnormal' : ''
                  } ${editingPipeNumber === pipeNumber ? 'editing' : ''}`}
                  onClick={() => !editingPipeNumber && handleEdit(pipeNumber)}
                >
                  <div className="pipe-record-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className={`pipe-status-indicator ${completed ? 'done' : 'todo'}`}
                      >
                        {completed ? '✓' : ''}
                      </div>
                      <div>
                        <h3 className="pipe-number-large">{pipeNumber}</h3>
                        {stop && (
                          <span
                            className="stop-category"
                            style={{
                              background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[stop.category]} 15%, #ffffff)`,
                              color: STOP_CATEGORY_COLORS[stop.category],
                              margin: 0,
                            }}
                          >
                            {STOP_CATEGORY_LABELS[stop.category]} · {label}
                          </span>
                        )}
                        {!stop && data.stopName && (
                          <span
                            className="stop-category"
                            style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              margin: 0,
                            }}
                          >
                            {data.stopName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`pipe-record-status ${abnormal ? 'abnormal' : ''}`}
                      style={abnormal ? { color: '#dc2626' } : undefined}
                    >
                      {abnormal ? '⚠️ 异常' : completed ? '已完成' : '待录入'}
                    </span>
                  </div>

                  {completed ? (
                    <div className="pipe-record-details">
                      {data.pitch && (
                        <div className="detail-item">
                          <span className="detail-label">音高</span>
                          <span className="detail-value">{data.pitch}</span>
                        </div>
                      )}
                      {data.centDeviation !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">音分偏差</span>
                          <span
                            className="detail-value"
                            style={{
                              color: Math.abs(data.centDeviation) > 5 ? '#dc2626' : '#059669',
                              fontWeight: 600,
                            }}
                          >
                            {data.centDeviation > 0 ? '+' : ''}
                            {data.centDeviation} cent
                          </span>
                        </div>
                      )}
                      {data.temperature !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">温度</span>
                          <span className="detail-value">{data.temperature}°C</span>
                        </div>
                      )}
                      {data.humidity !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">湿度</span>
                          <span className="detail-value">{data.humidity}%</span>
                        </div>
                      )}
                      {data.reedStatus && (
                        <div className="detail-item">
                          <span className="detail-label">簧片状态</span>
                          <span
                            className="detail-value"
                            style={{
                              color: data.reedStatus !== '正常' ? '#dc2626' : undefined,
                            }}
                          >
                            {data.reedStatus}
                          </span>
                        </div>
                      )}
                      {data.remarks && (
                        <div className="detail-item full-width">
                          <span className="detail-label">备注</span>
                          <span className="detail-value">{data.remarks}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pipe-record-empty">
                      <p>📝 点击开始录入调音数据</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="workflow-nav-footer">
        <button onClick={prevStep}>← 上一步：音栓资料</button>
        <button
          className="primary"
          onClick={nextStep}
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          下一步：温湿度采集 →
        </button>
      </div>

      {editingPipeNumber && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal tuning-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="modal-body">
              <div className="modal-header">
                <div>
                  <h2>录入调音数据</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                    音管编号：
                    <strong style={{ color: 'var(--primary)' }}>{editingPipeNumber}</strong>
                  </p>
                </div>
                <button type="button" className="close-btn" onClick={handleClose}>
                  ×
                </button>
              </div>
              <div className="field-grid" style={{ marginTop: '20px' }}>
                <label>
                  <span>音高</span>
                  <input
                    type="text"
                    name="pitch"
                    placeholder="如：C4 / A4"
                    value={formData.pitch}
                    onChange={handleFormChange}
                  />
                </label>
                <label>
                  <span>音分偏差</span>
                  <input
                    type="number"
                    name="centDeviation"
                    placeholder="-10 ~ +10"
                    value={formData.centDeviation}
                    onChange={handleFormChange}
                    step="0.1"
                  />
                </label>
                <label>
                  <span>温度 (°C)</span>
                  <input
                    type="number"
                    name="temperature"
                    placeholder="如：22"
                    value={formData.temperature}
                    onChange={handleFormChange}
                    min="0"
                    max="50"
                    step="0.5"
                  />
                </label>
                <label>
                  <span>湿度 (%)</span>
                  <input
                    type="number"
                    name="humidity"
                    placeholder="如：45"
                    value={formData.humidity}
                    onChange={handleFormChange}
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>
                <label className="full-width">
                  <span>簧片状态</span>
                  <select
                    name="reedStatus"
                    value={formData.reedStatus}
                    onChange={handleFormChange}
                  >
                    <option value="">-- 请选择（簧片音栓必填）--</option>
                    <option value="正常">正常</option>
                    <option value="需微调">需微调</option>
                    <option value="需更换">需更换</option>
                    <option value="已调整">已调整</option>
                  </select>
                </label>
                <label className="full-width">
                  <span>维修备注</span>
                  <textarea
                    name="remarks"
                    placeholder="记录调音过程中的发现和处理措施"
                    value={formData.remarks}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </label>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" onClick={handleClose}>
                  取消
                </button>
                <button type="submit" className="primary">
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
