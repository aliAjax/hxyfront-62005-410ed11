import { useState, useEffect } from 'react';
import type { Stop, StopFormData, StopCategory } from '../types/stops';
import {
  STOP_CATEGORY_LABELS,
  STOP_CATEGORY_COLORS,
  DEFAULT_STOP_FORM_DATA,
  COMMON_FOOT_MARKS,
} from '../types/stops';
import { stopService } from '../services/stopService';

interface StopManagementProps {
  onBack: () => void;
}

export function StopManagement({ onBack }: StopManagementProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [formData, setFormData] = useState<StopFormData>(DEFAULT_STOP_FORM_DATA);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<StopCategory | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadStops();
  }, []);

  const loadStops = () => {
    setStops(stopService.getAll());
  };

  const handleAdd = () => {
    setEditingStop(null);
    setFormData(DEFAULT_STOP_FORM_DATA);
    setShowForm(true);
  };

  const handleEdit = (stop: Stop) => {
    setEditingStop(stop);
    setFormData({
      name: stop.name,
      category: stop.category,
      footMark: stop.footMark,
      remarks: stop.remarks,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (stopService.delete(id)) {
      loadStops();
    }
    setDeleteConfirm(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStop) {
      stopService.update(editingStop.id, formData);
    } else {
      stopService.create(formData);
    }
    loadStops();
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredStops = stops.filter((stop) => {
    const matchCategory = activeCategory === 'all' || stop.category === activeCategory;
    const matchKeyword =
      !searchKeyword ||
      stop.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      stop.footMark.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      stop.remarks.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchCategory && matchKeyword;
  });

  const categories: (StopCategory | 'all')[] = ['all', 'principal', 'reed', 'mixture', 'bourdon'];

  const getStopsByCategory = (category: StopCategory | 'all') => {
    if (category === 'all') return stops;
    return stops.filter((s) => s.category === category);
  };

  return (
    <main className="app">
      <section className="hero venue-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <p>音栓资料库</p>
        <h1>音栓资料库</h1>
        <span>集中管理管风琴音栓的标准名称、英尺标记和分类信息。建立统一的音栓资料库后，在新增调音记录时可直接选择音栓，避免重复输入。</span>
      </section>

      <section className="metrics">
        <article>
          <small>音栓总数</small>
          <strong>{stops.length}</strong>
        </article>
        <article style={{ borderTopColor: STOP_CATEGORY_COLORS.principal }}>
          <small>主音栓</small>
          <strong style={{ color: STOP_CATEGORY_COLORS.principal }}>
            {getStopsByCategory('principal').length}
          </strong>
        </article>
        <article style={{ borderTopColor: STOP_CATEGORY_COLORS.reed }}>
          <small>簧片音栓</small>
          <strong style={{ color: STOP_CATEGORY_COLORS.reed }}>
            {getStopsByCategory('reed').length}
          </strong>
        </article>
        <article style={{ borderTopColor: STOP_CATEGORY_COLORS.mixture }}>
          <small>混合/低音管</small>
          <strong style={{ color: STOP_CATEGORY_COLORS.mixture }}>
            {getStopsByCategory('mixture').length + getStopsByCategory('bourdon').length}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>音栓列表</p>
            <h2>全部音栓</h2>
          </div>
          <div className="heading-actions">
            <input
              type="text"
              placeholder="🔍 搜索音栓名称/英尺/备注"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="search-input"
              style={{ width: '240px', marginRight: '10px' }}
            />
            <button className="primary" onClick={handleAdd}>
              + 新增音栓
            </button>
          </div>
        </div>

        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
              style={
                activeCategory === cat && cat !== 'all'
                  ? {
                      background: STOP_CATEGORY_COLORS[cat],
                      color: '#fff',
                      borderColor: STOP_CATEGORY_COLORS[cat],
                    }
                  : undefined
              }
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? '全部' : STOP_CATEGORY_LABELS[cat]}
              <span className="tab-count">{getStopsByCategory(cat).length}</span>
            </button>
          ))}
        </div>

        {filteredStops.length === 0 ? (
          <div className="empty-state">
            <p>{searchKeyword ? '未找到匹配的音栓' : '暂无音栓资料'}</p>
            <button
              className="primary"
              onClick={searchKeyword ? () => setSearchKeyword('') : handleAdd}
            >
              {searchKeyword ? '清除搜索' : '添加第一个音栓'}
            </button>
          </div>
        ) : (
          <div className="stop-list">
            {filteredStops.map((stop) => (
              <article key={stop.id} className="stop-card">
                <div className="stop-card-header">
                  <div>
                    <span
                      className={`stop-category ${stop.category}`}
                      style={{
                        background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[stop.category]} 15%, #ffffff)`,
                        color: STOP_CATEGORY_COLORS[stop.category],
                      }}
                    >
                      {STOP_CATEGORY_LABELS[stop.category]}
                    </span>
                    <h3>
                      {stop.name}
                      {stop.footMark && (
                        <span className="foot-mark">{stop.footMark}</span>
                      )}
                    </h3>
                  </div>
                  <div className="stop-actions">
                    <button onClick={() => handleEdit(stop)} className="action-btn edit-btn">
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(stop.id)}
                      className="action-btn delete-btn"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {stop.remarks && (
                  <p className="stop-remarks">
                    <strong>备注：</strong>
                    {stop.remarks}
                  </p>
                )}

                <div className="stop-meta">
                  <span>显示名称：<code>{stopService.getDisplayLabel(stop)}</code></span>
                </div>

                {deleteConfirm === stop.id && (
                  <div className="delete-confirm">
                    <p>确定要删除「{stopService.getDisplayLabel(stop)}」吗？此操作不可撤销。</p>
                    <div className="confirm-actions">
                      <button onClick={() => setDeleteConfirm(null)}>取消</button>
                      <button className="danger-btn" onClick={() => handleDelete(stop.id)}>
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStop ? '编辑音栓' : '新增音栓'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="field-grid">
                <label>
                  <span>音栓名称 *</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="如：Principal / Trumpet / Bourdon"
                    required
                  />
                </label>

                <label>
                  <span>音栓分类</span>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {(Object.keys(STOP_CATEGORY_LABELS) as StopCategory[]).map((key) => (
                      <option key={key} value={key}>
                        {STOP_CATEGORY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full-width">
                  <span>英尺标记</span>
                  <div className="foot-mark-selector">
                    <input
                      type="text"
                      name="footMark"
                      value={formData.footMark}
                      onChange={handleInputChange}
                      placeholder="如：8' / 4' / 16' 等，可选择下方快速选项"
                    />
                    <div className="foot-mark-chips">
                      {COMMON_FOOT_MARKS.map((mark) => (
                        <button
                          key={mark}
                          type="button"
                          className={`foot-mark-chip ${formData.footMark === mark ? 'active' : ''}`}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, footMark: mark }))
                          }
                        >
                          {mark}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>

                <label className="full-width">
                  <span>备注</span>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="请输入音栓的音色特点、使用场景等备注信息"
                    rows={3}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)}>
                  取消
                </button>
                <button type="submit" className="primary">
                  {editingStop ? '保存修改' : '创建音栓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
