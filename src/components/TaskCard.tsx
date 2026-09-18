import type { OnboardingTask, TaskStatus } from '@/types';
import {
  MessageSquare,
  FileText,
  Github,
  Terminal,
  Network,
  Calendar,
  CheckCircle2,
  Clock,
  CircleDashed,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const iconMap: Record<string, typeof MessageSquare> = {
  MessageSquare,
  FileText,
  Github,
  Terminal,
  Network,
  Calendar,
};

const statusIcon: Record<TaskStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  'in-progress': Loader2,
  pending: Clock,
  'not-started': CircleDashed,
};

interface TaskCardProps {
  task: OnboardingTask;
  onAction?: (task: OnboardingTask) => void;
  justCompleted?: boolean;
}

export function TaskCard({ task, onAction, justCompleted }: TaskCardProps) {
  const Icon = iconMap[task.icon] || FileText;
  const StatusIcon = statusIcon[task.status];
  const isInteractive = task.status !== 'completed' && !!onAction;

  return (
    <div
      className={`
        group relative rounded-xl border bg-white p-4 transition-all duration-200 ease-smooth
        ${task.status === 'completed' ? 'border-neutral-200' : 'border-neutral-200 card-hover cursor-pointer'}
        ${justCompleted ? 'animate-success-pulse' : ''}
      `}
      onClick={() => isInteractive && onAction?.(task)}
    >
      <div className="flex items-start gap-3.5">
        {/* Task icon / status */}
        <div className="relative flex-shrink-0">
          <div
            className={`
              flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200
              ${task.status === 'completed'
                ? 'bg-success-50 text-success-600'
                : task.status === 'in-progress'
                ? 'bg-primary-50 text-primary-600'
                : task.status === 'pending'
                ? 'bg-warning-50 text-warning-600'
                : 'bg-neutral-100 text-neutral-400'
              }
              ${task.status !== 'completed' ? 'group-hover:scale-110' : ''}
            `}
          >
            {justCompleted ? (
              <CheckCircle2 size={20} className="animate-check-pop" />
            ) : task.status === 'in-progress' ? (
              <StatusIcon size={18} className="animate-spin-slow" />
            ) : (
              <Icon size={20} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${task.status === 'completed' ? 'text-neutral-500' : 'text-neutral-900'} transition-colors`}>
              {task.title}
            </h4>
            <span className="flex items-center gap-1 text-[11px] text-neutral-400 flex-shrink-0">
              <Clock size={11} />
              {task.duration}
            </span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed mb-2.5 line-clamp-2">{task.description}</p>
          <div className="flex items-center justify-between">
            <StatusBadge status={task.status} animate={justCompleted} />
            <div className="flex items-center gap-2">
              {task.status === 'completed' ? (
                <span className="text-[11px] text-success-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Done
                </span>
              ) : isInteractive ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {task.status === 'not-started' ? 'Start' : 'Continue'}
                  <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
