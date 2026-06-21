import { useState, useEffect } from 'react';
import "./styles.css";
import { VenueManagement } from './components/VenueManagement';
import { StopManagement } from './components/StopManagement';
import { MaintenanceTaskCreate } from './components/MaintenanceTaskCreate';
import { TuningRecordView } from './components/TuningRecordView';
import { venueService } from './services/venueService';
import { stopService } from './services/stopService';
import type { Venue } from './types/venue';
import type { StopCategory } from './types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from './types/stops';

type Page = 'workspace' | 'venues' | 'stops' | 'create-task' | 'tuning-record';

const project = {
  "sourceNo": 7,
  "id": "hxyfront-62005",
  "port": 62005,
  "title": "管风琴音管调音记录",
  "domain": "管风琴维护",
  "prompt": "做一个给管风琴维护人员使用的音管调音记录前端项目，可以记录教堂或音乐厅名称、音栓、音管编号、音高、音分偏差、温湿度、簧片状态和维修备注。页面需要有音栓列表、调音偏差表、温湿度记录、异常音管标记和单次维护报告页。",
  "palette": [
    "#854d0e",
    "#475569",
    "#0ea5e9"
  ],
  "metrics": [
    "音栓数量",
    "偏差超限",
    "温度",
    "湿度"
  ],
  "filters": [
    "主音栓",
    "簧片音栓",
    "混合音栓",
    "低音管"
  ],
  "fields": [
    "场馆名称",
    "温度",
    "湿度",
    "音栓",
    "音管编号",
    "音高",
    "音分偏差",
    "维修备注"
  ],
  "records": [
    [
      "St.Mary",
      "Trumpet 8'",
      "C#4 +9cent",
      "簧片需微调"
    ],
    [
      "ConcertHall A",
      "Principal 4'",
      "G3 -3cent",
      "正常"
    ],
    [
      "Abbey Room",
      "Bourdon 16'",
      "F2 -12cent",
      "标记复检"
    ]
  ]
};

const CATEGORY_FILTER_MAP: Record<string, StopCategory> = {
  '主音栓': 'principal',
  '簧片音栓': 'reed',
  '混合音栓': 'mixture',
  '低音管': 'bourdon',
};

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('workspace');
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [stops, setStops] = useState<{ id: string; label: string; category: StopCategory }[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<StopCategory | 'all'>('all');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVenues();
    loadStops();
  }, [currentPage]);

  const loadVenues = () => {
    setVenues(venueService.getVenueNames());
  };

  const loadStops = () => {
    setStops(stopService.getAllDisplayLabels());
  };

  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    if (venueId) {
      const venue = venueService.getById(venueId);
      if (venue) {
        setFormValues((prev) => ({
          ...prev,
          '场馆名称': venue.name,
          '温度': venue.defaultTemperature.toString(),
          '湿度': venue.defaultHumidity.toString(),
        }));
      }
    }
  };

  const handleStopSelect = (stopId: string) => {
    setSelectedStopId(stopId);
    if (stopId) {
      const stop = stops.find((s) => s.id === stopId);
      if (stop) {
        setFormValues((prev) => ({
          ...prev,
          '音栓': stop.label,
        }));
      }
    } else {
      setFormValues((prev) => ({
        ...prev,
        '音栓': '',
      }));
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterClick = (filterName: string) => {
    const category = CATEGORY_FILTER_MAP[filterName];
    if (category) {
      setActiveFilter((prev) => (prev === category ? 'all' : category));
    }
  };

  const getFilteredStops = () => {
    if (activeFilter === 'all') return stops;
    return stops.filter((s) => s.category === activeFilter);
  };

  if (currentPage === 'venues') {
    return <VenueManagement onBack={() => setCurrentPage('workspace')} />;
  }

  if (currentPage === 'stops') {
    return <StopManagement onBack={() => setCurrentPage('workspace')} />;
  }

  if (currentPage === 'create-task') {
    return (
      <MaintenanceTaskCreate
        onBack={() => setCurrentPage('workspace')}
        onTaskCreated={(taskId) => {
          setCurrentTaskId(taskId);
          setCurrentPage('tuning-record');
        }}
      />
    );
  }

  if (currentPage === 'tuning-record' && currentTaskId) {
    return (
      <TuningRecordView
        taskId={currentTaskId}
        onBack={() => setCurrentPage('workspace')}
      />
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <p>{project.id} · 源提示词{project.sourceNo} · Port {project.port}</p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {project.metrics.map((metric: string, index: number) => (
          <article key={metric}>
            <small>{metric}</small>
            <strong>{[86, 14, 7, 32][index] ?? 12}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>{project.domain}筛选</h2>
          <div className="chips">
            {project.filters.map((item: string) => {
              const category = CATEGORY_FILTER_MAP[item];
              const isActive = activeFilter === category;
              return (
                <button
                  key={item}
                  className={isActive ? 'active' : ''}
                  style={
                    isActive
                      ? {
                          background: STOP_CATEGORY_COLORS[category],
                          color: '#fff',
                          borderColor: STOP_CATEGORY_COLORS[category],
                        }
                      : undefined
                  }
                  onClick={() => handleFilterClick(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
          {activeFilter !== 'all' && (
            <button className="clear-filter-btn" onClick={() => setActiveFilter('all')}>
              ✕ 清除筛选
            </button>
          )}

          <h2 style={{ marginTop: '24px' }}>快速入口</h2>
          <div className="quick-actions">
            <button className="primary full-width" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => setCurrentPage('create-task')}>
              📋 创建维护任务
            </button>
            <button className="primary full-width" style={{ marginTop: '10px' }} onClick={() => setCurrentPage('venues')}>
              🏛️ 场馆档案管理
            </button>
            <button className="primary full-width" style={{ marginTop: '10px', background: STOP_CATEGORY_COLORS.principal, borderColor: STOP_CATEGORY_COLORS.principal }} onClick={() => setCurrentPage('stops')}>
              🎵 音栓资料库
            </button>
          </div>

          {stops.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h2>可用音栓 ({getFilteredStops().length})</h2>
              <div className="stop-reference-list">
                {getFilteredStops().length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px', padding: '8px 0' }}>当前分类下暂无音栓</p>
                ) : (
                  getFilteredStops().map((stop) => (
                    <div
                      key={stop.id}
                      className={`stop-reference-item ${selectedStopId === stop.id ? 'selected' : ''}`}
                      onClick={() => handleStopSelect(selectedStopId === stop.id ? '' : stop.id)}
                      style={
                        selectedStopId === stop.id
                          ? {
                              borderColor: STOP_CATEGORY_COLORS[stop.category],
                              background: `color-mix(in srgb, ${STOP_CATEGORY_COLORS[stop.category]} 10%, #ffffff)`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="stop-dot"
                        style={{ background: STOP_CATEGORY_COLORS[stop.category] }}
                      />
                      <div style={{ flex: 1 }}>
                        <span className="stop-ref-name">{stop.label}</span>
                        <span className="stop-ref-category">
                          {STOP_CATEGORY_LABELS[stop.category]}
                        </span>
                      </div>
                      {selectedStopId === stop.id && <span className="stop-check">✓</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        <section className="panel form-panel">
          <div className="heading">
            <div>
              <p>专业字段</p>
              <h2>新增记录</h2>
            </div>
            <button className="primary">保存草稿</button>
          </div>
          <div className="field-grid">
            <label className="full-width">
              <span>选择场馆</span>
              <select
                value={selectedVenueId}
                onChange={(e) => handleVenueSelect(e.target.value)}
              >
                <option value="">-- 请选择已有场馆（自动回填信息）--</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-width">
              <span>选择音栓（从资料库中选择）</span>
              <div className="stop-selector-wrapper">
                <select
                  value={selectedStopId}
                  onChange={(e) => handleStopSelect(e.target.value)}
                >
                  <option value="">-- 从资料库选择音栓（自动回填名称+英尺）--</option>
                  {stops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      [{STOP_CATEGORY_LABELS[stop.category]}] {stop.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setCurrentPage('stops')}
                >
                  管理音栓 →
                </button>
              </div>
            </label>
            {project.fields.map((field: string) => {
              if (field === '音栓') {
                return (
                  <label key={field} className="full-width">
                    <span>{field}（可直接编辑）</span>
                    <input
                      placeholder={"填写" + field}
                      value={formValues[field] || ''}
                      onChange={(e) => {
                        handleFieldChange(field, e.target.value);
                        if (selectedStopId) {
                          const stop = stops.find((s) => s.id === selectedStopId);
                          if (stop && stop.label !== e.target.value) {
                            setSelectedStopId('');
                          }
                        }
                      }}
                    />
                  </label>
                );
              }
              return (
                <label key={field}>
                  <span>{field}</span>
                  <input
                    placeholder={"填写" + field}
                    value={formValues[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>历史记录</p>
            <h2>近期工作台</h2>
          </div>
          <button>导出摘要</button>
        </div>
        <div className="records">
          {project.records.map((record: string[], index: number) => (
            <article key={record.join("-")}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <h3>{record[0]}</h3>
                <p>{record.slice(1).join(" · ")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
