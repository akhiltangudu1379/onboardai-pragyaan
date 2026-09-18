import type { UserProfile, OnboardingTask } from '@/types';
import { Reveal } from '@/components/Reveal';
import { ProgressRing } from '@/components/ProgressRing';
import { CountUp } from '@/components/CountUp';
import {
  Mail,
  Briefcase,
  Calendar,
  Building2,
  Save,
  Bell,
  Globe,
  Shield,
} from 'lucide-react';

interface ProfilePageProps {
  user: UserProfile;
  tasks: OnboardingTask[];
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function ProfilePage({ user, tasks, onToast }: ProfilePageProps) {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;

  const infoItems = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Briefcase, label: 'Role', value: user.role },
    { icon: Building2, label: 'Department', value: user.department },
    { icon: Calendar, label: 'Start Date', value: user.startDate },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <Reveal>
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">Profile</h1>
        <p className="text-sm text-neutral-500 mb-6">Your account and onboarding information.</p>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <Reveal className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center h-full">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white text-2xl font-bold shadow-lg shadow-primary-500/20">
                {user.avatar}
              </div>
            </div>
            <h3 className="text-lg font-bold text-neutral-900">{user.name}</h3>
            <p className="text-sm text-neutral-500">{user.role}</p>
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <ProgressRing progress={Math.round((completed / total) * 100)} size={100} strokeWidth={8} />
              <p className="text-xs text-neutral-500 mt-3">Onboarding Progress</p>
            </div>
          </div>
        </Reveal>

        {/* Info & settings */}
        <Reveal delay={80} className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 h-full">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Account Information</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-100 text-neutral-500 flex-shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-neutral-400 font-medium">{item.label}</p>
                      <p className="text-sm font-medium text-neutral-800 truncate">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Task summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-success-50 p-3 text-center">
                <p className="text-xl font-bold text-success-700">
                  <CountUp to={completed} />
                </p>
                <p className="text-[10px] text-success-600 font-medium">Completed</p>
              </div>
              <div className="rounded-xl bg-primary-50 p-3 text-center">
                <p className="text-xl font-bold text-primary-700">
                  <CountUp to={tasks.filter((t) => t.status === 'in-progress' || t.status === 'pending').length} />
                </p>
                <p className="text-[10px] text-primary-600 font-medium">Remaining</p>
              </div>
              <div className="rounded-xl bg-neutral-100 p-3 text-center">
                <p className="text-xl font-bold text-neutral-700">
                  <CountUp to={total} />
                </p>
                <p className="text-[10px] text-neutral-600 font-medium">Total</p>
              </div>
            </div>

            {/* Preferences */}
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 pt-2 border-t border-neutral-100">Preferences</h3>
            <div className="space-y-2">
              {[
                { icon: Bell, label: 'Email notifications', desc: 'Get notified about task updates', enabled: true },
                { icon: Globe, label: 'Language', desc: 'English (US)', enabled: false },
                { icon: Shield, label: 'Two-factor authentication', desc: 'Add an extra layer of security', enabled: false },
              ].map((pref) => {
                const Icon = pref.icon;
                return (
                  <div key={pref.label} className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 transition-all duration-200 hover:bg-neutral-50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-neutral-500 flex-shrink-0">
                      <Icon size={15} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800">{pref.label}</p>
                      <p className="text-[11px] text-neutral-500">{pref.desc}</p>
                    </div>
                    {pref.enabled ? (
                      <span className="text-[10px] font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full">On</span>
                    ) : (
                      <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">Off</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onToast('Profile saved successfully', 'success')}
              className="btn-press mt-5 flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/20"
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
