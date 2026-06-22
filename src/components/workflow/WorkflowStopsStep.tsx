import { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { stopService } from '../../services/stopService';
import type { Stop, StopCategory } from '../../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../../types/stops';

export function WorkflowStopsStep() {
  const { state, setState, nextStep, prevStep, updatePipeData, bulkUpdatePipeData } =
    useWorkflow();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StopCategory | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bulkAssignStopId, setBulkAssignStopId] = useState('');
  const [editingPipeNumber, setEditingPipeNumber] = useState<string | null>(null);

  useEffect(() => {
    setStops(stopService.getAll());
  }, []);

  const filteredStops = useMemo(() => {
    let result = stops;
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter((s) => {
        const categoryLabel = STOP_CATEGORY_LABELS[s.category].toLowerCase();
        return (
          s.name.toLowerCase().includes(kw) ||
          s.footMark.toLowerCase().includes(kw) ||
          s.remarks.toLowerCase().includes(kw) ||
          categoryLabel.includes(kw)
        );
      });
    }
    return result;
  }, [stops, selectedCategory, searchKeyword]);

  const assignedCount = useMemo(() => {
    return state.pipeNumbers.filter(
      (n) => state.pipeData[n]?.stopId
    ).length;
  }, [state.pipeNumbers, state.pipeData]);

  const handleBulkAssign = () => {
    if (!bulkAssignStopId) return;
    const selectedStop = stops.find((s) => s.id === bulkAssignStopId);
    if (!selectedStop) return;
    const updates: Record<string, { stopId: string; stopName: string }> = {};
    for (const pipeNumber of state.pipeNumbers) {
      updates[pipeNumber] = {
        stopId: selectedStop.id,
        stopName: stopService.getDisplayLabel(selectedStop),
      };
    }
    bulkUpdatePipeData(updates);
  };

  const handleAssignStop = (pipeNumber: string, stopId: string) => {
    const selectedStop = stops.find((s) => s.id === stopId);
    if (stopId === '') {
      updatePipeData(pipeNumber, { stopId: undefined, stopName: undefined });
    } else if (selectedStop) {
      updatePipeData(pipeNumber, {
        stopId: selectedStop.id,
        stopName: stopService.getDisplayLabel(selectedStop),
      });
    }
  };

  const getStopDisplay = (stopId?: string): { stop?: Stop; label: string } => {
    if (!stopId) return { label: '未分配' };
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return { label: '未分配' };
    return { stop, label: stopService.getDisplayLabel(stop) };
  };

  return (
    <div className="workflow-step-content">
      <div className="panel">
        <div className="heading">
          <div>
            <p>音栓资料</p>
            <h2>为音管分配音栓</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              已分配 {assignedCount} / {state.pipeNumbers.length} 支音管
            </p>
          </div>
        </div>

        <div className="filter-grid" style={{ marginBottom: '20px' }}>
          <label className="filter-item">
            <span>按音栓类型筛选</span>
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as StopCategory | 'all')
              }
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
            <span>搜索音栓名称/关键词</span>
            <div className="workflow-search-box">
              <input
                type="text"
                placeholder="输入Trumpet、Principal或中文分类…"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="workflow-search-input"
              />
              {searchKeyword && (
                <button
                  className="workflow-search-clear"
                  onClick={() => setSearchKeyword('')}
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
          </label>
          <label className="filter-item">
            <span>批量分配音栓到所有音管</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={bulkAssignStopId}
                onChange={(e) => setBulkAssignStopId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- 选择音栓 --</option>
                {filteredStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{STOP_CATEGORY_LABELS[s.category]}] {stopService.getDisplayLabel(s)}
                  </option>
                ))}
              </select>
              <button
                className="primary"
                onClick={handleBulkAssign}
                disabled={!bulkAssignStopId}
                style={{ whiteSpace: 'nowrap' }}
              >
                批量分配
              </button>
            </div>
          </label>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>可用音栓（快速查看）</h3>
          <div className="stop-reference-list">
            {filteredStops.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', padding: '8px 0' }}>
                {searchKeyword.trim() ? '未找到匹配的音栓，试试其他关键词' : '当前分类下暂无音栓'}
              </p>
            ) : (
              filteredStops.map((stop) => (
                <div
                  key={stop.id}
                  className="stop-reference-item"
                  style={{
                    borderLeftColor: STOP_CATEGORY_COLORS[stop.category],
                    borderLeftWidth: '3px',
                    borderLeftStyle: 'solid',
                  }}
                >
                  <span
                    className="stop-dot"
                    style={{ background: STOP_CATEGORY_COLORS[stop.category] }}
                  />
                  <div style={{ flex: 1 }}>
                    <span className="stop-ref-name">{stopService.getDisplayLabel(stop)}</span>
                    <span className="stop-ref-category">
                      {STOP_CATEGORY_LABELS[stop.category]} · {stop.remarks || '无备注'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>音管音栓分配</p>
            <h2>逐支分配音栓</h2>
          </div>
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => {
              const updates: Record<string, { stopId: undefined; stopName: undefined }> = {};
              for (const pipeNumber of state.pipeNumbers) {
                updates[pipeNumber] = { stopId: undefined, stopName: undefined };
              }
              bulkUpdatePipeData(updates);
            }}
          >
            ✕ 清空所有分配
          </button>
        </div>

        <div className="pipe-stop-assign-grid">
          {state.pipeNumbers.map((pipeNumber) => {
            const data = state.pipeData[pipeNumber] || {};
            const { stop, label } = getStopDisplay(data.stopId);
            const isEditing = editingPipeNumber === pipeNumber;

            return (
              <div
                key={pipeNumber}
                className={`pipe-stop-assign-card ${stop ? 'assigned' : 'unassigned'}`}
                onClick={() => setEditingPipeNumber(isEditing ? null : pipeNumber)}
                style={
                  stop
                    ? {
                        borderLeftColor: STOP_CATEGORY_COLORS[stop.category],
                        borderLeftWidth: '4px',
                        borderLeftStyle: 'solid',
                      }
                    : undefined
                }
              >
                <div className="pipe-stop-assign-header">
                  <span className="pipe-number-large">{pipeNumber}</span>
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
                <div className="pipe-stop-assign-body">
                  {isEditing ? (
                    <select
                      value={data.stopId || ''}
                      onChange={(e) => handleAssignStop(pipeNumber, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    >
                      <option value="">-- 未分配 --</option>
                      {filteredStops.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{STOP_CATEGORY_LABELS[s.category]}] {stopService.getDisplayLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="pipe-stop-assign-label">{label}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="workflow-nav-footer">
        <button onClick={prevStep}>← 上一步：场馆选择</button>
        <button
          className="primary"
          onClick={nextStep}
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          下一步：调音偏差录入 →
        </button>
      </div>
    </div>
  );
}
