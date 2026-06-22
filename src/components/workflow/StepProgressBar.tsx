import { useWorkflow } from '../../context/WorkflowContext';
import {
  WORKFLOW_STEPS,
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEP_ICONS,
} from '../../types/workflow';
import type { WorkflowStep } from '../../types/workflow';

export function StepProgressBar() {
  const { state, goToStep, isStepCompleted } = useWorkflow();
  const currentIndex = WORKFLOW_STEPS.indexOf(state.currentStep);

  return (
    <div className="workflow-progress-bar">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = state.currentStep === step;
        const isCompleted = isStepCompleted(step);
        const isPast = index < currentIndex;
        const isClickable = isCompleted || isPast || index === currentIndex;

        return (
          <div
            key={step}
            className={`workflow-step ${isActive ? 'active' : ''} ${
              isCompleted ? 'completed' : ''
            } ${isPast ? 'past' : ''}`}
          >
            <button
              className="workflow-step-indicator"
              onClick={() => isClickable && goToStep(step as WorkflowStep)}
              disabled={!isClickable}
            >
              <span className="workflow-step-icon">
                {isCompleted ? '✓' : WORKFLOW_STEP_ICONS[step as WorkflowStep]}
              </span>
              <span className="workflow-step-number">{index + 1}</span>
            </button>
            <div className="workflow-step-content">
              <span className="workflow-step-label">
                {WORKFLOW_STEP_LABELS[step as WorkflowStep]}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`workflow-step-connector ${
                  isCompleted || isPast ? 'filled' : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
