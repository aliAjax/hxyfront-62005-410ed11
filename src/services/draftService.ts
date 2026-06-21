import type { Draft, DraftType, VenueDraft, MaintenanceTaskDraft, TuningRecordDraft, MaintenanceReportDraft } from '../types/draft';

const STORAGE_KEY = 'organ_tuning_drafts';

export const draftService = {
  getAll(): Draft[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const drafts = JSON.parse(data);
      return drafts.sort((a: Draft, b: Draft) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch {
      return [];
    }
  },

  getById(id: string): Draft | undefined {
    const drafts = this.getAll();
    return drafts.find((d) => d.id === id);
  },

  getByType(type: DraftType): Draft[] {
    return this.getAll().filter((d) => d.type === type);
  },

  getVenueDraft(editingId?: string): VenueDraft | undefined {
    const drafts = this.getByType('venue') as VenueDraft[];
    return drafts.find((d) => d.editingId === editingId || (!editingId && !d.editingId));
  },

  getMaintenanceTaskDraft(): MaintenanceTaskDraft | undefined {
    const drafts = this.getByType('maintenance_task') as MaintenanceTaskDraft[];
    return drafts[0];
  },

  getTuningRecordDraft(taskId: string): TuningRecordDraft | undefined {
    const drafts = this.getByType('tuning_record') as TuningRecordDraft[];
    return drafts.find((d) => d.data.taskId === taskId);
  },

  getMaintenanceReportDraft(taskId: string): MaintenanceReportDraft | undefined {
    const drafts = this.getByType('maintenance_report') as MaintenanceReportDraft[];
    return drafts.find((d) => d.data.taskId === taskId);
  },

  saveVenueDraft(data: VenueDraft['data'], editingId?: string): VenueDraft {
    const drafts = this.getAll();
    const now = new Date().toISOString();
    const existingIndex = drafts.findIndex(
      (d) => d.type === 'venue' && (d as VenueDraft).editingId === editingId
    );

    const draft: VenueDraft = {
      id: existingIndex >= 0 ? drafts[existingIndex].id : `draft-${Date.now()}`,
      type: 'venue',
      title: data.name || '未命名场馆',
      subtitle: data.type ? (data.type === 'church' ? '教堂' : data.type === 'concert_hall' ? '音乐厅' : '其他') : undefined,
      data,
      editingId,
      createdAt: existingIndex >= 0 ? drafts[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return draft;
  },

  saveMaintenanceTaskDraft(data: MaintenanceTaskDraft['data'], venueName?: string): MaintenanceTaskDraft {
    const drafts = this.getAll();
    const now = new Date().toISOString();
    const existingIndex = drafts.findIndex((d) => d.type === 'maintenance_task');

    const draft: MaintenanceTaskDraft = {
      id: existingIndex >= 0 ? drafts[existingIndex].id : `draft-${Date.now()}`,
      type: 'maintenance_task',
      title: venueName || '未命名维护任务',
      subtitle: data.maintenanceDate || undefined,
      data,
      createdAt: existingIndex >= 0 ? drafts[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return draft;
  },

  saveTuningRecordDraft(data: TuningRecordDraft['data']): TuningRecordDraft {
    const drafts = this.getAll();
    const now = new Date().toISOString();
    const existingIndex = drafts.findIndex(
      (d) => d.type === 'tuning_record' && (d as TuningRecordDraft).data.taskId === data.taskId
    );

    const completedCount = data.pipeRecords.filter(
      (p) => p.pitch || p.centDeviation !== undefined || p.remarks
    ).length;

    const draft: TuningRecordDraft = {
      id: existingIndex >= 0 ? drafts[existingIndex].id : `draft-${Date.now()}`,
      type: 'tuning_record',
      title: data.venueName || '调音记录',
      subtitle: `${completedCount}/${data.pipeRecords.length} 已完成`,
      data,
      createdAt: existingIndex >= 0 ? drafts[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return draft;
  },

  saveMaintenanceReportDraft(data: MaintenanceReportDraft['data']): MaintenanceReportDraft {
    const drafts = this.getAll();
    const now = new Date().toISOString();
    const existingIndex = drafts.findIndex(
      (d) => d.type === 'maintenance_report' && (d as MaintenanceReportDraft).data.taskId === data.taskId
    );

    const draft: MaintenanceReportDraft = {
      id: existingIndex >= 0 ? drafts[existingIndex].id : `draft-${Date.now()}`,
      type: 'maintenance_report',
      title: data.venueName || '维护报告',
      subtitle: data.reportSummary ? data.reportSummary.slice(0, 30) + (data.reportSummary.length > 30 ? '...' : '') : undefined,
      data,
      createdAt: existingIndex >= 0 ? drafts[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return draft;
  },

  delete(id: string): boolean {
    const drafts = this.getAll();
    const filtered = drafts.filter((d) => d.id !== id);
    if (filtered.length === drafts.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  deleteVenueDraft(editingId?: string): boolean {
    const drafts = this.getAll();
    const filtered = drafts.filter(
      (d) => !(d.type === 'venue' && (d as VenueDraft).editingId === editingId)
    );
    if (filtered.length === drafts.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  deleteMaintenanceTaskDraft(): boolean {
    const drafts = this.getAll();
    const filtered = drafts.filter((d) => d.type !== 'maintenance_task');
    if (filtered.length === drafts.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  deleteTuningRecordDraft(taskId: string): boolean {
    const drafts = this.getAll();
    const filtered = drafts.filter(
      (d) => !(d.type === 'tuning_record' && (d as TuningRecordDraft).data.taskId === taskId)
    );
    if (filtered.length === drafts.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  deleteMaintenanceReportDraft(taskId: string): boolean {
    const drafts = this.getAll();
    const filtered = drafts.filter(
      (d) => !(d.type === 'maintenance_report' && (d as MaintenanceReportDraft).data.taskId === taskId)
    );
    if (filtered.length === drafts.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCount(): number {
    return this.getAll().length;
  },

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};
