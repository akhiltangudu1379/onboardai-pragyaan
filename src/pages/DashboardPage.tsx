import { useState } from 'react';
import type { OnboardingTask, UserProfile } from '@/types';
import { TaskCard } from '@/components/TaskCard';
import { ProgressRing } from '@/components/ProgressRing';
import { CountUp } from '@/components/CountUp';
import { AccessRequestModal } from '@/components/AccessRequestModal';
import { Reveal } from '@/components/Reveal';
import {
  CheckCircle2,
  Clock,
  Loader2,
  CircleDashed,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardPageProps {
  user: UserProfile;
  tasks: OnboardingTask[];
  onTaskComplete: (id: string) => void;
  onNavigate: (page: 'assistant') => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshTasks?: () => void;
}

export function DashboardPage({ user, tasks, onTaskComplete, onNavigate, onToast, onRefreshTasks }: DashboardPageProps) {
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const notStarted = tasks.filter((t) => t.status === 'not-started').length;
  const total = tasks.length;
  const progress = Math.round((completed / total) * 100);

  const handleTaskAction = (task: OnboardingTask) => {
    if (task.link === 'access-request') {
      setAccessModalOpen(true);
    } else {
      // Simulate completing a non-access task
      setJustCompletedId(task.id);
      onTaskComplete(task.id);
      onToast(`Task completed: ${task.title}`, 'success');
      setTimeout(() => setJustCompletedId(null), 800);
    }
  };

  const handleAccessComplete = (requestId: string) => {
    const githubTask = tasks.find((t) => t.link === 'access-request');
    if (githubTask) {
      setJustCompletedId(githubTask.id);
      onTaskComplete(githubTask.id);
      onToast(`Access request created: ${requestId} (Demo / Simulated)`, 'success');
      setTimeout(() => setJustCompletedId(null), 800);
      // Refresh tasks from DB to reflect any agent-side updates
      onRefreshTasks?.();
    }
  };

  const stats = [
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'success' },
    { label: 'In Progress', value: inProgress, icon: Loader2, color: 'primary' },
    { label: 'Pending', value: pending, icon: Clock, color: 'warning' },
    { label: 'Not Started', value: notStarted, icon: CircleDashed, color: 'neutral' },
  ];

  const colorMap: Record<string, string> = {
    success: 'bg-success-50 text-success-600',
    primary: 'bg-primary-50 text-primary-600',
    warning: 'bg-warning-50 text-warning-600',
    neutral: 'bg-neutral-100 text-neutral-500',
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Welcome header */}
      <Reveal>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            Welcome, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-neutral-500">Here's your onboarding progress. You're doing great.</p>
        </div>
      </Reveal>

      {/* Progress overview */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Progress ring card */}
        <Reveal className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 h-full flex flex-col items-center justify-center">
            <ProgressRing progress={progress} size={140} strokeWidth={10} />
            <p className="text-sm font-medium text-neutral-700 mt-3">Overall Onboarding</p>
            <p className="text-xs text-neutral-400">{completed} of {total} tasks complete</p>
          </div>
        </Reveal>

        {/* Stats grid */}
        <Reveal delay={80} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 h-full">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col justify-between card-hover"
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorMap[stat.color]} mb-3`}>
                    <Icon size={20} className={stat.label === 'In Progress' ? 'animate-spin-slow' : ''} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">
                      <CountUp to={stat.value} />
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      {/* AI suggestion banner */}
      <Reveal delay={120}>
        <div className="group rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50/50 p-5 mb-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10"
          onClick={() => onNavigate('assistant')}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/20 flex-shrink-0 animate-float">
              <Sparkles size={22} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900">Ask the AI agent to help with your next task</p>
              <p className="text-xs text-neutral-600 mt-0.5">Get instant help with GitHub access, environment setup, and more.</p>
            </div>
            <ArrowUpRight size={18} className="text-primary-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0" />
          </div>
        </div>
      </Reveal>

      {/* Tasks list */}
      <Reveal delay={160}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Onboarding Tasks</h3>
          <span className="text-xs text-neutral-400">{total} total tasks</span>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 gap-3">
        {tasks.map((task, i) => (
          <Reveal key={task.id} delay={i * 60}>
            <TaskCard
              task={task}
              onAction={handleTaskAction}
              justCompleted={justCompletedId === task.id}
            />
          </Reveal>
        ))}
      </div>

      <AccessRequestModal
        open={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        onComplete={handleAccessComplete}
      />
    </div>
  );
}
