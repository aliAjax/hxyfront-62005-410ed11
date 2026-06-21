import { useState, useEffect, useMemo } from 'react';
import type { MaintenanceTask, PipeRecord } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import { stopService } from '../services/stopService';
import type { Stop, StopCategory } from '../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';

interface TuningDeviationEntryProps {
  onBack: () => void;
}

const DEVIATION_THRESHOLD = 5;

const REED_STATUS_OPTIONS = ['正常', '需微调', '需更换', '已调整'];

interface GroupedPipes {
  stopId: string | null;
  stopName: string;
  stopCategory: StopCategory | null;
  pipes: PipeRecord[];
}

export function TuningDeviationEntry({ onBack }: TuningDeviationEntryProps) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [currentTask, setCurrentTask] = useState<MaintenanceTask | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [threshold, setThreshold] = useState<number>(DEVIATION_THRESHOLD);
  const [filterCategory, setFilterCategory] = useState<StopCategory | 'all' | 'abnormal'>('all');

  useEffect(() => {
    setTasks(maintenanceService.getAll());
    setStops(stopService.getAll());
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      const task = maintenanceService.getById(selectedTaskId);
      if (task) {
        setCurrentTask(task);
      }
    } else {
      setCurrentTask(null);
    }
  }, [selectedTaskId]);

  const loadCurrentTask = () => {
    if (selectedTaskId) {
      const task = maintenanceService.getById(selectedTaskId);
      if (task) {
        setCurrentTask(task);
        setTasks(maintenanceService.getAll());
      }
    }
  };

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

  const groupedPipes = useMemo<GroupedPipes[]>(() => {
    if (!currentTask) return [];

    const groups = new Map<string, GroupedPipes>();

    currentTask.pipeRecords.forEach((pipe) => {
      const key = pipe.stopId || '__unassigned__';
      if (!groups.has(key)) {
        const stop = getStop(pipe.stopId);
        groups.set(key, {
          stopId: pipe.stopId || null,
          stopName: getStopDisplayLabel(pipe.stopId, pipe.stopName),
          stopCategory: stop?.category || null,
          pipes: [],
        });
      }
      groups.get(key)!.pipes.push(pipe);
    });

    const result = Array.from(groups.values());

    result.sort((a, b) => {
      const order: (StopCategory | 'unassigned')[] = ['principal', 'reed', 'mixture', 'bourdon', 'unassigned'];
      const aKey = a.stopCategory || 'unassigned';
      const bKey = b.stopCategory || 'unassigned';
      return order.indexOf(aKey) - order.indexOf(bKey);
    });

    return result;
  }, [currentTask, stops]);

  const abnormalPipes = useMemo<PipeRecord[]>(() => {
    if (!currentTask) return [];
    return currentTask.pipeRecords.filter(
      (pipe) => pipe.centDeviation !== undefined && Math.abs(pipe.centDeviation) > threshold
    );
  }, [currentTask, threshold]);

  const filteredGroupedPipes = useMemo<GroupedPipes[]>(() => {
    let pipes = groupedPipes;

    if (filterCategory === 'abnormal') {
      pipes = groupedPipes
        .map((g) => ({
          ...g,
          pipes: g.pipes.filter(
            (p) => p.centDeviation !== undefined && Math.abs(p.centDeviation) > threshold
          ),
        }))
        .filter((g) => g.pipes.length > 0);
    } else if (filterCategory !== 'all') {
      pipes = groupedPipes.filter((g) => g.stopCategory === filterCategory);
    }

    return pipes;
  }, [groupedPipes, filterCategory, threshold]);

  const isAbnormal = (pipe: PipeRecord): boolean => {
    return pipe.centDeviation !== undefined && Math.abs(pipe.centDeviation) > threshold;
  };

  const handleFieldChange = (pipe: PipeRecord, field: string, value: string) => {
    const updates: Partial<PipeRecord> = {};

    switch (field) {
      case 'pitch':
        updates.pitch = value || undefined;
        break;
      case 'centDeviation': {
        const num = parseFloat(value);
        updates.centDeviation = isNaN(num) ? undefined : num;
        break;
      }
      case 'reedStatus':
        updates.reedStatus = value || undefined;
        break;
      case 'remarks':
        updates.remarks = value || undefined;
        break;
      case 'stopId': {
        updates.stopId = value || undefined;
        const stop = getStop(value);
        updates.stopName = stop ? stopService.getDisplayLabel(stop) : undefined;
        break;
      }
    }

    if (selectedTaskId) {
      maintenanceService.updatePipeRecord(selectedTaskId, pipe.id, updates);
      loadCurrentTask();
    }
  };

  const totalPipes = currentTask?.pipeRecords.length || 0;
  const completedPipes = currentTask?.pipeRecords.filter(
    (p) => p.pitch || p.centDeviation !== undefined
  ).length || 0;
  const abnormalCount = abnormalPipes.length;

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>调音偏差录入</p>
        <h1>调音偏差录入</h1>
        <span>按音栓和音管编号批量录入调音数据。点击单元格即可编辑，音分偏差超过阈值自动标记异常并进入异常音管列表。</span>
      </section>

      <section className="metrics">
        <article>
          <small>音管总数</small>
          <strong>{totalPipes}</strong>
        </article>
        <article style={{ borderTopColor: '#059669' }}>
          <small>已录入</small>
          <strong style={{ color: '#059669' }}>
            {completedPipes}/{totalPipes}
          </strong>
        </article>
        <article style={{ borderTopColor: '#dc2626' }}>
          <small>偏差超限（阈值 {threshold} cent）</small>
          <strong style={{ color: '#dc2626' }}>{abnormalCount}</strong>
        </article>
        <article style={{ borderTopColor: 'var(--accent)' }}>
          <small>音栓分组</small>
          <strong style={{ color: 'var(--accent)' }}>{groupedPipes.length}</strong>
        </article>
      </section>

      <section className="panel deviation-panel">
        <div className="heading">
          <div>
            <p>选择维护任务</p>
            <h2>偏差录入工作台</h2>
          </div>
          <div className="heading-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', gridTemplateColumns: 'none' }}>
              <span style={{ whiteSpace: 'nowrap', fontSize: '13px', color: '#64748b' }}>
                偏差阈值：
              </span>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || DEVIATION_THRESHOLD)}
                style={{ width: '80px' }}
                min="1"
                step="1"
              />
              <span style={{ fontSize: '13px', color: '#64748b' }}>cent</span>
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              style={{ width: '280px' }}
            >
              <option value="">-- 请选择维护任务 --</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.venueName} · {task.maintenanceDate}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!currentTask ? (
        <div className="empty-state">
          <p>{tasks.length === 0 ? '暂无维护任务，请先创建维护任务' : '请选择一个维护任务开始录入'}</p>
        </div>
      ) : (
        <>
          <section className="panel">
            <div className="heading">
              <div>
                <p>{currentTask.venueName}</p>
                <h2>调音偏差数据表</h2>
              </div>
              <div className="category-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
                {([
                  { key: 'all', label: '全部' },
                  { key: 'principal', label: '主音栓' },
                  { key: 'reed', label: '簧片音栓' },
                  { key: 'mixture', label: '混合音栓' },
                  { key: 'bourdon', label: '低音管' },
                  { key: 'abnormal', label: '异常音管' },
                ] as const).map((f) => {
                  const count =
                    f.key === 'all'
                      ? totalPipes
                      : f.key === 'abnormal'
                      ? abnormalCount
                      : groupedPipes
                          .filter((g) => g.stopCategory === f.key)
                          .reduce((sum, g) => sum + g.pipes.length, 0);
                  return (
                    <button
                      key={f.key}
                      className={`category-tab ${filterCategory === f.key ? 'active' : ''}`}
                      style={
                        filterCategory === f.key
                          ? f.key === 'abnormal'
                            ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' }
                            : f.key !== 'all'
                            ? {
                                background: STOP_CATEGORY_COLORS[f.key as StopCategory],
                                color: '#fff',
                                borderColor: STOP_CATEGORY_COLORS[f.key as StopCategory],
                              }
                            : { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                          : undefined
                      }
                      onClick={() => setFilterCategory(f.key)}
                    >
                      {f.label}
                      <span className="tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredGroupedPipes.length === 0 ? (
              <div className="empty-state">
                <p>当前筛选条件下暂无音管数据</p>
              </div>
            ) : (
              filteredGroupedPipes.map((group) => (
                <div key={group.stopId || 'unassigned'} className="stop-table-group">
                  <div
                    className="stop-group-header"
                    style={
                      group.stopCategory
                        ? {
                            borderLeftColor: STOP_CATEGORY_COLORS[group.stopCategory],
                            background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[group.stopCategory]} 8%, #ffffff)`,
                          }
                        : undefined
                    }
                  >
                    <div className="stop-group-title">
                      {group.stopCategory && (
                        <span
                          className="stop-category"
                          style={{
                            background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[group.stopCategory]} 15%, #ffffff)`,
                            color: STOP_CATEGORY_COLORS[group.stopCategory],
                            margin: 0,
                          }}
                        >
                          {STOP_CATEGORY_LABELS[group.stopCategory]}
                        </span>
                      )}
                      <h3>{group.stopName}</h3>
                      <span className="stop-group-count">{group.pipes.length} 支音管</span>
                    </div>
                  </div>

                  <div className="deviation-table-wrapper">
                    <table className="deviation-table">
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>音管编号</th>
                          <th style={{ width: '160px' }}>音栓</th>
                          <th style={{ width: '100px' }}>音高</th>
                          <th style={{ width: '140px' }}>音分偏差</th>
                          <th style={{ width: '120px' }}>簧片状态</th>
                          <th>维修备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.pipes.map((pipe) => {
                          const abnormal = isAbnormal(pipe);
                          return (
                            <tr key={pipe.id} className={abnormal ? 'abnormal-row' : ''}>
                              <td className="pipe-number-cell">
                                <span className="pipe-number-text">{pipe.pipeNumber}</span>
                                {abnormal && <span className="abnormal-badge">异常</span>}
                              </td>
                              <td>
                                <select
                                  value={pipe.stopId || ''}
                                  onChange={(e) => handleFieldChange(pipe, 'stopId', e.target.value)}
                                  className="cell-select"
                                >
                                  <option value="">-- 未分配 --</option>
                                  {stops.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {stopService.getDisplayLabel(s)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="cell-input"
                                  placeholder="如 C4"
                                  value={pipe.pitch || ''}
                                  onChange={(e) => handleFieldChange(pipe, 'pitch', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.1"
                                  className={`cell-input ${abnormal ? 'abnormal-input' : ''}`}
                                  placeholder="如 3.5"
                                  value={pipe.centDeviation !== undefined ? pipe.centDeviation : ''}
                                  onChange={(e) => handleFieldChange(pipe, 'centDeviation', e.target.value)}
                                />
                                {pipe.centDeviation !== undefined && (
                                  <span className={`deviation-tag ${abnormal ? 'abnormal' : ''}`}>
                                    {pipe.centDeviation > 0 ? '+' : ''}{pipe.centDeviation}
                                  </span>
                                )}
                              </td>
                              <td>
                                <select
                                  value={pipe.reedStatus || ''}
                                  onChange={(e) => handleFieldChange(pipe, 'reedStatus', e.target.value)}
                                  className="cell-select"
                                >
                                  <option value="">--</option>
                                  {REED_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="cell-input"
                                  placeholder="备注..."
                                  value={pipe.remarks || ''}
                                  onChange={(e) => handleFieldChange(pipe, 'remarks', e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="panel">
            <div className="heading">
              <div>
                <p>异常音管列表</p>
                <h2>需要关注的异常音管（{abnormalCount}）</h2>
              </div>
              <span style={{ color: '#dc2626', fontSize: '13px' }}>
                偏差绝对值超过 {threshold} cent 的音管
              </span>
            </div>

            {abnormalPipes.length === 0 ? (
              <div className="empty-state">
                <p>🎉 太棒了！当前没有异常音管</p>
              </div>
            ) : (
              <div className="abnormal-pipes-grid">
                {abnormalPipes.map((pipe) => {
                  const stop = getStop(pipe.stopId);
                  const category = stop?.category;
                  return (
                    <div
                      key={pipe.id}
                      className="abnormal-pipe-card"
                      style={
                        category
                          ? { borderLeftColor: STOP_CATEGORY_COLORS[category] }
                          : undefined
                      }
                    >
                      <div className="abnormal-pipe-header">
                        <div>
                          <span className="pipe-number-text" style={{ fontWeight: 700 }}>{pipe.pipeNumber}</span>
                          {category && (
                            <span
                              className="stop-category"
                              style={{
                                background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[category]} 15%, #ffffff)`,
                                color: STOP_CATEGORY_COLORS[category],
                                marginLeft: '8px',
                              }}
                            >
                              {STOP_CATEGORY_LABELS[category]}
                            </span>
                          )}
                        </div>
                        <span className="abnormal-deviation">
                          {pipe.centDeviation! > 0 ? '+' : ''}{pipe.centDeviation} cent
                        </span>
                      </div>
                      <div className="abnormal-pipe-body">
                        {stop && <p><strong>音栓：</strong>{stopService.getDisplayLabel(stop)}</p>}
                        {pipe.pitch && <p><strong>音高：</strong>{pipe.pitch}</p>}
                        {pipe.reedStatus && <p><strong>簧片状态：</strong>{pipe.reedStatus}</p>}
                        {pipe.remarks && <p><strong>备注：</strong>{pipe.remarks}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
