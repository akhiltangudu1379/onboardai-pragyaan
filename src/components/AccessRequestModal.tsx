import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import {
  Search,
  ShieldCheck,
  UserCheck,
  FileCheck2,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface AccessRequestModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (requestId: string) => void;
}

const steps = [
  { id: 's1', label: 'Searching policy', icon: Search, tool: 'KnowledgeSearch', detail: 'Retrieved 3 relevant policy sections' },
  { id: 's2', label: 'Checking requirements', icon: ShieldCheck, tool: 'PolicyChecker', detail: '4/4 requirements verified' },
  { id: 's3', label: 'Finding approver', icon: UserCheck, tool: 'ApproverResolver', detail: 'Sarah Chen — ML Team Lead' },
  { id: 's4', label: 'Creating request', icon: FileCheck2, tool: 'RequestCreator', detail: 'Generating compliant request' },
];

export function AccessRequestModal({ open, onClose, onComplete }: AccessRequestModalProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentStep(-1);
      setCompletedSteps([]);
      setDone(false);
      return;
    }

    let stepIndex = 0;
    const advance = () => {
      if (stepIndex >= steps.length) {
        setDone(true);
        setTimeout(() => {
          onComplete('REQ-1042');
        }, 800);
        return;
      }
      const stepId = steps[stepIndex].id;
      setCurrentStep(stepIndex);
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepId]);
        stepIndex++;
        setTimeout(advance, 200);
      }, 350);
    };

    const startTimer = setTimeout(advance, 300);
    return () => clearTimeout(startTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={done ? onClose : () => {}} maxWidth="max-w-md" title="GitHub Access Request">
      {!done ? (
        <div className="space-y-1">
          <p className="text-sm text-neutral-500 mb-5">
            The AI agent is processing your access request through the approval workflow.
          </p>

          {/* Agent icon processing */}
          <div className="flex items-center justify-center py-4 mb-3">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary-100 animate-pulse-glow" />
              <div className="absolute inset-2 rounded-full border-2 border-primary-300/40 border-t-primary-500 animate-spin-slow" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-b-accent-400/40 animate-spin-reverse" />
              <Sparkles size={24} className="relative text-primary-600 animate-spark" />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(step.id);
              const isActive = currentStep === index && !isCompleted;
              const isPending = !isCompleted && !isActive;

              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300
                    ${isCompleted ? 'border-success-200 bg-success-50/50' : ''}
                    ${isActive ? 'border-primary-200 bg-primary-50/50' : ''}
                    ${isPending ? 'border-neutral-100 bg-neutral-50/30' : ''}
                  `}
                  style={{
                    opacity: isPending ? 0.5 : 1,
                    transform: isPending ? 'translateY(0)' : 'translateY(0)',
                  }}
                >
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-300
                      ${isCompleted ? 'bg-success-500 text-white' : ''}
                      ${isActive ? 'bg-primary-500 text-white' : ''}
                      ${isPending ? 'bg-neutral-200 text-neutral-400' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="animate-check-pop" />
                    ) : isActive ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isCompleted ? 'text-success-700' : isActive ? 'text-primary-700' : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {(isCompleted || isActive) && (
                      <p
                        className="text-[11px] text-neutral-500 animate-fade-in"
                        style={{ animationDuration: '200ms' }}
                      >
                        {isCompleted ? step.detail : `${step.tool}...`}
                      </p>
                    )}
                  </div>
                  {isCompleted && (
                    <span className="text-[10px] font-medium text-success-600 uppercase tracking-wide animate-fade-in">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Success state */
        <div className="text-center py-4">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 rounded-full bg-success-100 animate-success-pulse" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/20">
              <CheckCircle2 size={32} className="animate-check-pop" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-neutral-900 mb-1">Access Request Created</h3>
          <p className="text-sm text-neutral-500 mb-5">Your request has been submitted for approval.</p>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-left space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Request ID</span>
              <span className="text-sm font-semibold text-neutral-900 font-mono">REQ-1042</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 text-warning-700 text-xs font-medium px-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                Pending Team Lead Approval
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Approver</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-[10px] font-semibold">
                  SC
                </div>
                <span className="text-sm font-medium text-neutral-700">Sarah Chen</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-200 hover:bg-neutral-50 btn-press"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 btn-press group"
            >
              View Request
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
