import { supabase, DEMO_USER_ID } from './supabase';
import type { AgentResponse, ActivityEvent } from '@/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent`;
const INGEST_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest`;

export interface AgentResult extends AgentResponse {
  activity: ActivityEvent[];
  taskUpdate?: { taskId: string; newStatus: string };
  accessRequest?: { requestId: string; approver: string; approverRole: string; status: string };
}

export async function callAgent(query: string, userId: string = DEMO_USER_ID): Promise<AgentResult> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query, userId }),
  });

  if (!response.ok) {
    throw new Error(`Agent request failed (${response.status})`);
  }

  const data = await response.json();

  if (data.error && !data.greeting) {
    throw new Error(data.error);
  }

  return data as AgentResult;
}

// ─── Direct database access functions ───

export async function fetchUserProfile(userId: string = DEMO_USER_ID) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchOnboardingTasks(userId: string = DEMO_USER_ID) {
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('task_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, type, size, upload_date, status, sections')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAgentActivity(userId: string = DEMO_USER_ID) {
  const { data, error } = await supabase
    .from('agent_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) throw error;
  return data || [];
}

export async function ingestDocument(file: File): Promise<{ title: string; type: string; size: string; sections: number }> {
  const content = await file.text();
  const title = file.name.replace(/\.[^/.]+$/, '');
  const ext = file.name.split('.').pop()?.toUpperCase() || 'TXT';
  const sizeKB = Math.max(1, Math.round(file.size / 1024));
  const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

  const res = await fetch(INGEST_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ title, content, type: ext.toLowerCase(), size }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || 'Ingestion failed');
  }

  const data = await res.json();
  return { title, type: ext, size, sections: data.sections ?? 0 };
}

export async function updateTaskStatusInDb(taskTitle: string, status: string, userId: string = DEMO_USER_ID) {
  const { error } = await supabase
    .from('onboarding_tasks')
    .update({ status })
    .eq('user_id', userId)
    .ilike('title', `%${taskTitle}%`);

  if (error) throw error;
}

export async function logAgentActivity(event: {
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  tool: string;
  detail: string;
}, userId: string = DEMO_USER_ID) {
  const { error } = await supabase.from('agent_activity').insert({
    user_id: userId,
    ...event,
    event_type: 'TOOL_EXECUTED',
  });

  if (error) throw error;
}
