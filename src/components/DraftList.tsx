import { useState, useEffect } from 'react';
import type { Draft, DraftType } from '../types/draft';
import { DRAFT_TYPE_LABELS, DRAFT_TYPE_COLORS } from '../types/draft';
import { draftService } from '../services/draftService';

interface DraftListProps {
  onBack: () => void;
  onContinueVenueDraft: (draftId?: string) => void;
  onContinueTaskDraft: () => void;
  onContinueTuningDraft: (taskId: string) => void;
  onContinueReportDraft: (taskId: string) => void;
}

export function DraftList({
  onBack,
  onContinueVenueDraft,
  onContinueTaskDraft,
  onContinueTuningDraft,
  onContinueReportDraft,
}: DraftListProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<DraftType | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = () => {
    setDrafts(draftService.getAll());
  };

  const handleContinue = (draft: Draft) => {
    switch (draft.type) {
      case 'venue':
        onContinueVenueDraft(draft.editingId);
        break;
      case 'maintenance_task':
        onContinueTaskDraft();
        break;
      case 'tuning_record':
        onContinueTuningDraft(draft.data.taskId);
        break;
      case 'maintenance_report':
        onContinueReportDraft(draft.data.taskId);
        break;
    }
  };

  const handleDelete = (id: string) => {
    draftService.delete(id);
    loadDrafts();
    setDeleteConfirm(null);
  };

  const handleClearAll = () => {
    draftService.clearAll();
    loadDrafts();
  };

  const filteredDrafts = filter === 'all'
    ? drafts
    : drafts.filter((d) => d.type === filter);

  const getDraftTypeIcon = (type: DraftType): string => {
    switch (type) {
      case 'venue':
        return '🏛️';
      case 'maintenance_task':
        return '📋';
      case 'tuning_record':
        return '🎵';
      case 'maintenance_report':
        return '📑';
    }
  };

  const draftTypes: Array<{ type: DraftType | 'all'; label: string }> = [
    { type: 'all', label: '全部' },
    { type: 'venue', label: '场馆档案' },
    { type: 'maintenance_task', label: '维护任务' },
    { type: 'tuning_record', label: '调音记录' },
    { type: 'maintenance_report', label: '维护报告' },
  ];

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>本地草稿</p>
        <h1>草稿管理</h1>
        <span>
          保存未完成的编辑内容，刷新页面后可恢复继续编辑。草稿仅保存在本地浏览器中，不会同步到服务器。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>草稿总数</small>
          <strong>{drafts.length}</strong>
        </article>
        <article style={{ borderTopColor: DRAFT_TYPE_COLORS.venue }}>
          <small>场馆档案草稿</small>
          <strong style={{ color: DRAFT_TYPE_COLORS.venue }}>
            {drafts.filter((d) => d.type === 'venue').length}
          </strong>
        </article>
        <article style={{ borderTopColor: DRAFT_TYPE_COLORS.tuning_record }}>
          <small>调音记录草稿</small>
          <strong style={{ color: DRAFT_TYPE_COLORS.tuning_record }}>
            {drafts.filter((d) => d.type === 'tuning_record').length}
          </strong>
        </article>
        <article style={{ borderTopColor: DRAFT_TYPE_COLORS.maintenance_report }}>
          <small>报告草稿</small>
          <strong style={{ color: DRAFT_TYPE_COLORS.maintenance_report }}>
            {drafts.filter((d) => d.type === 'maintenance_report').length}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>草稿列表</p>
            <h2>所有草稿</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              共 {filteredDrafts.length} 个草稿
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {drafts.length > 0 && (
              <button
                className="action-btn delete-btn" onClick={() => setDeleteConfirm('all')}>
                🗑️ 清空全部
              </button>
            )}
          </div>
        </div>

        <div className="category-tabs" style={{ margin: '0 0 20px 0' }}>
          {draftTypes.map((item) => (
            <button
              key={item.type}
              className={`category-tab ${filter === item.type ? 'active' : ''}`}
              style={
                filter === item.type && item.type !== 'all'
                  ? {
                      background: DRAFT_TYPE_COLORS[item.type as DraftType],
                      color: '#fff',
                      borderColor: DRAFT_TYPE_COLORS[item.type as DraftType],
                    }
                  : undefined
              }
              onClick={() => setFilter(item.type as DraftType | 'all')}
            >
              {item.label}
              <span className="tab-count">
                {item.type === 'all'
                  ? drafts.length
                  : drafts.filter((d) => d.type === item.type).length}
              </span>
            </button>
          ))}
        </div>

        {filteredDrafts.length === 0 ? (
          <div className="empty-state">
            <p>暂无草稿</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              编辑内容时系统会自动保存草稿，刷新页面后可在此恢复
            </p>
          </div>
        ) : (
          <div className="venue-list">
            {filteredDrafts.map((draft) => (
            <article key={draft.id} className="venue-card">
                <div className="venue-card-header">
                  <div>
                    <span
                      className="venue-type"
                      style={{
                        background: `color-mix(in srgb, ${DRAFT_TYPE_COLORS[draft.type]} 15%, #ffffff)`,
                        color: DRAFT_TYPE_COLORS[draft.type],
                      }}
                    >
                      {getDraftTypeIcon(draft.type)} {DRAFT_TYPE_LABELS[draft.type]}
                    </span>
                    <h3>{draft.title}</h3>
                    {draft.subtitle && (
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                        {draft.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="venue-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleContinue(draft)}
                    >
                      ✏️ 继续编辑
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => setDeleteConfirm(draft.id)}
                    >
                      🗑️ 丢弃
                    </button>
                  </div>
                </div>
                <div className="venue-info">
                  <div className="info-item">
                    <span className="info-label">创建时间</span>
                    <span className="info-value">
                      {new Date(draft.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">最后修改</span>
                    <span className="info-value">
                      {draftService.formatDate(draft.updatedAt)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>确认删除</h2>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>
              ×
            </button>
            </div>
            <div className="modal-body">
              <p>
                {deleteConfirm === 'all'
                  ? '确定要清空所有草稿吗？此操作不可撤销。'
                  : '确定要丢弃这个草稿吗？此操作不可撤销。'}
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteConfirm(null)}>
                取消
              </button>
              <button
                className="danger-btn"
                onClick={() => {
                  if (deleteConfirm === 'all') {
                    handleClearAll();
                  } else {
                    handleDelete(deleteConfirm);
                  }
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
