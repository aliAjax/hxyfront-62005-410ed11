import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { venueService } from '../../services/venueService';
import type { Venue } from '../../types/venue';

export function WorkflowVenueStep() {
  const { state, setState, nextStep, canGoNext } = useWorkflow();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bulkInput, setBulkInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setVenues(venueService.getAll());
  }, []);

  const handleVenueChange = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    setState((prev) => ({
      ...prev,
      venueId,
      venueName: venue?.name || '',
    }));
    if (errors.venueId) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.venueId;
        return n;
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const parsePipeNumbers = (input: string): string[] => {
    return input
      .split(/[\n,，、\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleAddPipes = () => {
    const newPipes = parsePipeNumbers(bulkInput);
    if (newPipes.length === 0) return;
    const unique = newPipes.filter((p) => !state.pipeNumbers.includes(p));
    if (unique.length > 0) {
      setState((prev) => ({
        ...prev,
        pipeNumbers: [...prev.pipeNumbers, ...unique],
      }));
    }
    setBulkInput('');
    if (errors.pipeNumbers) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.pipeNumbers;
        return n;
      });
    }
  };

  const handleRemovePipe = (pipeNumber: string) => {
    setState((prev) => {
      const newPipeData = { ...prev.pipeData };
      delete newPipeData[pipeNumber];
      return {
        ...prev,
        pipeNumbers: prev.pipeNumbers.filter((p) => p !== pipeNumber),
        pipeData: newPipeData,
      };
    });
  };

  const handleClearPipes = () => {
    setState((prev) => ({ ...prev, pipeNumbers: [], pipeData: {} }));
  };

  const validateAndNext = () => {
    const newErrors: Record<string, string> = {};
    if (!state.venueId) newErrors.venueId = '请选择场馆';
    if (!state.maintenanceDate) newErrors.maintenanceDate = '请选择维护日期';
    if (!state.participants.trim()) newErrors.participants = '请输入参与人员';
    if (state.pipeNumbers.length === 0) newErrors.pipeNumbers = '请至少添加一个音管编号';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      nextStep();
    }
  };

  const selectedVenue = venues.find((v) => v.id === state.venueId);

  return (
    <div className="workflow-step-content">
      <div className="panel">
        <div className="heading">
          <div>
            <p>基本信息</p>
            <h2>场馆与任务信息</h2>
          </div>
        </div>
        <div className="field-grid">
          <label className="full-width">
            <span>选择场馆 *</span>
            <select
              value={state.venueId}
              onChange={(e) => handleVenueChange(e.target.value)}
              style={{ borderColor: errors.venueId ? '#dc2626' : undefined }}
            >
              <option value="">-- 请选择场馆 --</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {errors.venueId && (
              <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.venueId}</span>
            )}
          </label>

          {selectedVenue && (
            <div className="full-width venue-info" style={{ marginTop: '8px' }}>
              <div className="info-item">
                <span className="info-label">默认温度</span>
                <span className="info-value">{selectedVenue.defaultTemperature}°C</span>
              </div>
              <div className="info-item">
                <span className="info-label">默认湿度</span>
                <span className="info-value">{selectedVenue.defaultHumidity}%</span>
              </div>
              <div className="info-item">
                <span className="info-label">管风琴位置</span>
                <span className="info-value">{selectedVenue.organLocation || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">最近维护</span>
                <span className="info-value">{selectedVenue.lastMaintenanceDate || '-'}</span>
              </div>
            </div>
          )}

          <label>
            <span>维护日期 *</span>
            <input
              type="date"
              value={state.maintenanceDate}
              onChange={(e) => handleFieldChange('maintenanceDate', e.target.value)}
              style={{ borderColor: errors.maintenanceDate ? '#dc2626' : undefined }}
            />
            {errors.maintenanceDate && (
              <span style={{ color: '#dc2626', fontSize: '12px' }}>
                {errors.maintenanceDate}
              </span>
            )}
          </label>

          <label>
            <span>参与人员 *</span>
            <input
              type="text"
              placeholder="如：张三、李四"
              value={state.participants}
              onChange={(e) => handleFieldChange('participants', e.target.value)}
              style={{ borderColor: errors.participants ? '#dc2626' : undefined }}
            />
            {errors.participants && (
              <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.participants}</span>
            )}
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>音管列表</p>
            <h2>批量添加音管编号</h2>
          </div>
          {state.pipeNumbers.length > 0 && (
            <button
              type="button"
              className="delete-btn action-btn"
              onClick={handleClearPipes}
            >
              清空全部
            </button>
          )}
        </div>
        <div className="field-grid">
          <label className="full-width">
            <span>批量输入音管编号（支持换行、逗号、顿号分隔）</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={`例如：\nC1\nC#1\nD1\n\n或：C1, C#1, D1, E1`}
                rows={5}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="primary"
                onClick={handleAddPipes}
                disabled={!bulkInput.trim()}
                style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
              >
                + 添加
              </button>
            </div>
          </label>
        </div>

        {errors.pipeNumbers && (
          <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>
            {errors.pipeNumbers}
          </p>
        )}

        {state.pipeNumbers.length > 0 ? (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                已添加音管{' '}
                <span style={{ color: 'var(--primary)' }}>
                  ({state.pipeNumbers.length})
                </span>
              </h3>
            </div>
            <div className="pipe-number-grid">
              {state.pipeNumbers.map((pipeNumber) => (
                <div key={pipeNumber} className="pipe-number-item">
                  <span className="pipe-number-text">{pipeNumber}</span>
                  <button
                    type="button"
                    className="pipe-remove-btn"
                    onClick={() => handleRemovePipe(pipeNumber)}
                    title="移除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p>暂无音管编号</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              请在上方输入框中添加需要检查的音管编号
            </p>
          </div>
        )}
      </div>

      <div className="workflow-nav-footer">
        <div />
        <button
          className="primary"
          onClick={validateAndNext}
          disabled={!canGoNext()}
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          下一步：音栓资料 →
        </button>
      </div>
    </div>
  );
}
