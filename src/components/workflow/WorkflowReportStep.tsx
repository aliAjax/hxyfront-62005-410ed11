import { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { stopService } from '../../services/stopService';
import { venueService } from '../../services/venueService';
import type { Stop } from '../../types/stops';
import type { Venue } from '../../types/venue';
import { STOP_CATEGORY_LABELS, STOP_CATEGORY_COLORS } from '../../types/stops';
import { VENUE_TYPE_LABELS } from '../../types/venue';
import type { WorkflowPipeData } from '../../types/workflow';

interface AbnormalPipeView {
  pipeNumber: string;
  data: WorkflowPipeData;
  reasons: ('deviation' | 'reed_adjust' | 'recheck_mark')[];
}

const REASON_LABELS: Record<'deviation' | 'reed_adjust' | 'recheck_mark', string> = {
  deviation: '音分偏差超限',
  reed_adjust: '簧片需微调',
  recheck_mark: '标记复检',
};

export function WorkflowReportStep() {
  const { state, setState, prevStep, finalizeAndSave } = useWorkflow();
  const [stops] = useState<Stop[]>(() => stopService.getAll());
  const [venues] = useState<Venue[]>(() => venueService.getAll());
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(state.reportSummary);
  const [notesDraft, setNotesDraft] = useState(state.maintenanceNotes);
  const [showConfirmFinalize, setShowConfirmFinalize] = useState(false);
  const [finalizedTaskId, setFinalizedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setSummaryDraft(state.reportSummary);
  }, [state.reportSummary]);

  useEffect(() => {
    setNotesDraft(state.maintenanceNotes);
  }, [state.maintenanceNotes]);

  const getAbnormalReasons = (data: WorkflowPipeData): ('deviation' | 'reed_adjust' | 'recheck_mark')[] => {
    const reasons: ('deviation' | 'reed_adjust' | 'recheck_mark')[] = [];
    if (data.centDeviation !== undefined && Math.abs(data.centDeviation) > 5) {
      reasons.push('deviation');
    }
    if (data.reedStatus === '需微调') {
      reasons.push('reed_adjust');
    }
    if (data.remarks && (data.remarks.includes('复检') || data.remarks.includes('标记复检') || data.remarks.includes('需复检'))) {
      reasons.push('recheck_mark');
    }
    return reasons;
  };

  const isPipeCompleted = (pipeNumber: string): boolean => {
    const d = state.pipeData[pipeNumber];
    return !!(d?.pitch || d?.centDeviation !== undefined || d?.remarks);
  };

  const completedCount = useMemo(() => {
    return state.pipeNumbers.filter(isPipeCompleted).length;
  }, [state.pipeNumbers, state.pipeData]);

  const abnormalPipes = useMemo<AbnormalPipeView[]>(() => {
    const result: AbnormalPipeView[] = [];
    for (const pipeNumber of state.pipeNumbers) {
      const data = state.pipeData[pipeNumber] || {};
      const reasons = getAbnormalReasons(data);
      if (reasons.length > 0) {
        result.push({ pipeNumber, data, reasons });
      }
    }
    return result;
  }, [state.pipeNumbers, state.pipeData]);

  const thStats = useMemo(() => {
    const records = state.temperatureHumidityRecords;
    if (records.length === 0) {
      return {
        maxTemp: undefined,
        minTemp: undefined,
        maxHumidity: undefined,
        minHumidity: undefined,
        latest: undefined,
        count: 0,
      };
    }
    const temperatures = records.map((r) => r.temperature);
    const humidities = records.map((r) => r.humidity);
    const latest = [...records].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )[0];
    return {
      maxTemp: Math.max(...temperatures),
      minTemp: Math.min(...temperatures),
      maxHumidity: Math.max(...humidities),
      minHumidity: Math.min(...humidities),
      latest,
      count: records.length,
    };
  }, [state.temperatureHumidityRecords]);

  const stopStats = useMemo(() => {
    const stopMap = new Map<
      string,
      { stopId?: string; stopName: string; count: number; abnormalCount: number }
    >();

    for (const pipeNumber of state.pipeNumbers) {
      const data = state.pipeData[pipeNumber] || {};
      const key = data.stopId || '__no_stop__';
      const displayName = data.stopName
        ? data.stopName
        : data.stopId
          ? `音栓#${data.stopId}`
          : '未指定音栓';

      if (!stopMap.has(key)) {
        stopMap.set(key, {
          stopId: data.stopId,
          stopName: displayName,
          count: 0,
          abnormalCount: 0,
        });
      }

      const entry = stopMap.get(key)!;
      entry.count++;
      if (getAbnormalReasons(data).length > 0) {
        entry.abnormalCount++;
      }
    }

    const byStop = Array.from(stopMap.values()).sort((a, b) => b.count - a.count);
    return {
      totalUniqueStops: byStop.filter((s) => s.stopId).length,
      byStop,
    };
  }, [state.pipeNumbers, state.pipeData]);

  const totalCount = state.pipeNumbers.length;
  const currentVenue = venues.find((v) => v.id === state.venueId);

  const getStopDisplay = (stopId?: string, stopName?: string): { stop?: Stop; label: string } => {
    if (!stopId) return { label: stopName || '--' };
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return { label: stopName || '--' };
    return { stop, label: stopService.getDisplayLabel(stop) };
  };

  const handleSaveSummary = () => {
    setState((prev) => ({ ...prev, reportSummary: summaryDraft }));
    setIsEditingSummary(false);
  };

  const handleCancelSummary = () => {
    setSummaryDraft(state.reportSummary);
    setIsEditingSummary(false);
  };

  const handleSaveNotes = () => {
    setState((prev) => ({ ...prev, maintenanceNotes: notesDraft }));
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesDraft(state.maintenanceNotes);
    setIsEditingNotes(false);
  };

  const handleFinalize = () => {
    const task = finalizeAndSave();
    if (task) {
      setFinalizedTaskId(task.id);
    }
    setShowConfirmFinalize(false);
  };

  const handlePrint = () => {
    window.print();
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

  if (finalizedTaskId) {
    return (
      <div className="workflow-step-content">
        <div className="panel" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ margin: '0 0 12px 0' }}>维护任务已完成！</h2>
          <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>
            任务 ID：{finalizedTaskId}
            <br />
            数据已保存至本地历史记录中
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="primary" onClick={handlePrint}>
              📄 打印报告
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-step-content report-page">
      <div className="panel report-summary-panel">
        <div className="heading">
          <div>
            <p>任务概览</p>
            <h2>维护摘要报告</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              {state.venueName} · {state.maintenanceDate} · 参与人员：{state.participants}
              {currentVenue && ` · ${VENUE_TYPE_LABELS[currentVenue.type]}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="primary print-btn no-print"
              onClick={handlePrint}
              style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              📄 打印 / 导出 PDF
            </button>
          </div>
        </div>

        <div
          className="workflow-alert no-print"
          style={{
            padding: '10px 14px',
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1e40af',
            marginBottom: '20px',
          }}
        >
          💡 <strong>提示：</strong>
          返回上一步修改调音偏差或温湿度后，异常统计、音栓统计和报告数据会自动重新计算，手写的报告摘要和维修备注不会丢失。
        </div>

        <div className="report-summary-grid">
          <div className="report-summary-item">
            <span className="report-summary-label">场馆</span>
            <span className="report-summary-value">{state.venueName}</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">维护日期</span>
            <span className="report-summary-value">{state.maintenanceDate}</span>
          </div>
          <div className="report-summary-item">
            <span className="report-summary-label">参与人员</span>
            <span className="report-summary-value">{state.participants}</span>
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
              {stopStats.byStop.map((stat, idx) => {
                const { stop } = getStopDisplay(stat.stopId, stat.stopName);
                const color = stop ? STOP_CATEGORY_COLORS[stop.category] : '#64748b';
                const category = stop ? STOP_CATEGORY_LABELS[stop.category] : '';
                return (
                  <div key={idx} className="stop-stat-card">
                    <span
                      className="stop-category"
                      style={{
                        background: `color-mix(in srgb, ${color} 15%, #ffffff)`,
                        color,
                      }}
                    >
                      {category ? `${category} · ` : ''}
                      {stat.stopName}
                    </span>
                    <div className="stop-stat-numbers">
                      <span className="stop-stat-count">{stat.count} 支</span>
                      {stat.abnormalCount > 0 && (
                        <span className="stop-stat-abnormal">
                          {stat.abnormalCount} 异常
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="panel report-editable-panel no-print">
        <div className="heading">
          <div>
            <p>编辑区</p>
            <h2>报告摘要（可编辑，修改其他步骤后自动保留）</h2>
          </div>
          {!isEditingSummary ? (
            <button
              className="secondary-btn report-edit-btn"
              onClick={() => setIsEditingSummary(true)}
            >
              ✏️ 编辑摘要
            </button>
          ) : (
            <div className="report-edit-actions">
              <button onClick={handleCancelSummary}>取消</button>
              <button className="primary" onClick={handleSaveSummary}>
                保存
              </button>
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
            {state.reportSummary ? (
              <p>{state.reportSummary}</p>
            ) : (
              <p className="report-empty-hint">
                暂无摘要，点击右上角「编辑摘要」添加本次维护的整体说明。
              </p>
            )}
          </div>
        )}
      </div>

      {thStats.count > 0 && (
        <div className="panel report-th-panel">
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
                {thStats.latest?.temperature.toFixed(1)}°C /{' '}
                {thStats.latest?.humidity.toFixed(0)}%
              </span>
            </div>
            <div className="report-th-card">
              <span className="report-th-label">记录次数</span>
              <span className="report-th-value">{thStats.count} 次</span>
            </div>
          </div>

          {state.temperatureHumidityRecords.length > 0 && (
            <div className="report-th-timeline no-print">
              <h3>温湿度记录时间线</h3>
              <div className="th-timeline">
                {[...state.temperatureHumidityRecords]
                  .sort(
                    (a, b) =>
                      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
                  )
                  .map((record, index) => (
                    <div
                      key={record.id}
                      className={`th-timeline-item ${index === 0 ? 'latest' : ''}`}
                    >
                      <div className="th-timeline-dot"></div>
                      <div className="th-timeline-content">
                        <div className="th-timeline-time">
                          {formatDateTime(record.recordedAt)}
                          {index === 0 && (
                            <span className="latest-badge">📍 最新</span>
                          )}
                        </div>
                        <div className="th-timeline-values">
                          <span className="th-temp">
                            {record.temperature.toFixed(1)}°C
                          </span>
                          <span className="th-humidity">
                            {record.humidity.toFixed(0)}%
                          </span>
                        </div>
                        {record.note && (
                          <div className="th-timeline-note">{record.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="panel report-abnormal-panel">
        <div className="heading">
          <div>
            <p>异常明细</p>
            <h2>异常音管表</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              共 {abnormalPipes.length} 支异常音管
              {abnormalPipes.some((p) => p.data.reinspected) &&
                `，已复检 ${abnormalPipes.filter((p) => p.data.reinspected).length} 支`}
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
                  <th>复检状态</th>
                  <th>维修备注</th>
                </tr>
              </thead>
              <tbody>
                {abnormalPipes.map((info, index) => {
                  const { stop, label } = getStopDisplay(
                    info.data.stopId,
                    info.data.stopName
                  );
                  const color = stop ? STOP_CATEGORY_COLORS[stop.category] : '#64748b';
                  const category = stop ? STOP_CATEGORY_LABELS[stop.category] : '';
                  return (
                    <tr key={info.pipeNumber} className="abnormal-row">
                      <td>{index + 1}</td>
                      <td>
                        <strong>{info.pipeNumber}</strong>
                      </td>
                      <td>
                        {stop || info.data.stopName ? (
                          <span
                            className="stop-category"
                            style={{
                              background: `color-mix(in srgb, ${color} 15%, #ffffff)`,
                              color,
                            }}
                          >
                            {category ? `${category} · ` : ''}
                            {label}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td>{info.data.pitch || '--'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>
                        {info.data.centDeviation !== undefined
                          ? `${info.data.centDeviation > 0 ? '+' : ''}${info.data.centDeviation} cent`
                          : '--'}
                      </td>
                      <td>
                        {info.data.temperature !== undefined
                          ? `${info.data.temperature}°C`
                          : '--'}
                      </td>
                      <td>
                        {info.data.humidity !== undefined
                          ? `${info.data.humidity}%`
                          : '--'}
                      </td>
                      <td>
                        {info.data.reedStatus ? (
                          <span
                            className={
                              info.data.reedStatus !== '正常'
                                ? 'abnormal-badge'
                                : ''
                            }
                            style={
                              info.data.reedStatus === '正常'
                                ? {
                                    background: '#d1fae5',
                                    color: '#065f46',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                  }
                                : undefined
                            }
                          >
                            {info.data.reedStatus}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td>
                        <div className="reason-tags">
                          {info.reasons.map((reason) => (
                            <span
                              key={reason}
                              className={`reason-tag reason-${reason}`}
                            >
                              {REASON_LABELS[reason]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {info.data.reinspected ? (
                          <span
                            style={{
                              background: '#d1fae5',
                              color: '#065f46',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            ✓ 已复检
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            待复检
                          </span>
                        )}
                      </td>
                      <td>{info.data.remarks || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel report-pipes-panel">
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
              {state.pipeNumbers.map((pipeNumber) => {
                const data = state.pipeData[pipeNumber] || {};
                const completed = isPipeCompleted(pipeNumber);
                const isAbnormal = getAbnormalReasons(data).length > 0;
                const { stop, label } = getStopDisplay(data.stopId, data.stopName);
                const color = stop ? STOP_CATEGORY_COLORS[stop.category] : '#64748b';
                const category = stop ? STOP_CATEGORY_LABELS[stop.category] : '';
                return (
                  <tr
                    key={pipeNumber}
                    className={isAbnormal ? 'abnormal-row' : ''}
                  >
                    <td>
                      <span
                        className={`pipe-status-badge ${completed ? 'done' : 'todo'}`}
                      >
                        {completed ? '已完成' : '待调音'}
                      </span>
                    </td>
                    <td>
                      <strong>{pipeNumber}</strong>
                    </td>
                    <td>
                      {stop || data.stopName ? (
                        <span
                          className="stop-category"
                          style={{
                            background: `color-mix(in srgb, ${color} 15%, #ffffff)`,
                            color,
                          }}
                        >
                          {category ? `${category} · ` : ''}
                          {label}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td>{data.pitch || '--'}</td>
                    <td
                      style={{
                        color: isAbnormal ? '#dc2626' : undefined,
                        fontWeight: isAbnormal ? 600 : undefined,
                      }}
                    >
                      {data.centDeviation !== undefined
                        ? `${data.centDeviation > 0 ? '+' : ''}${data.centDeviation} cent`
                        : '--'}
                    </td>
                    <td>
                      {data.temperature !== undefined ? `${data.temperature}°C` : '--'}
                    </td>
                    <td>
                      {data.humidity !== undefined ? `${data.humidity}%` : '--'}
                    </td>
                    <td>{data.reedStatus || '--'}</td>
                    <td>{data.remarks || '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel report-editable-panel no-print">
        <div className="heading">
          <div>
            <p>维修备注</p>
            <h2>维修备注（可编辑，修改其他步骤后自动保留）</h2>
          </div>
          {!isEditingNotes ? (
            <button
              className="secondary-btn report-edit-btn"
              onClick={() => setIsEditingNotes(true)}
            >
              ✏️ 编辑备注
            </button>
          ) : (
            <div className="report-edit-actions">
              <button onClick={handleCancelNotes}>取消</button>
              <button className="primary" onClick={handleSaveNotes}>
                保存
              </button>
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
            {state.maintenanceNotes ? (
              <p>{state.maintenanceNotes}</p>
            ) : (
              <p className="report-empty-hint">
                暂无维修备注，点击右上角「编辑备注」添加详细维修说明。
              </p>
            )}
          </div>
        )}
      </div>

      <div className="panel report-footer-panel">
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
      </div>

      <div className="workflow-nav-footer no-print">
        <button onClick={prevStep}>← 上一步：异常音管复检</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="primary"
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            onClick={() => setShowConfirmFinalize(true)}
          >
            💾 完成并保存任务
          </button>
        </div>
      </div>

      {showConfirmFinalize && (
        <div className="modal-overlay" onClick={() => setShowConfirmFinalize(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            <div className="modal-header">
              <h2>确认完成维护任务</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowConfirmFinalize(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                完成后本次维护任务的所有数据将被保存到历史记录中，工作流草稿将被清除。
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 提示：您仍可通过工作台的「调音记录」和「维护报告」功能查看和编辑此任务。
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowConfirmFinalize(false)}>取消</button>
              <button className="primary" onClick={handleFinalize}>
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
