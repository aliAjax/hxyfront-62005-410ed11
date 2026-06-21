import { useState, useEffect, useMemo } from 'react';
import type { MaintenanceTask, PipeRecord, AbnormalReason } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import { stopService } from '../services/stopService';
import { venueService } from '../services/venueService';
import type { Stop } from '../types/stops';
import type { Venue } from '../types/venue';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';
import { VENUE_TYPE_LABELS } from '../types/venue';

interface MaintenanceReportProps {
  taskId: string;
  onBack: () => void;
}

export function MaintenanceReport({ taskId, onBack }: MaintenanceReportProps) {
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [summary, setSummary] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    loadTask();
    setStops(stopService.getAll());
  }, [taskId]);

  const loadTask = () => {
    const loadedTask = maintenanceService.getById(taskId);
    if (loadedTask) {
      setTask(loadedTask);
      setSummary(loadedTask.reportSummary || '');
      setMaintenanceNotes(loadedTask.maintenanceNotes || '');
      setSummaryDraft(loadedTask.reportSummary || '');
      setNotesDraft(loadedTask.maintenanceNotes || '');
      if (loadedTask.venueId) {
        const v = venueService.getById(loadedTask.venueId);
        if (v) setVenue(v);
      }
    }
  };

  const isPipeCompleted = (pipe: PipeRecord): boolean => {
    return !!(pipe.pitch || pipe.centDeviation !== undefined || pipe.remarks);
  };

  const thStats = useMemo(() => {
    return maintenanceService.getTemperatureHumidityStats(taskId);
  }, [taskId, task]);

  const stopStats = useMemo(() => {
    return maintenanceService.getStopStats(taskId);
  }, [taskId, task]);

  const completedCount = useMemo(() => {
    if (!task) return 0;
    return task.pipeRecords.filter((p) => isPipeCompleted(p)).length;
  }, [task]);

  const abnormalPipes = useMemo(() => {
    if (!task) return [];
    return task.pipeRecords.filter((p) => maintenanceService.isPipeAbnormal(p));
  }, [task]);

  const totalCount = task ? task.pipeRecords.length : 0;

  const getStopName = (stopId?: string): string => {
    if (!stopId) return '--';
    const stop = stops.find((s) => s.id === stopId);
    return stop ? stopService.getDisplayLabel(stop) : '--';
  };

  const getStopCategory = (stopId?: string): string => {
    if (!stopId) return '';
    const stop = stops.find((s) => s.id === stopId);
    return stop ? STOP_CATEGORY_LABELS[stop.category] : '';
  };

  const getStopColor = (stopId?: string): string => {
    if (!stopId) return '#64748b';
    const stop = stops.find((s) => s.id === stopId);
    return stop ? STOP_CATEGORY_COLORS[stop.category] : '#64748b';
  };

  const getAbnormalReasons = (pipe: PipeRecord): AbnormalReason[] => {
    return maintenanceService.getAbnormalReasons(pipe);
  };

  const getReasonLabel = (reason: AbnormalReason): string => {
    return maintenanceService.getAbnormalReasonLabel(reason);
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveSummary = () => {
    maintenanceService.updateReportSummary(taskId, summaryDraft);
    setSummary(summaryDraft);
    setIsEditingSummary(false);
    loadTask();
  };

  const handleCancelSummary = () => {
    setSummaryDraft(summary);
    setIsEditingSummary(false);
  };

  const handleSaveNotes = () => {
    maintenanceService.updateMaintenanceNotes(taskId, notesDraft);
    setMaintenanceNotes(notesDraft);
    setIsEditingNotes(false);
    loadTask();
  };

  const handleCancelNotes = () => {
    setNotesDraft(maintenanceNotes);
    setIsEditingNotes(false);
  };

  const handlePrint = () => {
    window.print();
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

  return (
    <main className="app report-page">
      <section className="hero venue-hero report-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <p>维护报告 · {task.maintenanceDate}</p>
        <h1>{task.venueName}</h1>
        <span>
          参与人员：{task.participants} · 共 {totalCount} 支音管 · {stopStats.totalUniqueStops} 组音栓
        </span>
        {venue && (
          <span style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            {VENUE_TYPE_LABELS[venue.type]} · {venue.address}
          </span>
        )}
        <div className="report-actions">
          <button
            className="primary print-btn"
            onClick={handlePrint}
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            📄 打印 / 导出 PDF
          </button>
        </div>
      </section>

      <section className="panel report-summary-panel">
        <div className="heading">
          <div>
            <p>任务概览</p>
            <h2>维护摘要</h2>
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
            <span className="report-summary-label">音栓数量</span>
            <span className="report-summary-value" style={{ color: 'var(--accent)' }}>
              {stopStats.totalUniqueStops} 组
            </span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">已完成</span>
            <span className="report-summary-value" style={{ color: '#059669' }}>
              {completedCount} 支
            </span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">异常音管</span>
            <span className="report-summary-value" style={{ color: '#dc2626' }}>
              {abnormalPipes.length} 支
            </span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">完成率</span>
            <span className="report-summary-value">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>

        {stopStats.byStop.length > 0 && (
          <div className="report-stop-stats">
            <h3>音栓明细统计</h3>
            <div className="stop-stats-grid">
              {stopStats.byStop.map((stat, idx) => (
                <div key={idx} className="stop-stat-card">
                  <span
                    className="stop-category"
                    style={{
                      background: `color-mix(in srgb, ${getStopColor(stat.stopId)} 15%, #ffffff)`,
                      color: getStopColor(stat.stopId),
                    }}
                  >
                    {getStopCategory(stat.stopId)} · {stat.stopName}
                  </span>
                  <div className="stop-stat-numbers">
                    <span className="stop-stat-count">{stat.count} 支</span>
                    {stat.abnormalCount > 0 && (
                      <span className="stop-stat-abnormal">{stat.abnormalCount} 异常</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel report-editable-panel">
        <div className="heading">
          <div>
            <p>编辑区</p>
            <h2>报告摘要（可编辑）</h2>
          </div>
          {!isEditingSummary ? (
            <button className="secondary-btn report-edit-btn no-print" onClick={() => setIsEditingSummary(true)}>
              ✏️ 编辑摘要
            </button>
          ) : (
            <div className="report-edit-actions no-print">
              <button onClick={handleCancelSummary}>取消</button>
              <button className="primary" onClick={handleSaveSummary}>保存</button>
            </div>
          )}
        </div>
        {isEditingSummary ? (
          <textarea
            className="report-editable-textarea"
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            placeholder="在此输入本次维护工作的整体摘要，例如维护范围、重点工作、整体情况等..."
            rows={5}
          />
        ) : (
          <div className="report-editable-content">
            {summary ? (
              <p>{summary}</p>
            ) : (
              <p className="report-empty-hint">暂无摘要，点击右上角「编辑摘要」添加本次维护的整体说明。</p>
            )}
          </div>
        )}
      </section>

      {thStats.count > 0 && (
        <section className="panel report-th-panel">
          <div className="heading">
            <div>
              <p>环境监测</p>
              <h2>温湿度记录</h2>
            </div>
          </div>
          <div className="report-th-grid">
            <div className="report-th-card">
              <span className="report-th-label">最高温度</span>
              <span className="report-th-value temp-high">
                {thStats.maxTemp?.toFixed(1)}°C
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">最低温度</span>
              <span className="report-th-value temp-low">
                {thStats.minTemp?.toFixed(1)}°C
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">最高湿度</span>
              <span className="report-th-value humidity-high">
                {thStats.maxHumidity?.toFixed(0)}%
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">最低湿度</span>
              <span className="report-th-value humidity-low">
                {thStats.minHumidity?.toFixed(0)}%
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">最后一次读数</span>
              <span className="report-th-value">
                {thStats.latest?.temperature.toFixed(1)}°C / {thStats.latest?.humidity.toFixed(0)}%
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">记录次数</span>
              <span className="report-th-value">
                {thStats.count} 次
              </span>
            </div>
          </div>

          {task.temperatureHumidityRecords && task.temperatureHumidityRecords.length > 0 && (
            <div className="report-th-timeline">
              <h3>温湿度记录时间线</h3>
              <div className="th-timeline">
                {[...task.temperatureHumidityRecords]
                  .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
                  .map((record, index) => (
                    <div key={record.id} className={`th-timeline-item ${index === 0 ? 'latest' : ''}`}>
                      <div className="th-timeline-dot"></div>
                      <div className="th-timeline-content">
                        <div className="th-timeline-time">
                          {formatDateTime(record.recordedAt)}
                          {index === 0 && <span className="latest-badge">📍 最新</span>}
                        </div>
                        <div className="th-timeline-values">
                          <span className="th-temp">{record.temperature.toFixed(1)}°C</span>
                          <span className="th-humidity">{record.humidity.toFixed(0)}%</span>
                        </div>
                        {record.note && <div className="th-timeline-note">{record.note}</div>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel report-abnormal-panel">
        <div className="heading">
          <div>
            <p>异常明细</p>
            <h2>异常音管表</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              共 {abnormalPipes.length} 支异常音管
            </p>
          </div>
        </div>
        {abnormalPipes.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <p>✅ 本次维护未发现异常音管</p>
          </div>
        ) : (
          <div className="report-pipe-table">
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>音管编号</th>
                  <th>音栓</th>
                  <th>音高</th>
                  <th>音分偏差</th>
                  <th>温度</th>
                  <th>湿度</th>
                  <th>簧片状态</th>
                  <th>异常原因</th>
                  <th>维修备注</th>
                </tr>
              </thead>
              <tbody>
                {abnormalPipes.map((pipe, index) => {
                  const reasons = getAbnormalReasons(pipe);
                  return (
                    <tr key={pipe.id} className="abnormal-row">
                      <td>{index + 1}</td>
                      <td><strong>{pipe.pipeNumber}</strong></td>
                      <td>
                        {pipe.stopId ? (
                          <span
                            className="stop-category"
                            style={{
                              background: `color-mix(in srgb, ${getStopColor(pipe.stopId)} 15%, #ffffff)`,
                              color: getStopColor(pipe.stopId),
                            }}
                          >
                            {getStopCategory(pipe.stopId)} · {getStopName(pipe.stopId)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td>{pipe.pitch || '--'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>
                        {pipe.centDeviation !== undefined
                          ? `${pipe.centDeviation > 0 ? '+' : ''}${pipe.centDeviation} cent`
                          : '--'}
                      </td>
                      <td>{pipe.temperature !== undefined ? `${pipe.temperature}°C` : '--'}</td>
                      <td>{pipe.humidity !== undefined ? `${pipe.humidity}%` : '--'}</td>
                      <td>
                        {pipe.reedStatus ? (
                          <span
                            className={pipe.reedStatus !== '正常' ? 'abnormal-badge' : ''}
                            style={pipe.reedStatus === '正常' ? { background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 } : undefined}
                          >
                            {pipe.reedStatus}
                          </span>
                        ) : '--'}
                      </td>
                      <td>
                        <div className="reason-tags">
                          {reasons.map((reason) => (
                            <span key={reason} className={`reason-tag reason-${reason}`}>
                              {getReasonLabel(reason)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{pipe.remarks || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel report-pipes-panel">
        <div className="heading">
          <div>
            <p>调音详情</p>
            <h2>音管调音记录</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              共 {totalCount} 支音管，已完成 {completedCount} 支
            </p>
          </div>
        </div>
        <div className="report-pipe-table">
          <table>
            <thead>
              <tr>
                <th>状态</th>
                <th>音管编号</th>
                <th>音栓</th>
                <th>音高</th>
                <th>音分偏差</th>
                <th>温度</th>
                <th>湿度</th>
                <th>簧片状态</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {task.pipeRecords.map((pipe) => {
                const completed = isPipeCompleted(pipe);
                const isAbnormal = maintenanceService.isPipeAbnormal(pipe);
                return (
                  <tr key={pipe.id} className={isAbnormal ? 'abnormal-row' : ''}>
                    <td>
                      <span className={`pipe-status-badge ${completed ? 'done' : 'todo'}`}>
                        {completed ? '已完成' : '待调音'}
                      </span>
                    </td>
                    <td><strong>{pipe.pipeNumber}</strong></td>
                    <td>
                      {pipe.stopId ? (
                        <span
                          className="stop-category"
                          style={{
                            background: `color-mix(in srgb, ${getStopColor(pipe.stopId)} 15%, #ffffff)`,
                            color: getStopColor(pipe.stopId),
                          }}
                        >
                          {getStopCategory(pipe.stopId)} · {getStopName(pipe.stopId)}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td>{pipe.pitch || '--'}</td>
                    <td style={{ color: isAbnormal ? '#dc2626' : undefined, fontWeight: isAbnormal ? 600 : undefined }}>
                      {pipe.centDeviation !== undefined
                        ? `${pipe.centDeviation > 0 ? '+' : ''}${pipe.centDeviation} cent`
                        : '--'}
                    </td>
                    <td>{pipe.temperature !== undefined ? `${pipe.temperature}°C` : '--'}</td>
                    <td>{pipe.humidity !== undefined ? `${pipe.humidity}%` : '--'}</td>
                    <td>{pipe.reedStatus || '--'}</td>
                    <td>{pipe.remarks || '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel report-editable-panel">
        <div className="heading">
          <div>
            <p>维修备注</p>
            <h2>维修备注（可编辑）</h2>
          </div>
          {!isEditingNotes ? (
            <button className="secondary-btn report-edit-btn no-print" onClick={() => setIsEditingNotes(true)}>
              ✏️ 编辑备注
            </button>
          ) : (
            <div className="report-edit-actions no-print">
              <button onClick={handleCancelNotes}>取消</button>
              <button className="primary" onClick={handleSaveNotes}>保存</button>
            </div>
          )}
        </div>
        {isEditingNotes ? (
          <textarea
            className="report-editable-textarea"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="在此输入本次维护的详细维修备注，例如更换部件、调整措施、遗留问题、下次维护建议等..."
            rows={6}
          />
        ) : (
          <div className="report-editable-content">
            {maintenanceNotes ? (
              <p>{maintenanceNotes}</p>
            ) : (
              <p className="report-empty-hint">暂无维修备注，点击右上角「编辑备注」添加详细维修说明。</p>
            )}
          </div>
        )}
      </section>

      <section className="panel report-footer-panel">
        <div className="report-footer">
          <div>
            <p>报告生成时间</p>
            <strong>{new Date().toLocaleString('zh-CN')}</strong>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p>维护人员签字</p>
            <strong style={{ color: '#94a3b8' }}>____________</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>场馆负责人确认</p>
            <strong style={{ color: '#94a3b8' }}>____________</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
