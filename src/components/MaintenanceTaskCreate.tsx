import { useState, useEffect, useRef } from 'react';
import type { MaintenanceTaskFormData } from '../types/maintenance';
import { DEFAULT_MAINTENANCE_FORM_DATA } from '../types/maintenance';
import { venueService } from '../services/venueService';
import { maintenanceService } from '../services/maintenanceService';
import { draftService } from '../services/draftService';
import type { Venue } from '../types/venue';

interface MaintenanceTaskCreateProps {
  onBack: () => void;
  onTaskCreated: (taskId: string) => void;
  restoreFromDraft?: boolean;
}

export function MaintenanceTaskCreate({ onBack, onTaskCreated, restoreFromDraft }: MaintenanceTaskCreateProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [formData, setFormData] = useState<MaintenanceTaskFormData>(DEFAULT_MAINTENANCE_FORM_DATA);
  const [bulkInput, setBulkInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setVenues(venueService.getAll());
  }, []);

  useEffect(() => {
    if (restoreFromDraft) {
      restoreDraft();
    } else {
      const draft = draftService.getMaintenanceTaskDraft();
      if (draft) {
        setShowDraftRestore(true);
      }
    }
  }, [restoreFromDraft]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveDraft();
    }, 500);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData]);

  const saveDraft = () => {
    const venue = venues.find((v) => v.id === formData.venueId);
    draftService.saveMaintenanceTaskDraft(formData, venue?.name);
    setLastSaved(new Date().toLocaleTimeString('zh-CN'));
  };

  const restoreDraft = () => {
    const draft = draftService.getMaintenanceTaskDraft();
    if (draft) {
      setFormData(draft.data);
      setLastSaved(new Date(draft.updatedAt).toLocaleTimeString('zh-CN'));
    }
    setShowDraftRestore(false);
  };

  const clearDraft = () => {
    draftService.deleteMaintenanceTaskDraft();
    setLastSaved('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
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

    const uniqueNewPipes = newPipes.filter(
      (pipe) => !formData.pipeNumbers.some((existing) => existing === pipe)
    );

    if (uniqueNewPipes.length > 0) {
      setFormData((prev) => ({
        ...prev,
        pipeNumbers: [...prev.pipeNumbers, ...uniqueNewPipes],
      }));
    }
    setBulkInput('');
  };

  const handleRemovePipe = (pipeNumber: string) => {
    setFormData((prev) => ({
      ...prev,
      pipeNumbers: prev.pipeNumbers.filter((p) => p !== pipeNumber),
    }));
  };

  const handleClearAllPipes = () => {
    setFormData((prev) => ({
      ...prev,
      pipeNumbers: [],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.venueId) {
      newErrors.venueId = '请选择场馆';
    }
    if (!formData.maintenanceDate) {
      newErrors.maintenanceDate = '请选择维护日期';
    }
    if (!formData.participants.trim()) {
      newErrors.participants = '请输入参与人员';
    }
    if (formData.pipeNumbers.length === 0) {
      newErrors.pipeNumbers = '请至少添加一个音管编号';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newTask = maintenanceService.create(formData);
    clearDraft();
    onTaskCreated(newTask.id);
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>单次维护任务</p>
        <h1>创建维护任务</h1>
        <span>选择场馆、维护日期和参与人员，批量添加需要检查的音管编号，创建后进入调音记录视图开始工作。</span>
        {lastSaved && (
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '13px' }}>
            💾 草稿已自动保存于 {lastSaved}
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit}>
        <section className="panel" style={{ marginBottom: '18px' }}>
          <div className="heading">
            <div>
              <p>基本信息</p>
              <h2>任务信息</h2>
            </div>
          </div>

          <div className="field-grid">
            <label className="full-width">
              <span>选择场馆 *</span>
              <select
                name="venueId"
                value={formData.venueId}
                onChange={handleInputChange}
                style={{ borderColor: errors.venueId ? '#dc2626' : undefined }}
              >
                <option value="">-- 请选择场馆 --</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              {errors.venueId && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.venueId}</span>}
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
                name="maintenanceDate"
                value={formData.maintenanceDate}
                onChange={handleInputChange}
                style={{ borderColor: errors.maintenanceDate ? '#dc2626' : undefined }}
              />
              {errors.maintenanceDate && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.maintenanceDate}</span>}
            </label>

            <label>
              <span>参与人员 *</span>
              <input
                type="text"
                name="participants"
                placeholder="如：张三、李四"
                value={formData.participants}
                onChange={handleInputChange}
                style={{ borderColor: errors.participants ? '#dc2626' : undefined }}
              />
              {errors.participants && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.participants}</span>}
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>音管列表</p>
              <h2>批量添加音管编号</h2>
            </div>
            {formData.pipeNumbers.length > 0 && (
              <button type="button" className="delete-btn action-btn" onClick={handleClearAllPipes}>
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
            <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>{errors.pipeNumbers}</p>
          )}

          {formData.pipeNumbers.length > 0 ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                  已添加音管 <span style={{ color: 'var(--primary)' }}>({formData.pipeNumbers.length})</span>
                </h3>
              </div>
              <div className="pipe-number-grid">
                {formData.pipeNumbers.map((pipeNumber) => (
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
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>请在上方输入框中添加需要检查的音管编号</p>
            </div>
          )}

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', marginTop: '24px', paddingTop: '20px', marginBottom: '-10px' }}>
            <button type="button" onClick={onBack}>
              取消
            </button>
            <button type="submit" className="primary">
              创建任务 →
            </button>
          </div>
        </section>
      </form>

      {showDraftRestore && (
        <div className="modal-overlay" onClick={() => setShowDraftRestore(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>发现未保存的草稿</h2>
              <button className="close-btn" onClick={() => setShowDraftRestore(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                检测到上次未完成的维护任务草稿，是否恢复？
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 提示：草稿仅保存在本地浏览器中
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
