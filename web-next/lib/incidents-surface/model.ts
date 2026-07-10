type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type IncidentSeverity = 'critical' | 'warning';
export type IncidentStage = 'investigating' | 'mitigating' | 'monitoring';

export type IncidentItem = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  service: string;
  owner: string;
  stage: IncidentStage;
  openedAt: string;
  blastRadius: string;
};

export type IncidentTimelineItem = {
  title: string;
  copy: string;
  meta: string;
};

export type IncidentOwnershipItem = {
  owner: string;
  queue: string;
  copy: string;
  meta: string;
};

export type IncidentsDomainModel = {
  title: string;
  subtitle: string;
  focus: string;
  summary: string;
  tags: string[];
  metrics: Array<{ label: string; value: string }>;
  incidents: IncidentItem[];
  timeline: IncidentTimelineItem[];
  ownership: IncidentOwnershipItem[];
  checklist: Array<{ title: string; copy: string; meta: string }>;
  nextHops: Array<{ label: string; href: string; variant: 'subtle' | 'default' | 'primary' }>;
};

export function buildIncidentsDomainModel(t: Translator): IncidentsDomainModel {
  const incidents: IncidentItem[] = [
    {
      id: 'inc-204',
      title: t('incidents.row.checkout.title'),
      severity: 'critical',
      service: t('incidents.row.checkout.service'),
      owner: t('incidents.row.checkout.owner'),
      stage: 'mitigating',
      openedAt: '2026-04-16 09:06',
      blastRadius: t('incidents.row.checkout.blast-radius')
    },
    {
      id: 'inc-203',
      title: t('incidents.row.collector.title'),
      severity: 'warning',
      service: t('incidents.row.collector.service'),
      owner: t('incidents.row.collector.owner'),
      stage: 'monitoring',
      openedAt: '2026-04-16 08:22',
      blastRadius: t('incidents.row.collector.blast-radius')
    },
    {
      id: 'inc-202',
      title: t('incidents.row.edge.title'),
      severity: 'warning',
      service: t('incidents.row.edge.service'),
      owner: t('incidents.row.edge.owner'),
      stage: 'investigating',
      openedAt: '2026-04-16 07:48',
      blastRadius: t('incidents.row.edge.blast-radius')
    }
  ];

  return {
    title: t('incidents.entry.title'),
    subtitle: t('incidents.subtitle'),
    focus: t('incidents.focus'),
    summary: t('incidents.summary'),
    tags: [
      t('incidents.tag.shell'),
      t('incidents.tag.timeline'),
      t('incidents.tag.owner-first')
    ],
    metrics: [
      { label: t('incidents.metric.open'), value: String(incidents.length) },
      { label: t('incidents.metric.critical'), value: String(incidents.filter(item => item.severity === 'critical').length) },
      { label: t('incidents.metric.mitigating'), value: String(incidents.filter(item => item.stage === 'mitigating').length) },
      { label: t('incidents.metric.ownership-queues'), value: '3' }
    ],
    incidents,
    timeline: [
      {
        title: t('incidents.timeline.checkout.title'),
        copy: t('incidents.timeline.checkout.copy'),
        meta: t('incidents.timeline.checkout.meta')
      },
      {
        title: t('incidents.timeline.collector.title'),
        copy: t('incidents.timeline.collector.copy'),
        meta: t('incidents.timeline.collector.meta')
      },
      {
        title: t('incidents.timeline.edge.title'),
        copy: t('incidents.timeline.edge.copy'),
        meta: t('incidents.timeline.edge.meta')
      }
    ],
    ownership: [
      {
        owner: t('incidents.ownership.checkout.owner'),
        queue: t('incidents.ownership.checkout.queue'),
        copy: t('incidents.ownership.checkout.copy'),
        meta: t('incidents.ownership.checkout.meta')
      },
      {
        owner: t('incidents.ownership.observability.owner'),
        queue: t('incidents.ownership.observability.queue'),
        copy: t('incidents.ownership.observability.copy'),
        meta: t('incidents.ownership.observability.meta')
      },
      {
        owner: t('incidents.ownership.edge.owner'),
        queue: t('incidents.ownership.edge.queue'),
        copy: t('incidents.ownership.edge.copy'),
        meta: t('incidents.ownership.edge.meta')
      }
    ],
    checklist: [
      { title: t('incidents.checklist.shell.title'), copy: t('incidents.checklist.shell.copy'), meta: t('incidents.checklist.shell.meta') },
      { title: t('incidents.checklist.adapter.title'), copy: t('incidents.checklist.adapter.copy'), meta: t('incidents.checklist.adapter.meta') },
      { title: t('incidents.checklist.drilldown.title'), copy: t('incidents.checklist.drilldown.copy'), meta: t('incidents.checklist.drilldown.meta') }
    ],
    nextHops: [
      { label: t('setting.status.title'), href: '/setting/status?tab=incident', variant: 'primary' },
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' },
      { label: t('menu.log.manage'), href: '/log/manage', variant: 'default' },
      { label: t('menu.trace.manage'), href: '/trace/manage', variant: 'default' }
    ]
  };
}
