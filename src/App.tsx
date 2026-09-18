import { useState, useCallback, useEffect } from 'react';
import type { Page, OnboardingTask, TaskStatus, ActivityEvent, UserProfile, KnowledgeDoc } from '@/types';
import { initialTasks, initialActivity, userProfile as mockUserProfile, knowledgeDocs as mockDocs } from '@/data';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ToastContainer } from '@/components/Toast';
import type { ToastData } from '@/components/Toast';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AssistantPage } from '@/pages/AssistantPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import {
  fetchUserProfile,
  fetchOnboardingTasks,
  fetchAgentActivity,
  fetchDocuments,
} from '@/lib/agent';

function App() {
  const [page, setPage] = useState<Page>('landing');
  const [tasks, setTasks] = useState<OnboardingTask[]>(initialTasks);
  const [activity, setActivity] = useState<ActivityEvent[]>(initialActivity);
  const [docs, setDocs] = useState<KnowledgeDoc[]>(mockDocs);
  const [user, setUser] = useState<UserProfile>(mockUserProfile);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
  }, []);

  // Map DB task row to OnboardingTask
  const mapDbTask = useCallback((dbTask: Record<string, unknown>): OnboardingTask => {
    const statusMap: Record<string, TaskStatus> = {
      completed: 'completed',
      'in-progress': 'in-progress',
      pending: 'pending',
      'not-started': 'not-started',
    };
    return {
      id: dbTask.id as string,
      title: dbTask.title as string,
      description: dbTask.description as string,
      duration: dbTask.duration as string,
      status: statusMap[dbTask.status as string] || 'pending',
      category: dbTask.category as string,
      icon: dbTask.icon as string,
      link: (dbTask.link as string) || undefined,
    };
  }, []);

  // Map DB activity row to ActivityEvent
  const mapDbActivity = useCallback((dbAct: Record<string, unknown>): ActivityEvent => ({
    id: dbAct.id as string,
    icon: dbAct.icon as string,
    title: dbAct.title as string,
    description: dbAct.description as string,
    timestamp: dbAct.timestamp as string,
    status: dbAct.status as 'processing' | 'completed',
    tool: dbAct.tool as string | undefined,
    detail: dbAct.detail as string | undefined,
  }), []);

  // Map DB document row to KnowledgeDoc
  const mapDbDoc = useCallback((dbDoc: Record<string, unknown>): KnowledgeDoc => ({
    id: dbDoc.id as string,
    title: dbDoc.title as string,
    type: dbDoc.type as string,
    size: dbDoc.size as string,
    date: dbDoc.upload_date as string,
    status: dbDoc.status as 'indexed' | 'processing' | 'uploading',
    sections: dbDoc.sections as number | undefined,
  }), []);

  // Load data from Supabase when entering the app
  const loadData = useCallback(async () => {
    try {
      const [dbUser, dbTasks, dbActivity, dbDocs] = await Promise.all([
        fetchUserProfile().catch(() => null),
        fetchOnboardingTasks().catch(() => null),
        fetchAgentActivity().catch(() => null),
        fetchDocuments().catch(() => null),
      ]);

      if (dbUser) {
        setUser({
          name: dbUser.name,
          role: dbUser.role,
          email: dbUser.email,
          avatar: dbUser.avatar,
          department: dbUser.department,
          startDate: dbUser.start_date,
          progress: dbUser.progress,
        });
      }

      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks.map(mapDbTask));
      }

      if (dbActivity && dbActivity.length > 0) {
        setActivity(dbActivity.map(mapDbActivity));
      }

      if (dbDocs && dbDocs.length > 0) {
        setDocs(dbDocs.map(mapDbDoc));
      }
    } catch {
      // Fallback to mock data (already set as initial state)
    }
    setDataLoaded(true);
  }, [mapDbTask, mapDbActivity, mapDbDoc]);

  // Load data when first entering the dashboard (not landing page)
  useEffect(() => {
    if (page !== 'landing' && !dataLoaded) {
      loadData();
    }
  }, [page, dataLoaded, loadData]);

  const handleTaskComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          let newStatus: TaskStatus = 'completed';
          if (t.link === 'access-request') {
            newStatus = 'in-progress';
          }
          return { ...t, status: newStatus };
        }
        return t;
      })
    );
  }, []);

  const handleActivityAdd = useCallback((event: ActivityEvent) => {
    setActivity((prev) => [event, ...prev].slice(0, 20));
  }, []);

  // Refresh tasks from DB after agent actions
  const refreshTasks = useCallback(async () => {
    try {
      const dbTasks = await fetchOnboardingTasks();
      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks.map(mapDbTask));
      }
    } catch {
      // Keep current state
    }
  }, [mapDbTask]);

  // Refresh activity from DB
  const refreshActivity = useCallback(async () => {
    try {
      const dbActivity = await fetchAgentActivity();
      if (dbActivity && dbActivity.length > 0) {
        setActivity(dbActivity.map(mapDbActivity));
      }
    } catch {
      // Keep current state
    }
  }, [mapDbActivity]);

  // Refresh documents from DB
  const refreshDocs = useCallback(async () => {
    try {
      const dbDocs = await fetchDocuments();
      if (dbDocs && dbDocs.length > 0) {
        setDocs(dbDocs.map(mapDbDoc));
      }
    } catch {
      // Keep current state
    }
  }, [mapDbDoc]);

  // Landing page is standalone
  if (page === 'landing') {
    return (
      <>
        <LandingPage onEnterDemo={() => setPage('dashboard')} onNavigate={handleNavigate} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar
        current={page}
        onNavigate={handleNavigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          user={user}
          page={page}
          onOpenMobile={() => setMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="flex-1">
          {page === 'dashboard' && (
            <DashboardPage
              user={user}
              tasks={tasks}
              onTaskComplete={handleTaskComplete}
              onNavigate={handleNavigate}
              onToast={addToast}
              onRefreshTasks={refreshTasks}
            />
          )}
          {page === 'assistant' && (
            <AssistantPage
              activity={activity}
              onActivityAdd={handleActivityAdd}
              onToast={addToast}
              onTasksChanged={refreshTasks}
              onActivityChanged={refreshActivity}
            />
          )}
          {page === 'knowledge' && (
            <KnowledgePage docs={docs} onToast={addToast} onDocsChanged={refreshDocs} />
          )}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'profile' && (
            <ProfilePage
              user={user}
              tasks={tasks}
              onToast={addToast}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
