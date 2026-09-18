import { useEffect, useRef, useState } from 'react';
import type { Page, UserProfile } from '@/types';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';

interface TopBarProps {
  user: UserProfile;
  page: Page;
  onOpenMobile: () => void;
  onNavigate: (page: Page) => void;
}

const pageTitles: Record<Page, string> = {
  landing: '',
  dashboard: 'Dashboard',
  assistant: 'AI Assistant',
  knowledge: 'Knowledge Base',
  analytics: 'Analytics',
  profile: 'Profile',
};

export function TopBar({ user, page, onOpenMobile, onNavigate }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 lg:px-6 glass border-b border-neutral-200/60">
      <button
        onClick={onOpenMobile}
        className="lg:hidden rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
      >
        <Menu size={20} />
      </button>

      <h2 className="text-base font-semibold text-neutral-900 hidden sm:block">
        {pageTitles[page]}
      </h2>

      {/* Search bar */}
      <div className="ml-auto hidden md:flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 w-56 transition-all duration-200 focus-within:border-primary-300 focus-within:bg-white focus-within:w-64">
        <Search size={15} className="text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none"
        />
        <kbd className="text-[10px] font-medium text-neutral-400 bg-white border border-neutral-200 rounded px-1 py-0.5">⌘K</kbd>
      </div>

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-700 btn-press">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
      </button>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-all duration-200 hover:bg-neutral-100 btn-press"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-xs font-semibold shadow-sm">
            {user.avatar}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-neutral-800 leading-tight">{user.name}</p>
            <p className="text-[10px] text-neutral-500 leading-tight">{user.role}</p>
          </div>
          <ChevronDown
            size={14}
            className={`hidden sm:block text-neutral-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 animate-scale-in rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10 overflow-hidden origin-top-right">
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-sm font-semibold text-neutral-900">{user.name}</p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { onNavigate('profile'); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-600 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <User size={15} className="text-neutral-400" />
                Profile
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-600 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <Settings size={15} className="text-neutral-400" />
                Preferences
              </button>
            </div>
            <div className="border-t border-neutral-100 py-1">
              <button
                onClick={() => { onNavigate('landing'); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-neutral-600 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <LogOut size={15} className="text-neutral-400" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
