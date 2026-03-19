export const STORAGE_KEY = 'forestHub.voiceProjectDashboard.v1';
export const PROJECT_STAGES = ['Intake', 'Script Prep', 'Recording', 'Editing', 'Delivery'] as const;
export const FILTER_STAGES = ['All', ...PROJECT_STAGES] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type FilterStage = (typeof FILTER_STAGES)[number];

export type Task = {
  id: string;
  label: string;
  done: boolean;
};

export type Deliverable = {
  id: string;
  label: string;
  ready: boolean;
};

export type Session = {
  id: string;
  window: string;
  talent: string;
  lane: string;
};

export type VoiceProject = {
  id: string;
  title: string;
  client: string;
  owner: string;
  stage: ProjectStage;
  dueDate: string;
  summary: string;
  voiceStyle: string;
  languages: string[];
  blockers: string[];
  tasks: Task[];
  deliverables: Deliverable[];
  sessions: Session[];
  notes: string;
  runtimeMinutes: number;
  scriptPages: number;
  budget: string;
  priority: boolean;
};

export const STAGE_COLORS: Record<ProjectStage, string> = {
  Intake: '#F59E0B',
  'Script Prep': '#38BDF8',
  Recording: '#34D399',
  Editing: '#FB7185',
  Delivery: '#A78BFA',
};

export const DEFAULT_PROJECTS: VoiceProject[] = [
  {
    id: 'forest-fables',
    title: 'Forest Fables Audio Launch',
    client: 'Pinecone Kids',
    owner: 'Ivan',
    stage: 'Recording',
    dueDate: '2026-03-26',
    summary: 'Launch-week narration pack for onboarding, trailer cutdowns, and bedtime-mode promos.',
    voiceStyle: 'Warm guide, parent-safe pacing, fast pickup turnaround',
    languages: ['EN', 'BG'],
    blockers: ['Waiting on revised trailer CTA from client'],
    tasks: [
      { id: 'forest-fables-task-1', label: 'Lock trailer supers and pronunciation sheet', done: true },
      { id: 'forest-fables-task-2', label: 'Record hero narration with alt CTA ending', done: false },
      { id: 'forest-fables-task-3', label: 'Prep pickup script for Bulgarian version', done: false },
    ],
    deliverables: [
      { id: 'forest-fables-deliverable-1', label: 'Scratch VO for trailer edit', ready: true },
      { id: 'forest-fables-deliverable-2', label: 'Mastered WAV narration pack', ready: false },
      { id: 'forest-fables-deliverable-3', label: 'Mobile-friendly MP3 preview set', ready: false },
    ],
    sessions: [
      { id: 'forest-fables-session-1', window: 'Thu 10:00', talent: 'Mila V.', lane: 'Main booth' },
      { id: 'forest-fables-session-2', window: 'Fri 15:30', talent: 'Ivan G.', lane: 'Pickup lane' },
    ],
    notes: 'Need a calmer read for the sleep-mode CTA and tighter plosive cleanup on line 14.',
    runtimeMinutes: 18,
    scriptPages: 7,
    budget: '$3.2k',
    priority: true,
  },
  {
    id: 'museum-tour',
    title: 'City Museum Guided Tour',
    client: 'Civic Experience Lab',
    owner: 'Diana',
    stage: 'Script Prep',
    dueDate: '2026-04-02',
    summary: 'Interactive kiosk narration for three visitor paths with child and adult language variants.',
    voiceStyle: 'Confident documentary tone, clear scene transitions, accessibility-first delivery',
    languages: ['EN'],
    blockers: ['Gallery 4 script still missing final exhibit names'],
    tasks: [
      { id: 'museum-tour-task-1', label: 'Split final script into gallery chapters', done: true },
      { id: 'museum-tour-task-2', label: 'Mark alt pronunciations for borrowed artifacts', done: false },
      { id: 'museum-tour-task-3', label: 'Approve runtime target with museum PM', done: false },
    ],
    deliverables: [
      { id: 'museum-tour-deliverable-1', label: 'Talent-ready script packet', ready: true },
      { id: 'museum-tour-deliverable-2', label: 'Pronunciation guide PDF', ready: false },
      { id: 'museum-tour-deliverable-3', label: 'Kiosk chapter slate plan', ready: false },
    ],
    sessions: [{ id: 'museum-tour-session-1', window: 'Mon 09:00', talent: 'Ana P.', lane: 'Remote link' }],
    notes: 'Museum wants a softer intro for school groups; keep pacing under 135 wpm.',
    runtimeMinutes: 26,
    scriptPages: 12,
    budget: '$4.8k',
    priority: false,
  },
  {
    id: 'midnight-market',
    title: 'Midnight Market Trailer',
    client: 'Ember Atlas',
    owner: 'Mira',
    stage: 'Editing',
    dueDate: '2026-03-24',
    summary: 'High-energy trailer mix with broadcast-safe master and social cutdown versions.',
    voiceStyle: 'Low, urgent trailer read with sharp dynamic swells',
    languages: ['EN', 'DE'],
    blockers: [],
    tasks: [
      { id: 'midnight-market-task-1', label: 'Trim breaths and remove booth rustle', done: true },
      { id: 'midnight-market-task-2', label: 'Balance trailer stem under music swells', done: true },
      { id: 'midnight-market-task-3', label: 'Render vertical social version', done: false },
    ],
    deliverables: [
      { id: 'midnight-market-deliverable-1', label: 'Broadcast WAV master', ready: true },
      { id: 'midnight-market-deliverable-2', label: 'Social cutdown pack', ready: false },
      { id: 'midnight-market-deliverable-3', label: 'Session archive with markers', ready: true },
    ],
    sessions: [{ id: 'midnight-market-session-1', window: 'Today 17:00', talent: 'Noah R.', lane: 'Edit bay' }],
    notes: 'Client approved tone. Need the vertical master before end of day.',
    runtimeMinutes: 6,
    scriptPages: 2,
    budget: '$2.1k',
    priority: true,
  },
  {
    id: 'ivr-refresh',
    title: 'Northwind IVR Refresh',
    client: 'Northwind Energy',
    owner: 'Ivan',
    stage: 'Delivery',
    dueDate: '2026-03-21',
    summary: 'Customer-support IVR lines refreshed for outages, billing, and appointment scheduling.',
    voiceStyle: 'Neutral, reassuring service tone with strong diction',
    languages: ['EN', 'ES'],
    blockers: [],
    tasks: [
      { id: 'ivr-refresh-task-1', label: 'QA phone-tree numbering against latest map', done: true },
      { id: 'ivr-refresh-task-2', label: 'Upload mastered prompts to client portal', done: true },
      { id: 'ivr-refresh-task-3', label: 'Hand off backup takes for emergencies', done: true },
    ],
    deliverables: [
      { id: 'ivr-refresh-deliverable-1', label: 'Broadcast-safe WAV pack', ready: true },
      { id: 'ivr-refresh-deliverable-2', label: 'CSV prompt manifest', ready: true },
      { id: 'ivr-refresh-deliverable-3', label: 'Client sign-off email', ready: true },
    ],
    sessions: [{ id: 'ivr-refresh-session-1', window: 'Sent', talent: 'Helena C.', lane: 'Client portal' }],
    notes: 'Keep this as the template for future outage-event batches.',
    runtimeMinutes: 14,
    scriptPages: 5,
    budget: '$1.4k',
    priority: false,
  },
];

export function cloneProjects(projects: VoiceProject[]): VoiceProject[] {
  return projects.map((project) => ({
    ...project,
    languages: [...project.languages],
    blockers: [...project.blockers],
    tasks: project.tasks.map((task) => ({ ...task })),
    deliverables: project.deliverables.map((deliverable) => ({ ...deliverable })),
    sessions: project.sessions.map((session) => ({ ...session })),
  }));
}

export function computeCompletion(project: VoiceProject): number {
  const stageShare = PROJECT_STAGES.indexOf(project.stage) / (PROJECT_STAGES.length - 1);
  const taskShare = project.tasks.filter((task) => task.done).length / Math.max(project.tasks.length, 1);
  const deliverableShare =
    project.deliverables.filter((deliverable) => deliverable.ready).length /
    Math.max(project.deliverables.length, 1);
  return Math.round(stageShare * 40 + taskShare * 35 + deliverableShare * 25);
}

export function hexToRgba(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatDueDate(input: string): string {
  const dueDate = new Date(`${input}T12:00:00`);
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffInDays = Math.round((target.getTime() - now.getTime()) / 86400000);

  if (diffInDays === 0) {
    return 'Due today';
  }
  if (diffInDays === 1) {
    return 'Due tomorrow';
  }
  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)}d overdue`;
  }
  return `Due in ${diffInDays}d`;
}

export function buildDailyBriefing(projects: VoiceProject[]): string {
  const activeProjects = projects.filter((project) => project.stage !== 'Delivery');
  const blockers = activeProjects.flatMap((project) =>
    project.blockers.map((blocker) => `- ${project.title}: ${blocker}`),
  );

  return [
    'Voice Project Dashboard',
    '',
    `Active projects: ${activeProjects.length}`,
    `Priority lanes: ${activeProjects.filter((project) => project.priority).length}`,
    `Ready deliverables: ${projects.reduce((sum, project) => sum + project.deliverables.filter((item) => item.ready).length, 0)}`,
    '',
    'Priority projects:',
    ...activeProjects
      .filter((project) => project.priority)
      .map((project) => `- ${project.title} (${project.stage}, ${formatDueDate(project.dueDate)})`),
    '',
    'Blockers:',
    ...(blockers.length ? blockers : ['- None']),
  ].join('\n');
}
