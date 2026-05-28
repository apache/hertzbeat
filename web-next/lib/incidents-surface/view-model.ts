import { buildOpsFacts } from '../ops-surface/view-model';
import { buildIncidentsDomainModel, type IncidentSeverity, type IncidentStage } from './model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type IncidentsPlaceholderState = {
  kicker: string;
  title: string;
  subtitle: string;
  actions: Array<{ label: string; href: string; variant: 'primary' | 'subtle' }>;
  shell: {
    eyebrow: string;
    copy: string;
    chips: string[];
  };
  checklistTitle: string;
  checklist: Array<{ title: string; copy: string; tone: string }>;
  empty: {
    title: string;
    copy: string;
  };
};

export function buildIncidentsPlaceholderState(t: Translator): IncidentsPlaceholderState {
  return {
    kicker: t('incidents.entry.kicker'),
    title: t('incidents.entry.title'),
    subtitle: t('incidents.entry.subtitle'),
    actions: [
      { label: t('incidents.entry.action.overview'), href: '/overview', variant: 'primary' },
      { label: t('incidents.entry.action.entities'), href: '/entities', variant: 'subtle' }
    ],
    shell: {
      eyebrow: t('incidents.entry.shell.eyebrow'),
      copy: t('incidents.entry.shell.copy'),
      chips: [
        t('incidents.entry.chip.entry'),
        t('incidents.entry.chip.timeline'),
        t('incidents.entry.chip.owner-first')
      ]
    },
    checklistTitle: t('incidents.entry.checklist.title'),
    checklist: [
      {
        title: t('incidents.entry.checklist.context.title'),
        copy: t('incidents.entry.checklist.context.copy'),
        tone: 'bg-[#75ad86]'
      },
      {
        title: t('incidents.entry.checklist.adapter.title'),
        copy: t('incidents.entry.checklist.adapter.copy'),
        tone: 'bg-[#c2a86b]'
      },
      {
        title: t('incidents.entry.checklist.evidence.title'),
        copy: t('incidents.entry.checklist.evidence.copy'),
        tone: 'bg-[#9aa9cf]'
      }
    ],
    empty: {
      title: t('incidents.entry.empty.title'),
      copy: t('incidents.entry.empty.copy')
    }
  };
}

function formatSeverityTone(severity: IncidentSeverity) {
  return severity === 'critical' ? 'critical' : 'warning';
}

function formatStageTone(stage: IncidentStage) {
  if (stage === 'mitigating') return 'mitigating';
  if (stage === 'monitoring') return 'monitoring';
  return 'investigating';
}

export function buildIncidentsSurfaceViewModel(t: Translator) {
  const model = buildIncidentsDomainModel(t);

  return {
    ...model,
    kicker: t('incidents.surface.kicker'),
    facts: buildOpsFacts(model.title, model.focus, model.tags, t),
    incidentCards: model.incidents.map(item => ({
      id: item.id,
      eyebrow: `${formatSeverityTone(item.severity)} · ${item.blastRadius}`,
      title: item.title,
      copy: `${item.service} · ${item.owner}`,
      meta: `${formatStageTone(item.stage)} · ${item.openedAt}`,
      badges: [item.severity, item.stage]
    })),
    timelineRows: model.timeline,
    ownershipRows: model.ownership.map(item => ({
      title: `${item.owner} · ${item.queue}`,
      copy: item.copy,
      meta: item.meta
    })),
    handoffRows: [
      {
        title: t('incidents.surface.handoff.logs.title'),
        copy: t('incidents.surface.handoff.logs.copy'),
        meta: 'logs'
      },
      {
        title: t('incidents.surface.handoff.traces.title'),
        copy: t('incidents.surface.handoff.traces.copy'),
        meta: 'traces'
      },
      {
        title: t('incidents.surface.handoff.overview.title'),
        copy: t('incidents.surface.handoff.overview.copy'),
        meta: 'overview'
      }
    ]
  };
}
