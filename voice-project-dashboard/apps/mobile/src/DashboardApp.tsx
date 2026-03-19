import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

import {
  FILTER_STAGES,
  PROJECT_STAGES,
  STAGE_COLORS,
  STORAGE_KEY,
  DEFAULT_PROJECTS,
  type FilterStage,
  type VoiceProject,
  buildDailyBriefing,
  cloneProjects,
  computeCompletion,
  formatDueDate,
  hexToRgba,
} from './dashboardData';
import { styles } from './dashboardStyles';

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHelper}>{helper}</Text>
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: FilterStage; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.filterChipPressed]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ChecklistRow({
  activeColor,
  label,
  onPress,
  selected,
}: {
  activeColor: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.checklistRow, pressed && styles.checklistRowPressed]}>
      <View style={[styles.checkbox, selected && { backgroundColor: activeColor, borderColor: activeColor }]}>
        {selected ? <Text style={styles.checkboxMark}>OK</Text> : null}
      </View>
      <Text style={[styles.checklistLabel, selected && styles.checklistLabelDone]}>{label}</Text>
    </Pressable>
  );
}

function ProjectCard({
  isSelected,
  onAdvance,
  onPress,
  onTogglePriority,
  project,
}: {
  isSelected: boolean;
  onAdvance: () => void;
  onPress: () => void;
  onTogglePriority: () => void;
  project: VoiceProject;
}) {
  const completion = computeCompletion(project);
  const stageColor = STAGE_COLORS[project.stage];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.projectCard, isSelected && styles.projectCardSelected, pressed && styles.projectCardPressed]}>
      <View style={styles.projectHeaderRow}>
        <View style={styles.projectTitleWrap}>
          <Text style={styles.projectTitle}>{project.title}</Text>
          <Text style={styles.projectClient}>{project.client}</Text>
        </View>
        <View style={[styles.stageBadge, { backgroundColor: hexToRgba(stageColor, 0.18), borderColor: hexToRgba(stageColor, 0.35) }]}>
          <Text style={[styles.stageBadgeText, { color: stageColor }]}>{project.stage}</Text>
        </View>
      </View>

      <Text style={styles.projectSummary}>{project.summary}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{formatDueDate(project.dueDate)}</Text>
        <Text style={styles.metaLabel}>{project.languages.join(' / ')}</Text>
        <Text style={styles.metaLabel}>{project.budget}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: stageColor }]} />
      </View>
      <Text style={styles.progressText}>{completion}% pipeline complete</Text>

      <View style={styles.tagRow}>
        <View style={styles.inlineTag}><Text style={styles.inlineTagText}>{project.runtimeMinutes} min</Text></View>
        <View style={styles.inlineTag}><Text style={styles.inlineTagText}>{project.scriptPages} pages</Text></View>
        {project.blockers.length ? (
          <View style={[styles.inlineTag, styles.blockerTag]}>
            <Text style={[styles.inlineTagText, styles.blockerTagText]}>{project.blockers.length} blocker</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.projectActions}>
        <Pressable onPress={onAdvance} style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}>
          <Text style={styles.secondaryActionText}>Advance stage</Text>
        </Pressable>
        <Pressable
          onPress={onTogglePriority}
          style={({ pressed }) => [styles.secondaryAction, project.priority && styles.priorityAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={[styles.secondaryActionText, project.priority && styles.priorityActionText]}>
            {project.priority ? 'Priority on' : 'Set priority'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function DashboardApp() {
  const { width } = useWindowDimensions();
  const isTabletUp = width >= 760;
  const isDesktop = width >= 1120;
  const [projects, setProjects] = useState<VoiceProject[]>(() => cloneProjects(DEFAULT_PROJECTS));
  const [selectedProjectId, setSelectedProjectId] = useState(DEFAULT_PROJECTS[0].id);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStage>('All');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Voice Project Dashboard';
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setIsHydrated(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VoiceProject[];
        if (Array.isArray(parsed) && parsed.length) {
          setProjects(parsed);
          setSelectedProjectId(parsed[0].id);
        }
      }
    } catch {
      setProjects(cloneProjects(DEFAULT_PROJECTS));
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isHydrated && Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [isHydrated, projects]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timer = setTimeout(() => setCopyMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [copyMessage]);

  const visibleProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return [...projects]
      .filter((project) => (activeFilter === 'All' ? true : project.stage === activeFilter))
      .filter((project) => {
        if (!query) return true;
        return [project.title, project.client, project.owner, project.summary, project.voiceStyle, project.languages.join(' ')].join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) return left.priority ? -1 : 1;
        return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      });
  }, [activeFilter, projects, searchValue]);

  useEffect(() => {
    if (!visibleProjects.some((project) => project.id === selectedProjectId) && visibleProjects[0]) {
      setSelectedProjectId(visibleProjects[0].id);
    }
  }, [selectedProjectId, visibleProjects]);

  const selectedProject = visibleProjects.find((project) => project.id === selectedProjectId) ?? projects.find((project) => project.id === selectedProjectId) ?? visibleProjects[0] ?? projects[0];

  const stats = useMemo(() => ({
    activeProjects: projects.filter((project) => project.stage !== 'Delivery').length,
    readyDeliverables: projects.reduce((count, project) => count + project.deliverables.filter((item) => item.ready).length, 0),
    dueSoon: projects.filter((project) => project.stage !== 'Delivery' && new Date(project.dueDate).getTime() - Date.now() < 4 * 86400000).length,
    bookedMinutes: projects.filter((project) => project.stage !== 'Delivery').reduce((total, project) => total + project.runtimeMinutes, 0),
  }), [projects]);

  const nextSessions = useMemo(() => visibleProjects.flatMap((project) => project.sessions.map((session) => ({ id: session.id, label: project.title, stage: project.stage, talent: session.talent, window: session.window }))), [visibleProjects]);
  const attentionItems = useMemo(() => projects.filter((project) => project.priority || project.blockers.length).flatMap((project) => project.blockers.length ? project.blockers.map((blocker) => `${project.title}: ${blocker}`) : [`${project.title}: priority lane is active`]).slice(0, 4), [projects]);

  const updateProject = (projectId: string, updater: (project: VoiceProject) => VoiceProject) => {
    setProjects((current) => current.map((project) => (project.id === projectId ? updater(project) : project)));
  };

  const toggleTask = (projectId: string, taskId: string) => updateProject(projectId, (project) => ({ ...project, tasks: project.tasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task) }));
  const toggleDeliverable = (projectId: string, deliverableId: string) => updateProject(projectId, (project) => ({ ...project, deliverables: project.deliverables.map((deliverable) => deliverable.id === deliverableId ? { ...deliverable, ready: !deliverable.ready } : deliverable) }));
  const togglePriority = (projectId: string) => updateProject(projectId, (project) => ({ ...project, priority: !project.priority }));
  const advanceStage = (projectId: string) => updateProject(projectId, (project) => ({ ...project, stage: PROJECT_STAGES[Math.min(PROJECT_STAGES.indexOf(project.stage) + 1, PROJECT_STAGES.length - 1)] }));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#09110f', '#10211d', '#1b312a']} style={styles.backgroundGlow} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.shell}>
          <LinearGradient colors={['#18362f', '#10231f', '#0c1513']} style={styles.heroCard}>
            <View style={[styles.heroLayout, !isTabletUp && styles.heroLayoutStacked]}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Forest HUB launch lane</Text>
                <Text style={styles.heroTitle}>Voice Project Dashboard</Text>
                <Text style={styles.heroSubtitle}>Track active voice jobs, session readiness, and delivery risk from one responsive control room.</Text>
                <View style={styles.heroButtons}>
                  <Pressable onPress={async () => { try { await Clipboard.setStringAsync(buildDailyBriefing(projects)); setCopyMessage('Daily briefing copied.'); } catch { setCopyMessage('Clipboard access was unavailable.'); } }} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}>
                    <Text style={styles.primaryActionText}>Copy daily briefing</Text>
                  </Pressable>
                  <Pressable onPress={() => { const reset = cloneProjects(DEFAULT_PROJECTS); setProjects(reset); setSelectedProjectId(reset[0].id); setCopyMessage('Demo data restored.'); }} style={({ pressed }) => [styles.secondaryHeroAction, pressed && styles.secondaryActionPressed]}>
                    <Text style={styles.secondaryHeroActionText}>Reset demo</Text>
                  </Pressable>
                </View>
                <Text style={styles.heroFootnote}>{copyMessage ?? 'Edits save locally in the browser so the dashboard survives reloads.'}</Text>
              </View>
              <View style={styles.heroSnapshot}>
                <StatCard label="Active jobs" value={String(stats.activeProjects)} helper="Projects still moving through intake, record, or edit." />
                <StatCard label="Ready deliverables" value={String(stats.readyDeliverables)} helper="Exports and packets that can ship today." />
                <StatCard label="Due inside 4d" value={String(stats.dueSoon)} helper="Projects that need producer attention this week." />
                <StatCard label="Booked runtime" value={`${stats.bookedMinutes} min`} helper="Total material scheduled across active work." />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.filtersCard}>
            <TextInput accessibilityLabel="Search voice projects" onChangeText={setSearchValue} placeholder="Search by client, project, owner, language, or tone..." placeholderTextColor="#7a968c" style={styles.searchInput} value={searchValue} />
            <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
              {FILTER_STAGES.map((stage) => <FilterChip active={activeFilter === stage} key={stage} label={stage} onPress={() => setActiveFilter(stage)} />)}
            </ScrollView>
          </View>

          <View style={[styles.mainColumns, !isDesktop && styles.mainColumnsStacked]}>
            <View style={[styles.detailColumn, !isDesktop && styles.detailColumnFull]}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Project board</Text><Text style={styles.sectionHelper}>{visibleProjects.length} visible</Text></View>
              <View style={styles.projectGrid}>
                {visibleProjects.map((project) => <ProjectCard isSelected={selectedProject?.id === project.id} key={project.id} onAdvance={() => advanceStage(project.id)} onPress={() => setSelectedProjectId(project.id)} onTogglePriority={() => togglePriority(project.id)} project={project} />)}
                {!visibleProjects.length ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No projects match the current filter.</Text><Text style={styles.emptyCopy}>Clear the search or switch back to All to see the full dashboard lane.</Text></View> : null}
              </View>
            </View>

            <View style={[styles.sidebarColumn, !isDesktop && styles.sidebarColumnFull]}>
              {selectedProject ? (
                <View style={styles.detailPanel}>
                  <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Selected project</Text><Text style={styles.sectionHelper}>{selectedProject.owner}</Text></View>
                  <Text style={styles.detailTitle}>{selectedProject.title}</Text>
                  <Text style={styles.detailSummary}>{selectedProject.voiceStyle}</Text>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>{computeCompletion(selectedProject)}%</Text><Text style={styles.metricLabel}>Completion</Text></View>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>{selectedProject.deliverables.length}</Text><Text style={styles.metricLabel}>Deliverables</Text></View>
                    <View style={styles.metricCard}><Text style={styles.metricValue}>{selectedProject.sessions.length}</Text><Text style={styles.metricLabel}>Sessions</Text></View>
                  </View>
                  <Text style={styles.panelTitle}>Checklist</Text>
                  <View style={styles.panelGroup}>{selectedProject.tasks.map((task) => <ChecklistRow activeColor={STAGE_COLORS[selectedProject.stage]} key={task.id} label={task.label} onPress={() => toggleTask(selectedProject.id, task.id)} selected={task.done} />)}</View>
                  <Text style={styles.panelTitle}>Deliverables</Text>
                  <View style={styles.panelGroup}>{selectedProject.deliverables.map((deliverable) => <ChecklistRow activeColor="#7CD7A8" key={deliverable.id} label={deliverable.label} onPress={() => toggleDeliverable(selectedProject.id, deliverable.id)} selected={deliverable.ready} />)}</View>
                  <Text style={styles.panelTitle}>Producer notes</Text>
                  <TextInput accessibilityLabel="Producer notes" multiline onChangeText={(text) => updateProject(selectedProject.id, (project) => ({ ...project, notes: text }))} placeholder="Capture direction changes, pickups, or mix notes..." placeholderTextColor="#739082" style={styles.notesInput} textAlignVertical="top" value={selectedProject.notes} />
                </View>
              ) : null}

              <View style={styles.detailPanel}>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today</Text><Text style={styles.sectionHelper}>Session radar</Text></View>
                {nextSessions.map((session) => <View key={session.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineContent}><Text style={styles.timelineTitle}>{session.label}</Text><Text style={styles.timelineMeta}>{session.window} | {session.talent} | {session.stage}</Text></View></View>)}
                {!nextSessions.length ? <Text style={styles.dimText}>No sessions match the current filter.</Text> : null}
                <Text style={[styles.panelTitle, styles.panelTitleSpacing]}>Attention lane</Text>
                {attentionItems.map((item) => <View key={item} style={styles.attentionRow}><Text style={styles.attentionText}>{item}</Text></View>)}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
