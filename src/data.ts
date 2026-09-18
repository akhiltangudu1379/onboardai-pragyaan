import type {
  OnboardingTask,
  ActivityEvent,
  KnowledgeDoc,
  UserProfile,
  AgentResponse,
  SourceCitation,
} from './types';

export const userProfile: UserProfile = {
  name: 'Alex Morgan',
  role: 'ML Engineer',
  email: 'alex.morgan@company.com',
  avatar: 'AM',
  department: 'Machine Learning',
  startDate: 'Sep 12, 2026',
  progress: 60,
};

export const initialTasks: OnboardingTask[] = [
  {
    id: 't1',
    title: 'Set up Slack workspace',
    description: 'Join team channels and set your availability hours.',
    duration: '5 min',
    status: 'completed',
    category: 'Communication',
    icon: 'MessageSquare',
  },
  {
    id: 't2',
    title: 'Complete HR orientation',
    description: 'Review employee handbook and sign policy documents.',
    duration: '20 min',
    status: 'completed',
    category: 'HR',
    icon: 'FileText',
  },
  {
    id: 't3',
    title: 'Request GitHub access',
    description: 'Get repository access through the automated approval workflow.',
    duration: '10 min',
    status: 'not-started',
    category: 'Engineering',
    icon: 'Github',
    link: 'access-request',
  },
  {
    id: 't4',
    title: 'Set up development environment',
    description: 'Install required tools, SDKs, and configure your local environment.',
    duration: '30 min',
    status: 'completed',
    category: 'Engineering',
    icon: 'Terminal',
  },
  {
    id: 't5',
    title: 'Review ML team architecture',
    description: 'Read through the current ML pipeline documentation and architecture diagrams.',
    duration: '15 min',
    status: 'in-progress',
    category: 'Engineering',
    icon: 'Network',
  },
  {
    id: 't6',
    title: 'Schedule 1:1 with team lead',
    description: 'Book your first meeting with Sarah Chen, ML Team Lead.',
    duration: '5 min',
    status: 'pending',
    category: 'Communication',
    icon: 'Calendar',
  },
];

export const initialActivity: ActivityEvent[] = [
  {
    id: 'a1',
    icon: 'Search',
    title: 'Indexed Engineering Access Policy',
    description: 'Retrieved 3 relevant sections from policy document',
    timestamp: '2 min ago',
    status: 'completed',
    tool: 'KnowledgeSearch',
    detail: 'Engineering Access Policy — Sections 2.1, 4.3, 5.2',
  },
  {
    id: 'a2',
    icon: 'ShieldCheck',
    title: 'Checked workflow compliance',
    description: 'Verified request meets all policy requirements',
    timestamp: '5 min ago',
    status: 'completed',
    tool: 'PolicyChecker',
    detail: 'Compliance check passed — 4/4 requirements met',
  },
  {
    id: 'a3',
    icon: 'UserCheck',
    title: 'Identified approver',
    description: 'Sarah Chen (ML Team Lead) assigned as approver',
    timestamp: '5 min ago',
    status: 'completed',
    tool: 'ApproverResolver',
    detail: 'Resolved via team hierarchy lookup',
  },
];

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 'k1',
    title: 'Engineering Access Policy',
    type: 'PDF',
    size: '1.2 MB',
    date: 'Sep 10, 2026',
    status: 'indexed',
    sections: 12,
  },
  {
    id: 'k2',
    title: 'ML Pipeline Architecture',
    type: 'Markdown',
    size: '340 KB',
    date: 'Sep 08, 2026',
    status: 'indexed',
    sections: 8,
  },
  {
    id: 'k3',
    title: 'Code Review Guidelines',
    type: 'PDF',
    size: '890 KB',
    date: 'Sep 05, 2026',
    status: 'indexed',
    sections: 6,
  },
  {
    id: 'k4',
    title: 'Team Communication Standards',
    type: 'Markdown',
    size: '120 KB',
    date: 'Sep 03, 2026',
    status: 'indexed',
    sections: 4,
  },
  {
    id: 'k5',
    title: 'Security Best Practices',
    type: 'PDF',
    size: '2.1 MB',
    date: 'Aug 28, 2026',
    status: 'indexed',
    sections: 15,
  },
];

export const sources: SourceCitation[] = [
  {
    id: 's1',
    title: 'Engineering Access Policy',
    type: 'Policy Document',
    description: 'Sections 2.1, 4.3, 5.2 — access tiers and approval matrix',
  },
  {
    id: 's2',
    title: 'ML Team Hierarchy',
    type: 'Org Chart',
    description: 'Team lead and department structure for approver resolution',
  },
  {
    id: 's3',
    title: 'Security Review Checklist',
    type: 'Guideline',
    description: 'Repository access requirements and compliance standards',
  },
];

export const sampleAgentResponse: AgentResponse = {
  greeting: "I'll help you get GitHub access set up right away.",
  summary:
    'Based on the Engineering Access Policy, you need approval from your team lead. I found the relevant policy sections and identified Sarah Chen as the approver. The process takes about 10 minutes.',
  checklist: [
    { id: 'c1', label: 'Verify employment status', done: true },
    { id: 'c2', label: 'Confirm team assignment', done: true },
    { id: 'c3', label: 'Identify required repository tier', done: true },
    { id: 'c4', label: 'Submit access request for approval', done: false },
  ],
  workflow: {
    title: 'GitHub Access Request Workflow',
    steps: [
      { id: 'w1', label: 'Searching policy', state: 'pending' },
      { id: 'w2', label: 'Checking requirements', state: 'pending' },
      { id: 'w3', label: 'Finding approver', state: 'pending' },
      { id: 'w4', label: 'Creating request', state: 'pending' },
    ],
  },
  sources,
};

export const processingSteps = [
  { id: 'p1', label: 'Understanding request' },
  { id: 'p2', label: 'Searching organizational knowledge' },
  { id: 'p3', label: 'Checking policy' },
  { id: 'p4', label: 'Finding responsible person' },
  { id: 'p5', label: 'Preparing action' },
];

export const analyticsData = {
  onboardingCompletion: [
    { week: 'W1', value: 45 },
    { week: 'W2', value: 52 },
    { week: 'W3', value: 58 },
    { week: 'W4', value: 60 },
    { week: 'W5', value: 65 },
    { week: 'W6', value: 72 },
    { week: 'W7', value: 78 },
    { week: 'W8', value: 85 },
  ],
  taskBreakdown: [
    { label: 'Completed', value: 3, color: 'success' },
    { label: 'In Progress', value: 1, color: 'primary' },
    { label: 'Pending', value: 1, color: 'warning' },
    { label: 'Not Started', value: 1, color: 'neutral' },
  ],
  timeSaved: [
    { day: 'Mon', value: 2.5 },
    { day: 'Tue', value: 3.8 },
    { day: 'Wed', value: 4.2 },
    { day: 'Thu', value: 3.1 },
    { day: 'Fri', value: 5.0 },
  ],
  insights: [
    { label: 'Avg. onboarding time', value: '4.2 days', trend: '-18%', trendUp: true },
    { label: 'Tasks automated', value: '142', trend: '+24%', trendUp: true },
    { label: 'Policy lookups', value: '1,840', trend: '+12%', trendUp: true },
    { label: 'Approval rate', value: '96.5%', trend: '+3%', trendUp: true },
  ],
};
