export type Page = 'landing' | 'dashboard' | 'assistant' | 'knowledge' | 'analytics' | 'profile';

export type TaskStatus = 'completed' | 'in-progress' | 'pending' | 'not-started';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: TaskStatus;
  category: string;
  icon: string;
  link?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  response?: AgentResponse;
}

export interface AgentResponse {
  greeting: string;
  summary: string;
  checklist: ChecklistItem[];
  workflow: WorkflowCard;
  sources: SourceCitation[];
  mode?: 'ai' | 'demo';
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface WorkflowCard {
  title: string;
  steps: WorkflowStep[];
  requestId?: string;
  status?: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'completed';
}

export interface SourceCitation {
  id: string;
  title: string;
  type: string;
  description: string;
  sectionContent?: string;
}

export interface ActivityEvent {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'processing' | 'completed';
  tool?: string;
  detail?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  type: string;
  size: string;
  date: string;
  status: 'indexed' | 'processing' | 'uploading';
  sections?: number;
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  avatar: string;
  department: string;
  startDate: string;
  progress: number;
}
