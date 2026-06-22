import { useState, useEffect } from 'react';
import { WorkflowProvider, useWorkflow, WORKFLOW_STORAGE_KEY } from '../../context/WorkflowContext';
import { StepProgressBar } from './StepProgressBar';
import { WorkflowVenueStep } from './WorkflowVenueStep';
import { WorkflowStopsStep } from './WorkflowStopsStep';
import { WorkflowDeviationStep } from './WorkflowDeviationStep';
import { WorkflowEnvironmentStep } from './WorkflowEnvironmentStep';
import { WorkflowReinspectionStep } from './WorkflowReinspectionStep';
import { WorkflowReportStep } from './WorkflowReportStep';
import { WORKFLOW_STEP_LABELS } from '../../types/workflow';

interface MaintenanceWorkflowProps {
  onBack: () => void;
  onTaskFinalized?: (taskId: string) => void;
}

function WorkflowContent({ onBack, onTaskFinalized }: MaintenanceWorkflowProps) {
  const { state, resetWorkflow, goToStep } = useWorkflow();
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);

  useEffect(() => {
    const hasData =
      state.venueId ||
      state.pipeNumbers.length > 0 ||
      state.temperatureHumidityRecords.length > 0 ||
      state.reportSummary ||
      state.maintenanceNotes;
    if (hasData && !state.lastSavedAt) {
      const saved = localStorage.getItem(WORKFLOW_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.lastSavedAt) {
            setShowRestoreDraft(true);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleBack = () => {
    const hasData =
      state.venueId ||
      state.pipeNumbers.length > 0 ||
      state.temperatureHumidityRecords.length > 0 ||
      state.reportSummary ||
      state.maintenanceNotes;

    if (hasData) {
      setShowAbandonConfirm(true);
    } else {
      onBack();
    }
  };

  const handleAbandon = () => {
    resetWorkflow();
    setShowAbandonConfirm(false);
    onBack();
  };

  return (
    <main className="app workflow-app">
      <section className="hero venue-hero workflow-hero">
        <button className="back-btn" onClick={handleBack}>
          ← 返回工作台
        </button>
        <p>维护任务工作流</p>
        <h1>管风琴维护任务</h1>
        <span>
          按照步骤依次完成：场馆选择 → 音栓资料 → 调音偏差录入 → 温湿度采集 → 异常音管复检
          → 报告生成
        </span>
        {state.lastSavedAt && (
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '13px' }}>
            💾 自动保存于{' '}
            {new Date(state.lastSavedAt).toLocaleString('zh-CN')} · 当前步骤：
            {WORKFLOW_STEP_LABELS[state.currentStep]}
          </p>
        )}
      </section>

      <StepProgressBar />

      {state.currentStep === 'venue' && <WorkflowVenueStep />}
      {state.currentStep === 'stops' && <WorkflowStopsStep />}
      {state.currentStep === 'deviation' && <WorkflowDeviationStep />}
      {state.currentStep === 'environment' && <WorkflowEnvironmentStep />}
      {state.currentStep === 'reinspection' && <WorkflowReinspectionStep />}
      {state.currentStep === 'report' && (
        <WorkflowReportStep />
      )}

      {showAbandonConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowAbandonConfirm(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div className="modal-header">
              <h2>确认离开工作流</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAbandonConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                您当前正在进行中的维护任务工作流数据会自动保存到本地草稿中，下次从工作台点击「新建维护任务」时可以继续。
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 如果希望彻底清除所有未完成的数据，请点击「放弃草稿并离开」。
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAbandonConfirm(false)}>继续工作</button>
              <button onClick={handleAbandon} style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                放弃草稿并离开
              </button>
              <button
                className="primary"
                onClick={() => {
                  setShowAbandonConfirm(false);
                  onBack();
                }}
              >
                保存草稿后离开
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreDraft && (
        <div
          className="modal-overlay"
          onClick={() => setShowRestoreDraft(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div className="modal-header">
              <h2>发现未完成的维护任务</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowRestoreDraft(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0' }}>
                检测到上次未完成的维护任务草稿，是否继续上次的工作？
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 草稿仅保存在本地浏览器中
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  resetWorkflow();
                  goToStep('venue');
                  setShowRestoreDraft(false);
                }}
              >
                重新开始
              </button>
              <button
                className="primary"
                onClick={() => setShowRestoreDraft(false)}
              >
                继续上次工作
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function MaintenanceWorkflow(props: MaintenanceWorkflowProps) {
  return (
    <WorkflowProvider>
      <WorkflowContent {...props} />
    </WorkflowProvider>
  );
}
