import type { Page } from '@/types';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  BarChart3,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { AgentIcon } from './AgentIcon';

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'assistant', label: 'AI Assistant', icon: Sparkles },
  { page: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar({ current, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col
          border-r border-neutral-200 bg-white
          transition-transform duration-300 ease-smooth
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-neutral-100">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/20">
            <Compass size={20} />
          </div>
          <div>
            <span className="text-base font-bold text-neutral-900">OnboardAI</span>
            <span className="block text-[10px] font-medium text-neutral-400 -mt-0.5">Intelligent Onboarding</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Menu</p>
          {navItems.map(({ page, label, icon: Icon }) => {
            const active = current === page;
            return (
              <button
                key={page}
                onClick={() => {
                  onNavigate(page);
                  onCloseMobile();
                }}
                className={`
                  nav-item group relative flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium
                  ${active ? 'nav-item-active' : 'text-neutral-600 hover:text-neutral-900'}
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary-500 transition-all duration-200" />
                )}
                <span className="nav-icon transition-transform duration-200 ease-smooth">
                  <Icon size={18} className={active ? 'text-primary-600' : ''} />
                </span>
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto text-primary-400" />}
              </button>
            );
          })}
        </nav>

        {/* Agent status card */}
        <div className="px-3 pb-4">
          <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-accent-50/50 p-3">
            <div className="flex items-center gap-2.5">
              <AgentIcon size={36} state="idle" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-800">Agent Online</p>
                <p className="text-[10px] text-neutral-500">Ready to assist</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
