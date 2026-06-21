import { useState, useEffect, useMemo } from 'react';
import type { MaintenanceTask, PipeRecord } from '../types/maintenance';
import { maintenanceService } from '../services/maintenanceService';
import { stopService } from '../services/stopService';
import type { Stop } from '../types/stops';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../types/stops';

interface MaintenanceReportProps {
  taskId: string;
  onBack: () => void;
}

export function MaintenanceReport({ taskId, onBack }: MaintenanceReportProps) {
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    loadTask();
    setStops(stopService.getAll());
  }, [taskId]);

  const loadTask = () => {
    const loadedTask = maintenanceService.getById(taskId);
    if (loadedTask) {
      setTask(loadedTask);
    }
  };

  const isPipeCompleted = (pipe: PipeRecord): boolean => {
    return !!(pipe.pitch || pipe.centDeviation !== undefined || pipe.remarks);
  };

  const thStats = useMemo(() => {
    return maintenanceService.getTemperatureHumidityStats(taskId);
  }, [taskId, task]);

  const completedCount = useMemo(() => {
    if (!task) return 0;
    return task.pipeRecords.filter((p) => isPipeCompleted(p)).length;
  }, [task]);

  const deviationCount = useMemo(() => {
    if (!task) return 0;
    return task.pipeRecords.filter((p) => p.centDeviation !== undefined && Math.abs(p.centDeviation) > 5).length;
  }, [task]);

  const abnormalPipes = useMemo(() => {
    if (!task) return [];
    return task.pipeRecords.filter((p) => p.centDeviation !== undefined && Math.abs(p.centDeviation) > 5);
  }, [task]);

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

  const totalCount = task.pipeRecords.length;

  return (
    <main className="app report-page">
      <section className="hero venue-hero report-hero">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <p>维护报告 · {task.maintenanceDate}</p>
        <h1>{task.venueName}</h1>
        <span>
          参与人员：{task.participants} · 共 {totalCount} 支音管
        </span>
        <div className="report-actions">
          <button
            className="primary print-btn"
            onClick={() => window.print()}
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            📄 打印报告
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
            <span className="report-summary-label">已完成</span>
            <span className="report-summary-value" style={{ color: '#059669' }}>
              {completedCount} 支
            </span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">偏差超限</span>
            <span className="report-summary-value" style={{ color: '#dc2626' }}>
              {deviationCount} 支
            </span>
          </div>
        </div>
      </section>

      {thStats.count > 0 && (
        <section className="panel report-th-panel">
          <div className="heading">
            <div>
              <p>环境监测</p>
              <h2>温湿度统计</h2>
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

      {abnormalPipes.length > 0 && (
        <section className="panel report-abnormal-panel">
          <div className="heading">
            <div>
              <p>异常提醒</p>
              <h2>偏差超限音管</h2>
            </div>
          </div>
          <div className="report-pipe-table">
            <table>
              <thead>
                <tr>
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
                {abnormalPipes.map((pipe) => (
                  <tr key={pipe.id} className="abnormal-row">
                    <td><strong>{pipe.pipeNumber}</strong></td>
                    <td>
                      <span
                        className="stop-category"
                        style={{
                          background: `color-mix(in srgb, ${getStopColor(pipe.stopId)} 15%, #ffffff)`,
                          color: getStopColor(pipe.stopId),
                        }}
                      >
                        {getStopCategory(pipe.stopId)} · {getStopName(pipe.stopId)}
                      </span>
                    </td>
                    <td>{pipe.pitch || '--'}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>
                      {pipe.centDeviation !== undefined
                        ? `${pipe.centDeviation > 0 ? '+' : ''}${pipe.centDeviation} cent`
                        : '--'}
                    </td>
                    <td>{pipe.temperature !== undefined ? `${pipe.temperature}°C` : '--'}</td>
                    <td>{pipe.humidity !== undefined ? `${pipe.humidity}%` : '--'}</td>
                    <td>{pipe.reedStatus || '--'}</td>
                    <td>{pipe.remarks || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                const isAbnormal = pipe.centDeviation !== undefined && Math.abs(pipe.centDeviation) > 5;
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

      <section className="panel report-footer-panel">
        <div className="report-footer">
          <div>
            <p>报告生成时间</p>
            <strong>{new Date().toLocaleString('zh-CN')}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>维护人员签字</p>
            <strong style={{ color: '#94a3b8' }}>____________</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
