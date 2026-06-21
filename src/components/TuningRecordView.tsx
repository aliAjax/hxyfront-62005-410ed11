import { useState, useEffect, useMemo, useRef } from 'react';
import type { MaintenanceTask, PipeRecord, TemperatureHumidityRecord } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import { stopService } from '../services/stopService';
import { draftService } from '../services/draftService';
import type { Stop } from '../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';
import { TemperatureHumidityRecorder } from './TemperatureHumidityRecorder';

interface TuningRecordViewProps {
  taskId: string;
  onBack: () => void;
  onViewReport?: () => void;
  restoreFromDraft?: boolean;
}

interface PipeFormData {
  stopId: string;
  pitch: string;
  centDeviation: string;
  temperature: string;
  humidity: string;
  reedStatus: string;
  remarks: string;
}

const DEFAULT_PIPE_FORM_DATA: PipeFormData = {
  stopId: '',
  pitch: '',
  centDeviation: '',
  temperature: '',
  humidity: '',
  reedStatus: '',
  remarks: '',
};

export function TuningRecordView({ taskId, onBack, onViewReport, restoreFromDraft }: TuningRecordViewProps) {
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [editingPipe, setEditingPipe] = useState<PipeRecord | null>(null);
  const [formData, setFormData] = useState<PipeFormData>(DEFAULT_PIPE_FORM_DATA);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadTask();
    setStops(stopService.getAll());
  }, [taskId]);

  const loadTask = () => {
    const loadedTask = maintenanceService.getById(taskId);
    if (loadedTask) {
      setTask(loadedTask);
    }
  };

  useEffect(() => {
    if (restoreFromDraft) {
      restoreDraft();
    } else if (task) {
      const draft = draftService.getTuningRecordDraft(taskId);
      if (draft) {
        setShowDraftRestore(true);
      }
    }
  }, [taskId, task, restoreFromDraft]);

  useEffect(() => {
    if (!task) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveDraft();
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [task?.pipeRecords, task?.temperatureHumidityRecords]);

  const saveDraft = () => {
    if (!task) return;
    draftService.saveTuningRecordDraft({
      taskId: task.id,
      venueName: task.venueName,
      pipeRecords: task.pipeRecords.map((p) => ({
        id: p.id,
        pipeNumber: p.pipeNumber,
        stopId: p.stopId,
        stopName: p.stopName,
        pitch: p.pitch,
        centDeviation: p.centDeviation,
        temperature: p.temperature,
        humidity: p.humidity,
        reedStatus: p.reedStatus,
        remarks: p.remarks,
      })),
      temperatureHumidityRecords: task.temperatureHumidityRecords,
    });
    setLastSaved(new Date().toLocaleTimeString('zh-CN'));
  };

  const restoreDraft = () => {
    const draft = draftService.getTuningRecordDraft(taskId);
    if (draft && task) {
      const updatedTask = {
        ...task,
        pipeRecords: task.pipeRecords.map((p) => {
          const draftPipe = draft.data.pipeRecords.find((dp) => dp.id === p.id);
          if (draftPipe) {
            return {
              ...p,
              stopId: draftPipe.stopId,
              stopName: draftPipe.stopName,
              pitch: draftPipe.pitch,
              centDeviation: draftPipe.centDeviation,
              temperature: draftPipe.temperature,
              humidity: draftPipe.humidity,
              reedStatus: draftPipe.reedStatus,
              remarks: draftPipe.remarks,
            };
          }
          return p;
        }),
        temperatureHumidityRecords: draft.data.temperatureHumidityRecords,
      };
      maintenanceService.update(taskId, {
        pipeRecords: updatedTask.pipeRecords,
        temperatureHumidityRecords: updatedTask.temperatureHumidityRecords,
      });
      setTask(updatedTask);
      setLastSaved(new Date(draft.updatedAt).toLocaleTimeString('zh-CN'));
    }
    setShowDraftRestore(false);
  };

  const clearDraft = () => {
    draftService.deleteTuningRecordDraft(taskId);
    setLastSaved('');
  };

  const handleEditPipe = (pipe: PipeRecord) => {
    setEditingPipe(pipe);
    setFormData({
      stopId: pipe.stopId || '',
      pitch: pipe.pitch || '',
      centDeviation: pipe.centDeviation?.toString() || '',
      temperature: pipe.temperature?.toString() || '',
      humidity: pipe.humidity?.toString() || '',
      reedStatus: pipe.reedStatus || '',
      remarks: pipe.remarks || '',
    });
  };

  const handleCloseForm = () => {
    setEditingPipe(null);
    setFormData(DEFAULT_PIPE_FORM_DATA);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSavePipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipe) return;

    const selectedStop = stops.find((s) => s.id === formData.stopId);

    maintenanceService.updatePipeRecord(taskId, editingPipe.id, {
      stopId: formData.stopId || undefined,
      stopName: selectedStop ? stopService.getDisplayLabel(selectedStop) : undefined,
      pitch: formData.pitch || undefined,
      centDeviation: formData.centDeviation ? Number(formData.centDeviation) : undefined,
      temperature: formData.temperature ? Number(formData.temperature) : undefined,
      humidity: formData.humidity ? Number(formData.humidity) : undefined,
      reedStatus: formData.reedStatus || undefined,
      remarks: formData.remarks || undefined,
    });

    loadTask();
    handleCloseForm();
  };

  const isPipeCompleted = (pipe: PipeRecord): boolean => {
    return !!(pipe.pitch || pipe.centDeviation !== undefined || pipe.remarks);
  };

  const getFilteredPipes = () => {
    if (!task) return [];
    switch (filter) {
      case 'pending':
        return task.pipeRecords.filter((p) => !isPipeCompleted(p));
      case 'completed':
        return task.pipeRecords.filter((p) => isPipeCompleted(p));
      default:
        return task.pipeRecords;
    }
  };

  const getCompletedCount = () => {
    if (!task) return 0;
    return task.pipeRecords.filter((p) => isPipeCompleted(p)).length;
  };

  const getDeviationCount = () => {
    if (!task) return 0;
    return task.pipeRecords.filter((p) => p.centDeviation !== undefined && Math.abs(p.centDeviation) > 5).length;
  };

  const latestTH = useMemo<TemperatureHumidityRecord | undefined>(() => {
    if (!task || !task.temperatureHumidityRecords || task.temperatureHumidityRecords.length === 0) {
      return undefined;
    }
    const sorted = [...task.temperatureHumidityRecords].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    return sorted[0];
  }, [task]);

  const handleTHRecordAdded = () => {
    loadTask();
  };

  if (!task) {
    return (
      <main className="app">
        <div className="empty-state">
          <p>任务不存在</p>
          <button className="primary" onClick={onBack}>返回</button>
        </div>
      </main>
    );
  }

  const filteredPipes = getFilteredPipes();
  const completedCount = getCompletedCount();
  const totalCount = task.pipeRecords.length;
  const deviationCount = getDeviationCount();

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>调音记录 · {task.maintenanceDate}</p>
        <h1>{task.venueName}</h1>
        <span>
          参与人员：{task.participants} · 共 {task.pipeNumbers.length} 支音管待调音
        </span>
        {lastSaved && (
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '13px' }}>
            💾 草稿已自动保存于 {lastSaved}
          </p>
        )}
      </section>

      <section className="metrics">
        <article>
          <small>已完成</small>
          <strong style={{ color: completedCount === totalCount ? '#059669' : undefined }}>
            {completedCount}/{totalCount}
          </strong>
        </article>
        <article style={{ borderTopColor: '#dc2626' }}>
          <small>偏差超限</small>
          <strong style={{ color: '#dc2626' }}>{deviationCount}</strong>
        </article>
        <article style={{ borderTopColor: '#0ea5e9' }}>
          <small>当前温度</small>
          <strong style={{ color: '#0ea5e9' }}>
            {latestTH ? `${latestTH.temperature.toFixed(1)}°C` : '-°C'}
          </strong>
        </article>
        <article style={{ borderTopColor: '#475569' }}>
          <small>当前湿度</small>
          <strong style={{ color: '#475569' }}>
            {latestTH ? `${latestTH.humidity.toFixed(0)}%` : '-%'}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>音管调音记录</p>
            <h2>音管列表</h2>
          </div>
          <div className="category-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
            {(['all', 'pending', 'completed'] as const).map((f) => (
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
                {f === 'all' ? '全部' : f === 'pending' ? '待调音' : '已完成'}
                <span className="tab-count">
                  {f === 'all' ? totalCount : f === 'pending' ? totalCount - completedCount : completedCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredPipes.length === 0 ? (
          <div className="empty-state">
            <p>{filter === 'pending' ? '所有音管已完成调音' : filter === 'completed' ? '暂无已完成的音管' : '暂无音管记录'}</p>
          </div>
        ) : (
          <div className="pipe-record-list">
            {filteredPipes.map((pipe) => {
              const completed = isPipeCompleted(pipe);
              const selectedStop = pipe.stopId ? stops.find((s) => s.id === pipe.stopId) : null;

              return (
                <div
                  key={pipe.id}
                  className={`pipe-record-card ${completed ? 'completed' : 'pending'} ${editingPipe?.id === pipe.id ? 'editing' : ''}`}
                  onClick={() => !editingPipe && handleEditPipe(pipe)}
                >
                  <div className="pipe-record-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`pipe-status-indicator ${completed ? 'done' : 'todo'}`}>
                        {completed ? '✓' : ''}
                      </div>
                      <div>
                        <h3 className="pipe-number-large">{pipe.pipeNumber}</h3>
                        {selectedStop && (
                          <span
                            className="stop-category"
                            style={{
                              background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[selectedStop.category]} 15%, #ffffff)`,
                              color: STOP_CATEGORY_COLORS[selectedStop.category],
                              margin: 0,
                            }}
                          >
                            {STOP_CATEGORY_LABELS[selectedStop.category]} · {stopService.getDisplayLabel(selectedStop)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="pipe-record-status">
                      {completed ? '已完成' : '待调音'}
                    </span>
                  </div>

                  {completed ? (
                    <div className="pipe-record-details">
                      {pipe.pitch && (
                        <div className="detail-item">
                          <span className="detail-label">音高</span>
                          <span className="detail-value">{pipe.pitch}</span>
                        </div>
                      )}
                      {pipe.centDeviation !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">音分偏差</span>
                          <span
                            className="detail-value"
                            style={{
                              color: Math.abs(pipe.centDeviation) > 5 ? '#dc2626' : '#059669',
                              fontWeight: 600,
                            }}
                          >
                            {pipe.centDeviation > 0 ? '+' : ''}{pipe.centDeviation} cent
                          </span>
                        </div>
                      )}
                      {pipe.temperature !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">温度</span>
                          <span className="detail-value">{pipe.temperature}°C</span>
                        </div>
                      )}
                      {pipe.humidity !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">湿度</span>
                          <span className="detail-value">{pipe.humidity}%</span>
                        </div>
                      )}
                      {pipe.reedStatus && (
                        <div className="detail-item">
                          <span className="detail-label">簧片状态</span>
                          <span className="detail-value">{pipe.reedStatus}</span>
                        </div>
                      )}
                      {pipe.remarks && (
                        <div className="detail-item full-width">
                          <span className="detail-label">备注</span>
                          <span className="detail-value">{pipe.remarks}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pipe-record-empty">
                      <p>📝 点击开始记录调音数据</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TemperatureHumidityRecorder taskId={taskId} onRecordAdded={handleTHRecordAdded} />

      <section className="panel report-panel">
        <div className="heading">
          <div>
            <p>维护报告</p>
            <h2>任务摘要</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onViewReport && (
              <button
                className="primary"
                onClick={onViewReport}
                style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                📑 查看完整报告
              </button>
            )}
            <button
              className="primary"
              onClick={() => window.print()}
              style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              📄 打印报告
            </button>
          </div>
        </div>
        <div className="report-summary-grid">
          <div className="report-summary-item">
            <span className="report-summary-label">场馆</span>
            <span className="report-summary-value">{task.venueName}</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">维护日期</span>
            <span className="report-summary-value">{task.maintenanceDate}</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">参与人员</span>
            <span className="report-summary-value">{task.participants}</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">音管总数</span>
            <span className="report-summary-value">{totalCount} 支</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">已完成</span>
            <span className="report-summary-value" style={{ color: '#059669' }}>
              {completedCount} 支
            </span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">偏差超限</span>
            <span className="report-summary-value" style={{ color: '#dc2626' }}>
              {deviationCount} 支
            </span>
          </div>
        </div>

        {task.temperatureHumidityRecords && task.temperatureHumidityRecords.length > 0 && (
          <div className="report-th-section">
            <h3>温湿度统计</h3>
            <div className="report-th-grid">
              <div className="report-th-card">
                <span className="report-th-label">最高温度</span>
                <span className="report-th-value temp-high">
                  {Math.max(...task.temperatureHumidityRecords.map((r) => r.temperature)).toFixed(1)}°C
                </span>
              </div>
              <div className="report-th-card">
                <span className="report-th-label">最低温度</span>
                <span className="report-th-value temp-low">
                  {Math.min(...task.temperatureHumidityRecords.map((r) => r.temperature)).toFixed(1)}°C
                </span>
              </div>
              <div className="report-th-card">
                <span className="report-th-label">最高湿度</span>
                <span className="report-th-value humidity-high">
                  {Math.max(...task.temperatureHumidityRecords.map((r) => r.humidity)).toFixed(0)}%
                </span>
              </div>
              <div className="report-th-card">
                <span className="report-th-label">最低湿度</span>
                <span className="report-th-value humidity-low">
                  {Math.min(...task.temperatureHumidityRecords.map((r) => r.humidity)).toFixed(0)}%
                </span>
              </div>
              <div className="report-th-card">
                <span className="report-th-label">最后一次读数</span>
                <span className="report-th-value">
                  {latestTH?.temperature.toFixed(1)}°C / {latestTH?.humidity.toFixed(0)}%
                </span>
              </div>
              <div className="report-th-card">
                <span className="report-th-label">记录次数</span>
                <span className="report-th-value">
                  {task.temperatureHumidityRecords.length} 次
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {editingPipe && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal tuning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>记录调音数据</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                  音管编号：<strong style={{ color: 'var(--primary)' }}>{editingPipe.pipeNumber}</strong>
                </p>
              </div>
              <button className="close-btn" onClick={handleCloseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSavePipe} className="modal-body">
              <div className="field-grid">
                <label className="full-width">
                  <span>音栓</span>
                  <select name="stopId" value={formData.stopId} onChange={handleFormChange}>
                    <option value="">-- 请选择音栓（可选）--</option>
                    {stops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        [{STOP_CATEGORY_LABELS[stop.category]}] {stopService.getDisplayLabel(stop)}
                      </option>
                    ))}
                  </select>
                </label>

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
                  <select name="reedStatus" value={formData.reedStatus} onChange={handleFormChange}>
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

              <div className="modal-footer">
                <button type="button" onClick={handleCloseForm}>
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

      {showDraftRestore && (
        <div className="modal-overlay" onClick={() => setShowDraftRestore(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>发现未保存的草稿</h2>
              <button className="close-btn" onClick={() => setShowDraftRestore(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                检测到上次未完成的调音记录草稿，是否恢复？
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                ⚠️ 恢复草稿将覆盖当前已保存的调音记录数据
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDraftRestore(false)}>
                放弃草稿
              </button>
              <button className="primary" onClick={restoreDraft}>
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
