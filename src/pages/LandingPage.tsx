import type { Page } from '@/types';
import { Reveal } from '@/components/Reveal';
import { AgentIcon } from '@/components/AgentIcon';
import {
  ArrowRight,
  Search,
  Zap,
  TrendingUp,
  Compass,
  Check,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Github,
  Clock,
  Bell,
} from 'lucide-react';

interface LandingPageProps {
  onEnterDemo: () => void;
  onNavigate: (page: Page) => void;
}

export function LandingPage({ onEnterDemo, onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/20">
              <Compass size={20} />
            </div>
            <span className="text-base font-bold text-neutral-900">OnboardAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <button onClick={() => onNavigate('dashboard')} className="transition-colors hover:text-neutral-900">Product</button>
            <a href="#features" className="transition-colors hover:text-neutral-900">Features</a>
            <a href="#how" className="transition-colors hover:text-neutral-900">How it works</a>
          </div>
          <button
            onClick={onEnterDemo}
            className="btn-press group flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-900/20"
          >
            Enter Demo
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-mesh">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 mb-6">
                  <Sparkles size={13} />
                  AI-powered employee onboarding
                </div>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-[1.1] mb-5 text-balance">
                  Onboard faster.
                  <br />
                  <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                    Let AI do the work.
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="text-lg text-neutral-600 leading-relaxed mb-8 max-w-lg">
                  OnboardAI automates your entire onboarding workflow — from policy lookup to access requests — so new hires are productive on day one.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onEnterDemo}
                    className="btn-press group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/30"
                  >
                    Enter Demo
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                  <a
                    href="#how"
                    className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    See how it works
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Floating product preview */}
            <Reveal delay={200} className="relative">
              <FloatingPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-neutral-100 bg-neutral-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '4.2', label: 'Avg. onboarding days', suffix: ' days' },
            { value: '96', label: 'Approval success rate', suffix: '%' },
            { value: '142', label: 'Tasks automated', suffix: '' },
            { value: '1.8k', label: 'Policy lookups', suffix: '+' },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <div className="text-center">
                <p className="text-3xl font-bold text-neutral-900">{stat.value}{stat.suffix}</p>
                <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FIND / ACT / PROGRESS */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">Three steps to day-one productivity</h2>
          <p className="text-neutral-600 max-w-xl mx-auto">OnboardAI searches your organization's knowledge, takes action, and tracks progress automatically.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: 'FIND', color: 'primary', desc: 'The AI agent searches your knowledge base to find relevant policies, documents, and team structures in seconds.' },
            { icon: Zap, title: 'ACT', color: 'accent', desc: 'It initiates workflows — access requests, tool provisioning, document signing — all through your approval chains.' },
            { icon: TrendingUp, title: 'PROGRESS', color: 'success', desc: 'Track every new hire onboarding journey with real-time progress dashboards and automated follow-ups.' },
          ].map((item, i) => {
            const Icon = item.icon;
            const colorMap: Record<string, string> = {
              primary: 'from-primary-500 to-primary-600 shadow-primary-500/20',
              accent: 'from-accent-500 to-accent-600 shadow-accent-500/20',
              success: 'from-success-500 to-success-600 shadow-success-500/20',
            };
            return (
              <Reveal key={item.title} delay={i * 120}>
                <div className="group card-hover rounded-2xl border border-neutral-200 bg-white p-7 h-full">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[item.color]} text-white shadow-lg mb-5 transition-transform duration-200 group-hover:scale-110`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-neutral-50/50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">How it works</h2>
            <p className="text-neutral-600 max-w-xl mx-auto">From first question to completed task — see the AI agent in action.</p>
          </Reveal>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              { icon: Sparkles, title: 'Ask the AI agent', desc: 'New hires simply ask: "I need GitHub access." The agent understands the intent instantly.' },
              { icon: BookOpen, title: 'Agent searches knowledge', desc: 'It scans your policies, identifies requirements, and finds the right approver — all automatically.' },
              { icon: ShieldCheck, title: 'Creates the request', desc: 'A compliant access request is generated and routed through your existing approval workflow.' },
              { icon: Check, title: 'Task completed', desc: 'The dashboard updates in real-time, progress increases, and the new hire moves to the next step.' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 100}>
                  <div className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 card-hover">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0 transition-all duration-200 group-hover:bg-primary-100">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-neutral-900 mb-1">{step.title}</h4>
                      <p className="text-sm text-neutral-600">{step.desc}</p>
                    </div>
                    <span className="text-2xl font-bold text-neutral-200 tabular-nums">{i + 1}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">Ready to see it in action?</h2>
          <p className="text-neutral-600 mb-8 max-w-xl mx-auto">Enter the interactive demo and experience AI-powered onboarding firsthand.</p>
          <button
            onClick={onEnterDemo}
            className="btn-press group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Enter Demo
            <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Compass size={16} className="text-primary-500" />
            <span className="font-medium text-neutral-700">OnboardAI</span>
            <span>— Intelligent Onboarding</span>
          </div>
          <p className="text-xs text-neutral-400">Demo experience. All data is simulated.</p>
        </div>
      </footer>
    </div>
  );
}

function FloatingPreview() {
  return (
    <div className="relative">
      {/* Main dashboard card */}
      <div className="relative rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 p-5 animate-float-slow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AgentIcon size={32} state="idle" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">Onboarding Progress</p>
              <p className="text-[10px] text-neutral-500">Alex Morgan</p>
            </div>
          </div>
          <span className="rounded-full bg-success-50 text-success-700 text-[10px] font-medium px-2 py-0.5 border border-success-200">On Track</span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-neutral-500">Overall progress</span>
            <span className="font-semibold text-neutral-900">60%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700 ease-smooth"
              style={{ width: '60%' }}
            />
          </div>
        </div>

        {/* Mini tasks */}
        <div className="space-y-2">
          {[
            { icon: Check, label: 'Set up Slack workspace', done: true },
            { icon: Github, label: 'Request GitHub access', done: false, badge: 'In Progress' },
            { icon: BookOpen, label: 'Review ML architecture', done: false, badge: 'Pending' },
          ].map((task, i) => {
            const Icon = task.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${task.done ? 'bg-success-100 text-success-600' : 'bg-primary-100 text-primary-600'}`}>
                  <Icon size={14} />
                </div>
                <span className="flex-1 text-xs font-medium text-neutral-700 truncate">{task.label}</span>
                {task.badge && <span className="text-[9px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{task.badge}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating badges with parallax */}
      <div
        className="absolute -top-4 -right-2 rounded-xl border border-neutral-200 bg-white shadow-lg px-3 py-2 animate-float"
        style={{ animationDelay: '0.5s' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-success-100 text-success-600">
            <Check size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-900">3 tasks completed</p>
            <p className="text-[9px] text-neutral-500">Today</p>
          </div>
        </div>
      </div>

      <div
        className="absolute -bottom-3 -left-3 rounded-xl border border-neutral-200 bg-white shadow-lg px-3 py-2 animate-float"
        style={{ animationDelay: '1.2s' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-100 text-primary-600">
            <Bell size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-900">REQ-1042</p>
            <p className="text-[9px] text-neutral-500">Pending approval</p>
          </div>
        </div>
      </div>

      <div
        className="absolute top-1/2 -right-4 rounded-xl border border-neutral-200 bg-white shadow-lg px-3 py-2 animate-bounce-subtle"
        style={{ animationDelay: '0.8s' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-100 text-accent-600">
            <Clock size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-900">60% Onboarded</p>
            <p className="text-[9px] text-neutral-500">On track</p>
          </div>
        </div>
      </div>
    </div>
  );
}
