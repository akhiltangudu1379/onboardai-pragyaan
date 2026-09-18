import { useState, useEffect } from 'react';
import { Reveal } from '@/components/Reveal';
import { CountUp } from '@/components/CountUp';
import { analyticsData } from '@/data';
import { supabase } from '@/lib/supabase';
import { DEMO_USER_ID } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

type DonutItem = { label: string; value: number; color: string };

export function AnalyticsPage() {
  const [taskBreakdown, setTaskBreakdown] = useState<DonutItem[]>(analyticsData.taskBreakdown);
  const [insights, setInsights] = useState(analyticsData.insights);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRealData() {
      try {
        const [tasksRes, activityRes, requestsRes] = await Promise.all([
          supabase.from('onboarding_tasks').select('status').eq('user_id', DEMO_USER_ID),
          supabase.from('agent_activity').select('id', { count: 'exact', head: true }).eq('user_id', DEMO_USER_ID),
          supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('user_id', DEMO_USER_ID),
        ]);

        const tasks = tasksRes.data || [];
        if (tasks.length > 0) {
          const completed = tasks.filter((t) => t.status === 'completed').length;
          const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
          const pending = tasks.filter((t) => t.status === 'pending').length;
          const notStarted = tasks.filter((t) => t.status === 'not-started').length;
          const total = tasks.length;
          const completionPct = Math.round((completed / total) * 100);

          setTaskBreakdown([
            { label: 'Completed', value: completed, color: 'success' },
            { label: 'In Progress', value: inProgress, color: 'primary' },
            { label: 'Pending', value: pending, color: 'warning' },
            { label: 'Not Started', value: notStarted, color: 'neutral' },
          ].filter((d) => d.value > 0));

          const agentInteractions = activityRes.count ?? 0;
          const accessRequests = requestsRes.count ?? 0;

          setInsights([
            { label: 'Completion Rate', value: `${completionPct}%`, trend: `${completed}/${total} tasks`, trendUp: completionPct >= 50 },
            { label: 'Tasks Completed', value: `${completed}`, trend: `${total - completed} remaining`, trendUp: completed > 0 },
            { label: 'Agent Interactions', value: `${agentInteractions}`, trend: 'total sessions', trendUp: true },
            { label: 'Access Requests', value: `${accessRequests}`, trend: 'submitted', trendUp: accessRequests > 0 },
          ]);
        }
      } catch (err) {
        console.error('Analytics data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRealData();
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <Reveal>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Analytics</h1>
          <p className="text-sm text-neutral-500">Onboarding metrics and AI agent performance insights.</p>
        </div>
      </Reveal>

      {/* Insight cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {insights.map((insight, i) => (
          <Reveal key={insight.label} delay={i * 80}>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 card-hover">
              <p className="text-xs text-neutral-500 mb-1">{insight.label}</p>
              <p className={`text-2xl font-bold text-neutral-900 ${loading ? 'animate-pulse opacity-50' : ''}`}>
                {insight.value}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {insight.trendUp ? (
                  <TrendingUp size={13} className="text-success-500" />
                ) : (
                  <TrendingDown size={13} className="text-error-500" />
                )}
                <span className={`text-xs font-medium ${insight.trendUp ? 'text-success-600' : 'text-error-600'}`}>
                  {insight.trend}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Reveal>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">Onboarding Completion Rate</h3>
            <p className="text-xs text-neutral-500 mb-4">Weekly average across all new hires</p>
            <LineChart data={analyticsData.onboardingCompletion} />
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">Time Saved by AI Agent</h3>
            <p className="text-xs text-neutral-500 mb-4">Hours saved per day this week</p>
            <BarChart data={analyticsData.timeSaved} />
          </div>
        </Reveal>
      </div>

      {/* Task breakdown donut */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">Task Status Breakdown</h3>
            <p className="text-xs text-neutral-500 mb-4">Current onboarding cycle distribution</p>
            <DonutChart data={taskBreakdown} />
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50/30 p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/20">
                <Sparkles size={18} />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">AI Insight</h3>
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">
              Onboarding completion has improved by <span className="font-semibold text-success-600">40%</span> over the past 8 weeks. The AI agent's automated policy lookups and access requests are saving an average of <span className="font-semibold text-primary-700">3.7 hours</span> per new hire.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/60 p-3">
                <p className="text-xs text-neutral-500">Peak efficiency</p>
                <p className="text-lg font-bold text-neutral-900">Friday</p>
              </div>
              <div className="rounded-xl bg-white/60 p-3">
                <p className="text-xs text-neutral-500">Total time saved</p>
                <p className="text-lg font-bold text-neutral-900">
                  <CountUp to={18.6} decimals={1} suffix="h" />
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function LineChart({ data }: { data: { week: string; value: number }[] }) {
  const [animated, setAnimated] = useState(false);
  const width = 400;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 24, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = 100;
  const min = 0;
  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - min) / (max - min)) * chartH,
    value: d.value,
    week: d.week,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padding.top + chartH - ((v - min) / (max - min)) * chartH;
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" className="fill-neutral-400 text-[9px]">{v}%</text>
          </g>
        );
      })}

      <path d={areaD} fill="url(#lineGradient)" opacity={animated ? 1 : 0} style={{ transition: 'opacity 800ms ease-out' }} />
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>

      <path
        d={pathD} fill="none" stroke="#6366f1" strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 1000, strokeDashoffset: animated ? 0 : 1000, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />

      {points.map((p, i) => (
        <g key={i} style={{ opacity: animated ? 1 : 0, transition: `opacity 300ms ease-out ${300 + i * 100}ms` }}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#6366f1" stroke="white" strokeWidth={2} />
        </g>
      ))}

      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - 6} textAnchor="middle" className="fill-neutral-400 text-[9px]">{p.week}</text>
      ))}
    </svg>
  );
}

function BarChart({ data }: { data: { day: string; value: number }[] }) {
  const [animated, setAnimated] = useState(false);
  const max = Math.max(...data.map((d) => d.value));

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end justify-between gap-2 h-44 pt-4">
      {data.map((d, i) => (
        <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
          <div className="flex-1 flex items-end w-full justify-center">
            <div
              className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-primary-500 to-accent-400 transition-all duration-700 ease-smooth relative group"
              style={{ height: animated ? `${(d.value / max) * 100}%` : '0%', transitionDelay: `${i * 80}ms` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {d.value}h
              </span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: DonutItem[] }) {
  const [animated, setAnimated] = useState(false);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const colorMap: Record<string, string> = {
    success: '#22c55e',
    primary: '#6366f1',
    warning: '#f59e0b',
    neutral: '#cbd5e1',
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (total === 0) {
    return <div className="text-sm text-neutral-400 text-center py-8">No task data available</div>;
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={150} height={150} className="-rotate-90">
          {data.map((d, i) => {
            const portion = d.value / total;
            const dash = portion * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={i} cx={75} cy={75} r={radius} fill="none"
                stroke={colorMap[d.color]} strokeWidth={strokeWidth}
                strokeDasharray={`${animated ? dash : 0} ${gap}`}
                strokeDashoffset={-currentOffset}
                style={{ transition: `stroke-dasharray 800ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-neutral-900">{total}</span>
          <span className="text-[10px] text-neutral-500">Tasks</span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[d.color] }} />
            <span className="text-xs text-neutral-600 flex-1">{d.label}</span>
            <span className="text-xs font-semibold text-neutral-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
