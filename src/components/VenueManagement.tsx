import { useState, useEffect, useRef } from 'react';
import type { Venue, VenueFormData } from '../types/venue';
import { VENUE_TYPE_LABELS, DEFAULT_VENUE_FORM_DATA } from '../types/venue';
import { venueService } from '../services/venueService';
import { draftService } from '../services/draftService';

interface VenueManagementProps {
  onBack: () => void;
  draftEditingId?: string;
  onGoToDrafts?: () => void;
  restoreFromDraft?: boolean;
}

export function VenueManagement({ onBack, draftEditingId, onGoToDrafts, restoreFromDraft }: VenueManagementProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState<VenueFormData>(DEFAULT_VENUE_FORM_DATA);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftExists, setDraftExists] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (restoreFromDraft) {
      const draft = draftService.getVenueDraft(draftEditingId);
      if (draft) {
        if (draft.editingId) {
          const venue = venueService.getById(draft.editingId);
          if (venue) {
            setEditingVenue(venue);
          }
        } else {
          setEditingVenue(null);
        }
        setFormData(draft.data);
        setLastSaved(new Date(draft.updatedAt).toLocaleTimeString('zh-CN'));
        setShowForm(true);
        setShowDraftRestore(false);
      }
    }
  }, [restoreFromDraft, draftEditingId]);

  useEffect(() => {
    if (showForm && !restoreFromDraft) {
      const draft = draftService.getVenueDraft(editingVenue?.id);
      setDraftExists(!!draft);
      if (draft) {
        setShowDraftRestore(true);
      }
    }
  }, [showForm, editingVenue, restoreFromDraft]);

  useEffect(() => {
    if (showForm && formData) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveDraft();
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, showForm]);

  const loadVenues = () => {
    setVenues(venueService.getAll());
  };

  const saveDraft = () => {
    if (!showForm) return;
    draftService.saveVenueDraft(formData, editingVenue?.id);
    setLastSaved(new Date().toLocaleTimeString('zh-CN'));
  };

  const restoreDraft = (editingId?: string) => {
    const draft = draftService.getVenueDraft(editingId);
    if (draft) {
      setFormData(draft.data);
      setLastSaved(new Date(draft.updatedAt).toLocaleTimeString('zh-CN'));
    }
    setShowDraftRestore(false);
  };

  const clearDraft = () => {
    draftService.deleteVenueDraft(editingVenue?.id);
    setDraftExists(false);
    setLastSaved('');
  };

  const handleAdd = () => {
    setEditingVenue(null);
    setFormData(DEFAULT_VENUE_FORM_DATA);
    setShowDraftRestore(false);
    setLastSaved('');
    setDraftExists(false);
    setShowForm(true);
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      type: venue.type,
      address: venue.address,
      organLocation: venue.organLocation,
      lastMaintenanceDate: venue.lastMaintenanceDate,
      defaultTemperature: venue.defaultTemperature,
      defaultHumidity: venue.defaultHumidity,
      remarks: venue.remarks,
    });
    setShowDraftRestore(false);
    setLastSaved('');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (venueService.delete(id)) {
      loadVenues();
    }
    setDeleteConfirm(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVenue) {
      venueService.update(editingVenue.id, formData);
    } else {
      venueService.create(formData);
    }
    clearDraft();
    loadVenues();
    setShowForm(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setShowDraftRestore(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'defaultTemperature' || name === 'defaultHumidity' ? Number(value) : value,
    }));
  };

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>场馆档案管理</p>
        <h1>场馆档案</h1>
        <span>维护教堂或音乐厅的基础信息、管风琴位置、最近维护日期和默认温湿度记录，便于快速关联调音记录。</span>
      </section>

      <section className="metrics">
        <article>
          <small>场馆总数</small>
          <strong>{venues.length}</strong>
        </article>
        <article>
          <small>教堂</small>
          <strong>{venues.filter((v) => v.type === 'church').length}</strong>
        </article>
        <article>
          <small>音乐厅</small>
          <strong>{venues.filter((v) => v.type === 'concert_hall').length}</strong>
        </article>
        <article>
          <small>平均温度</small>
          <strong>
            {venues.length > 0
              ? (venues.reduce((sum, v) => sum + v.defaultTemperature, 0) / venues.length).toFixed(1)
              : 0}
            °C
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>场馆列表</p>
            <h2>全部场馆</h2>
          </div>
          <button className="primary" onClick={handleAdd}>
            + 新增场馆
          </button>
        </div>

        {venues.length === 0 ? (
          <div className="empty-state">
            <p>暂无场馆档案</p>
            <button className="primary" onClick={handleAdd}>
              添加第一个场馆
            </button>
          </div>
        ) : (
          <div className="venue-list">
            {venues.map((venue) => (
              <article key={venue.id} className="venue-card">
                <div className="venue-card-header">
                  <div>
                    <span className={`venue-type ${venue.type}`}>{VENUE_TYPE_LABELS[venue.type]}</span>
                    <h3>{venue.name}</h3>
                  </div>
                  <div className="venue-actions">
                    <button onClick={() => handleEdit(venue)} className="action-btn edit-btn">
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(venue.id)}
                      className="action-btn delete-btn"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="venue-info">
                  <div className="info-item">
                    <span className="info-label">地址</span>
                    <span className="info-value">{venue.address || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">管风琴位置</span>
                    <span className="info-value">{venue.organLocation || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">最近维护</span>
                    <span className="info-value">{venue.lastMaintenanceDate || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">默认温湿度</span>
                    <span className="info-value">
                      {venue.defaultTemperature}°C / {venue.defaultHumidity}%
                    </span>
                  </div>
                </div>

                {venue.remarks && (
                  <p className="venue-remarks">
                    <strong>备注：</strong>
                    {venue.remarks}
                  </p>
                )}

                {deleteConfirm === venue.id && (
                  <div className="delete-confirm">
                    <p>确定要删除「{venue.name}」吗？此操作不可撤销。</p>
                    <div className="confirm-actions">
                      <button onClick={() => setDeleteConfirm(null)}>取消</button>
                      <button className="danger-btn" onClick={() => handleDelete(venue.id)}>
                        确认删除
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editingVenue ? '编辑场馆' : '新增场馆'}</h2>
                {lastSaved && (
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                    💾 草稿已自动保存于 {lastSaved}
                  </p>
                )}
              </div>
              <button className="close-btn" onClick={handleCloseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="field-grid">
                <label>
                  <span>场馆名称 *</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="请输入场馆名称"
                    required
                  />
                </label>

                <label>
                  <span>场馆类型</span>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="church">教堂</option>
                    <option value="concert_hall">音乐厅</option>
                    <option value="other">其他</option>
                  </select>
                </label>

                <label className="full-width">
                  <span>地址</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="请输入场馆地址"
                  />
                </label>

                <label className="full-width">
                  <span>管风琴位置</span>
                  <input
                    type="text"
                    name="organLocation"
                    value={formData.organLocation}
                    onChange={handleInputChange}
                    placeholder="请输入管风琴在馆内的具体位置"
                  />
                </label>

                <label>
                  <span>最近维护日期</span>
                  <input
                    type="date"
                    name="lastMaintenanceDate"
                    value={formData.lastMaintenanceDate}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  <span>默认温度 (°C)</span>
                  <input
                    type="number"
                    name="defaultTemperature"
                    value={formData.defaultTemperature}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    step="0.5"
                  />
                </label>

                <label>
                  <span>默认湿度 (%)</span>
                  <input
                    type="number"
                    name="defaultHumidity"
                    value={formData.defaultHumidity}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>

                <label className="full-width">
                  <span>备注</span>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="请输入相关备注信息"
                    rows={3}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" onClick={handleCloseForm}>
                    取消
                  </button>
                </div>
                <button type="submit" className="primary">
                  {editingVenue ? '保存修改' : '创建场馆'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                检测到之前未完成的编辑草稿，是否恢复上次编辑内容？
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 提示：草稿仅保存在本地浏览器中
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDraftRestore(false)}>
                放弃草稿
              </button>
              <button
                className="primary"
                onClick={() => {
                  restoreDraft(editingVenue?.id);
                }}
              >
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
