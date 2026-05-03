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

export function buildIncidentsPlaceholderState(): IncidentsPlaceholderState {
  return {
    kicker: '事件入口',
    title: '故障事件',
    subtitle: '按 OTLP 工作台的冷色基线统一响应时间线、责任人和证据入口。',
    actions: [
      { label: '打开概览', href: '/overview', variant: 'primary' },
      { label: '查看对象', href: '/entities', variant: 'subtle' }
    ],
    shell: {
      eyebrow: '冷色入口已接入',
      copy:
        '此入口继承 OTLP 接入页的近黑画布、小按钮、硬边面板和静态右栏节奏，后续只需要接入事件适配器。',
      chips: ['事件入口', '响应时间线', '责任人优先']
    },
    checklistTitle: '接入清单',
    checklist: [
      {
        title: '统一入口上下文',
        copy: '已和 OTLP 基线共用同一套页面节奏。',
        tone: 'bg-[#75ad86]'
      },
      {
        title: '接入事件适配器',
        copy: '等事件列表、责任人和时间线数据落地后直接挂载。',
        tone: 'bg-[#c2a86b]'
      },
      {
        title: '保留证据跳转',
        copy: '日志、链路和对象入口保持在同一响应上下文。',
        tone: 'bg-[#9aa9cf]'
      }
    ],
    empty: {
      title: '等待接入事件适配器',
      copy: '视觉骨架已经统一到 OTLP 基线，后续数据接入可以增量完成。'
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
    kicker: 'Incident response desk',
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
      { title: 'Log evidence', copy: 'Jump into logs when mitigation needs fresh payload evidence.', meta: 'logs' },
      { title: 'Trace evidence', copy: 'Preserve trace-first drilldown for latency and dependency regressions.', meta: 'traces' },
      { title: 'Overview return path', copy: 'Keep incident status visible in the same global response rhythm.', meta: 'overview' }
    ]
  };
}
