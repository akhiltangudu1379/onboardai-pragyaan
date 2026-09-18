import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ActivityEvent, SourceCitation, WorkflowStep } from '@/types';
import { AgentIcon } from '@/components/AgentIcon';
import { callAgent, type AgentResult } from '@/lib/agent';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserCheck,
  FileCheck2,
  ArrowRight,
  BookOpen,
  Clock,
  Activity,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';

interface AssistantPageProps {
  activity: ActivityEvent[];
  onActivityAdd: (event: ActivityEvent) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onTasksChanged?: () => void;
  onActivityChanged?: () => void;
}

const suggestions = [
  'What is the security training requirement?',
  'Request GitHub access for me',
  'What do I have left to complete?',
  'Who do I contact for laptop problems?',
  'I just joined the ML team. Help me get everything ready.',
  'How do I get GitHub access?',
];

const processingSteps = [
  { id: 'p1', label: 'Understanding request', icon: Sparkles },
  { id: 'p2', label: 'Searching organizational knowledge', icon: Search },
  { id: 'p3', label: 'Checking policy', icon: ShieldCheck },
  { id: 'p4', label: 'Finding responsible person', icon: UserCheck },
  { id: 'p5', label: 'Preparing action', icon: FileCheck2 },
];

export function AssistantPage({ activity, onActivityAdd, onToast, onTasksChanged, onActivityChanged }: AssistantPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processing]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || processing) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setProcessing(true);
    setActiveStepIndex(-1);
    setCompletedSteps([]);

    let stepIdx = 0;
    let advanceTimer: ReturnType<typeof setTimeout> | null = null;

    const advanceStep = () => {
      if (stepIdx >= processingSteps.length) return;
      const stepId = processingSteps[stepIdx].id;
      setActiveStepIndex(stepIdx);
      advanceTimer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepId]);
        stepIdx++;
        advanceTimer = setTimeout(advanceStep, 100);
      }, 280);
    };

    setTimeout(advanceStep, 200);

    try {
      const result: AgentResult = await callAgent(text);

      if (advanceTimer) clearTimeout(advanceTimer);

      setCompletedSteps(processingSteps.map((s) => s.id));
      setActiveStepIndex(-1);

      const agentMsg: ChatMessage = {
        id: `m${Date.now() + 1}`,
        role: 'agent',
        content: result.greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        response: result,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setProcessing(false);
      setCompletedSteps([]);

      if (result.activity && result.activity.length > 0) {
        result.activity.forEach((act, i) => {
          setTimeout(() => {
            onActivityAdd({
              id: `a${Date.now()}-${i}`,
              icon: act.icon || 'CheckCircle2',
              title: act.title,
              description: act.description,
              timestamp: 'Just now',
              status: act.status,
              tool: act.tool,
              detail: act.detail,
            });
          }, i * 200);
        });
      }

      if (result.taskUpdate) {
        onTasksChanged?.();
        onToast(`Task updated: ${result.taskUpdate.newStatus}`, 'success');
      }

      if (result.accessRequest) {
        onToast(`Access request ${result.accessRequest.requestId} created — pending approval`, 'success');
      }

      onActivityChanged?.();
      onToast('Response ready', 'success');
    } catch (err) {
      if (advanceTimer) clearTimeout(advanceTimer);
      setProcessing(false);
      setActiveStepIndex(-1);
      setCompletedSteps([]);

      const errorMsg = err instanceof Error ? err.message : 'Failed to get a response';
      setError(errorMsg);

      const agentMsg: ChatMessage = {
        id: `m${Date.now() + 1}`,
        role: 'agent',
        content: `I encountered an error while processing your request. ${errorMsg}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
      onToast('Request failed', 'error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && !processing && (
              <EmptyChatState onSuggestion={sendMessage} />
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="mb-6">
                {msg.role === 'user' ? (
                  <UserMessage message={msg} />
                ) : (
                  <AgentMessage message={msg} onSelectSource={setSelectedSource} />
                )}
              </div>
            ))}

            {processing && (
              <ProcessingState
                activeStepIndex={activeStepIndex}
                completedSteps={completedSteps}
              />
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 mb-4 animate-fade-in">
                <AlertCircle size={16} className="text-error-500 flex-shrink-0" />
                <p className="text-sm text-error-700">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-neutral-200 bg-white px-4 lg:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition-all duration-200 focus-within:border-primary-300 focus-within:bg-white">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask the AI agent anything..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none resize-none max-h-24 py-1"
                disabled={processing}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || processing}
                className="btn-press flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500 text-white transition-all duration-200 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">
              OnboardAI can help with access requests, policy questions, and onboarding tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Activity panel */}
      <ActivityPanel
        activity={activity}
        hoveredActivity={hoveredActivity}
        onHover={setHoveredActivity}
      />

      {/* Source preview modal */}
      {selectedSource && (
        <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}
    </div>
  );
}

function EmptyChatState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AgentIcon size={72} state="idle" className="mb-6" />
      <h3 className="text-xl font-bold text-neutral-900 mb-2">How can I help you get started?</h3>
      <p className="text-sm text-neutral-500 mb-8 max-w-sm">
        I can help with access requests, policy questions, and your onboarding tasks.
      </p>
      <div className="grid sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="group flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 text-left transition-all duration-200 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm btn-press"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Sparkles size={15} className="text-primary-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
            <span className="flex-1">{s}</span>
            <ArrowRight size={13} className="text-neutral-300 group-hover:text-primary-500 transition-all duration-200 group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end animate-fade-in-up">
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary-500 text-white px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 text-right">{message.timestamp}</p>
      </div>
    </div>
  );
}

function AgentMessage({ message, onSelectSource }: { message: ChatMessage; onSelectSource: (s: SourceCitation) => void }) {
  const [visibleSections, setVisibleSections] = useState(0);
  const resp = message.response;

  useEffect(() => {
    if (!resp) return;
    const timers: number[] = [];
    [1, 2, 3, 4, 5].forEach((n) => {
      timers.push(window.setTimeout(() => setVisibleSections(n), n * 150));
    });
    return () => timers.forEach(clearTimeout);
  }, [resp]);

  if (!resp) {
    return (
      <div className="flex gap-3 animate-fade-in-up">
        <AgentIcon size={36} state="ready" />
        <div className="flex-1">
          <p className="text-sm text-neutral-700 leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  const hasChecklist = resp.checklist.length > 0;
  const hasWorkflow = resp.workflow.steps.length > 0;
  const hasSources = resp.sources.length > 0;

  return (
    <div className="flex gap-3 animate-fade-in-up">
      <AgentIcon size={36} state="ready" className="flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-3">
        {visibleSections >= 1 && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-900">{resp.greeting}</p>
              {resp.mode && (
                <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                  resp.mode === 'ai'
                    ? 'text-success-700 bg-success-50 border-success-200'
                    : 'text-neutral-500 bg-neutral-100 border-neutral-200'
                }`}>
                  {resp.mode === 'ai' ? 'AI' : 'Demo'}
                </span>
              )}
            </div>
          </div>
        )}

        {visibleSections >= 2 && (
          <div className="animate-fade-in-up">
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{resp.summary}</p>
            </div>
          </div>
        )}

        {hasChecklist && visibleSections >= 3 && (
          <div className="animate-fade-in-up rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Requirements Checklist</p>
            <div className="space-y-2">
              {resp.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${item.done ? 'bg-success-500 text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                    {item.done && <CheckCircle2 size={12} />}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-neutral-500 line-through' : 'text-neutral-700'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasWorkflow && visibleSections >= 4 && (
          <div className="animate-fade-in-up rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50/50 to-accent-50/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck2 size={16} className="text-primary-600" />
              <p className="text-sm font-semibold text-neutral-900">{resp.workflow.title}</p>
            </div>
            <div className="space-y-1.5">
              {resp.workflow.steps.map((step) => (
                <WorkflowStepRow key={step.id} step={step} />
              ))}
            </div>
            {resp.workflow.requestId && (
              <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Request ID</span>
                <span className="text-sm font-mono font-semibold text-primary-700">{resp.workflow.requestId}</span>
              </div>
            )}
            {resp.workflow.status && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Status</span>
                <span className="text-xs font-medium text-warning-700 bg-warning-50 border border-warning-200 rounded-full px-2 py-0.5">
                  {resp.workflow.status}
                </span>
              </div>
            )}
          </div>
        )}

        {hasSources && visibleSections >= 5 && (
          <div className="animate-fade-in-up">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Sources</p>
            <div className="space-y-1.5">
              {resp.sources.map((source) => (
                <SourceCard key={source.id} source={source} onSelect={onSelectSource} />
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-neutral-400 pt-1">{message.timestamp}</p>
      </div>
    </div>
  );
}

function WorkflowStepRow({ step }: { step: WorkflowStep }) {
  const isCompleted = step.state === 'completed';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 transition-all duration-300 ${isCompleted ? 'bg-success-500 text-white' : 'bg-neutral-200 text-neutral-400'}`}>
        {isCompleted ? <CheckCircle2 size={12} className="animate-check-pop" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>
      <span className={`text-sm ${isCompleted ? 'text-neutral-700' : 'text-neutral-400'}`}>{step.label}</span>
    </div>
  );
}

function SourceCard({ source, onSelect }: { source: SourceCitation; onSelect: (s: SourceCitation) => void }) {
  return (
    <button
      onClick={() => onSelect(source)}
      className="group w-full flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition-all duration-200 hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 transition-all duration-200 group-hover:bg-primary-100 group-hover:text-primary-600 flex-shrink-0">
        <BookOpen size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{source.title}</p>
        <p className="text-[11px] text-neutral-500 truncate">{source.description}</p>
      </div>
      <ArrowRight size={13} className="text-neutral-300 group-hover:text-primary-500 transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
    </button>
  );
}

function SourceModal({ source, onClose }: { source: SourceCitation; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 animate-fade-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '200ms' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 truncate">{source.title}</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">{source.description}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-80 overflow-y-auto">
          {source.sectionContent ? (
            <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3">
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{source.sectionContent}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ExternalLink size={24} className="text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-500">No preview available for this source.</p>
              <p className="text-[11px] text-neutral-400 mt-1">Contact your admin to view the full document.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">{source.type}</span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProcessingState({ activeStepIndex, completedSteps }: { activeStepIndex: number; completedSteps: string[] }) {
  return (
    <div className="flex gap-3 animate-fade-in">
      <AgentIcon size={36} state="processing" className="flex-shrink-0" />
      <div className="flex-1">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
          {processingSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStepIndex === index && !isCompleted;
            const isPending = !isCompleted && !isActive;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2.5 transition-all duration-300 ${
                  isPending ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 transition-all duration-300 ${
                    isCompleted ? 'bg-success-500 text-white' : isActive ? 'bg-primary-500 text-white' : 'bg-neutral-200 text-neutral-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} className="animate-check-pop" />
                  ) : isActive ? (
                    <Icon size={13} className="animate-pulse" />
                  ) : (
                    <Icon size={13} />
                  )}
                </div>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isCompleted ? 'text-success-700' : isActive ? 'text-primary-700 font-medium' : 'text-neutral-400'
                  }`}
                >
                  {step.label}{isActive ? '...' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivityPanel({
  activity,
  hoveredActivity,
  onHover,
}: {
  activity: ActivityEvent[];
  hoveredActivity: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-50/50 flex flex-col">
      <div className="px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-neutral-900">Agent Activity</h3>
        </div>
        <p className="text-[11px] text-neutral-500 mt-0.5">Real-time agent actions</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {activity.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AgentIcon size={40} state="idle" className="mb-3" />
            <p className="text-xs text-neutral-400">No activity yet</p>
          </div>
        )}

        {activity.map((event) => {
          const isHovered = hoveredActivity === event.id;
          return (
            <div
              key={event.id}
              onMouseEnter={() => onHover(event.id)}
              onMouseLeave={() => onHover(null)}
              className="group relative rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition-all duration-200 hover:border-primary-200 hover:shadow-sm cursor-default"
            >
              <div className="flex items-start gap-2.5">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
                  event.status === 'completed' ? 'bg-success-50 text-success-600' : 'bg-primary-50 text-primary-600'
                }`}>
                  {event.status === 'completed' ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 truncate">{event.title}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{event.description}</p>
                  <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                    <Clock size={9} />
                    {event.timestamp}
                  </p>

                  {isHovered && event.detail && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 animate-fade-in-up" style={{ animationDuration: '150ms' }}>
                      <p className="text-[10px] font-medium text-neutral-600">{event.tool}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{event.detail}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
