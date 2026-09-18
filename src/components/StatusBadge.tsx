import type { TaskStatus } from '@/types';

const config: Record<TaskStatus, { label: string; classes: string; dot: string }> = {
  completed: {
    label: 'Completed',
    classes: 'bg-success-50 text-success-700 border-success-200',
    dot: 'bg-success-500',
  },
  'in-progress': {
    label: 'In Progress',
    classes: 'bg-primary-50 text-primary-700 border-primary-200',
    dot: 'bg-primary-500',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-warning-50 text-warning-700 border-warning-200',
    dot: 'bg-warning-500',
  },
  'not-started': {
    label: 'Not Started',
    classes: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    dot: 'bg-neutral-400',
  },
};

export function StatusBadge({ status, animate }: { status: TaskStatus; animate?: boolean }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.classes} ${
        animate ? 'animate-scale-in' : ''
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
