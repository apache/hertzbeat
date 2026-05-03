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
      title: 'Checkout latency spike across prod-ap',
      severity: 'critical',
      service: 'checkout',
      owner: 'checkout-oncall',
      stage: 'mitigating',
      openedAt: '2026-04-16 09:06',
      blastRadius: '2 regions'
    },
    {
      id: 'inc-203',
      title: 'Collector queue delay on metrics ingestion',
      severity: 'warning',
      service: 'otlp-gateway',
      owner: 'observability',
      stage: 'monitoring',
      openedAt: '2026-04-16 08:22',
      blastRadius: 'metrics only'
    },
    {
      id: 'inc-202',
      title: 'Edge proxy saturation after deploy',
      severity: 'warning',
      service: 'edge-proxy',
      owner: 'edge-sre',
      stage: 'investigating',
      openedAt: '2026-04-16 07:48',
      blastRadius: 'cn-hz ingress'
    }
  ];

  return {
    title: 'Incidents',
    subtitle: t('incidents.subtitle'),
    focus: t('incidents.focus'),
    summary: t('incidents.summary'),
    tags: ['incident shell', 'response timeline', 'owner-first'],
    metrics: [
      { label: 'Open incidents', value: String(incidents.length) },
      { label: 'Critical', value: String(incidents.filter(item => item.severity === 'critical').length) },
      { label: 'Mitigating', value: String(incidents.filter(item => item.stage === 'mitigating').length) },
      { label: 'Ownership queues', value: '3' }
    ],
    incidents,
    timeline: [
      {
        title: '09:08 mitigation started',
        copy: 'Rollback and restart actions were opened from the alert evidence bundle.',
        meta: 'checkout latency incident'
      },
      {
        title: '08:33 metrics replay approved',
        copy: 'Collector backlog dropped below the replay threshold and handoff stayed in the same rail.',
        meta: 'ingestion incident'
      },
      {
        title: '07:56 edge saturation escalated',
        copy: 'Operator routed the incident from monitor detail to trace and log evidence.',
        meta: 'edge incident'
      }
    ],
    ownership: [
      {
        owner: 'checkout-oncall',
        queue: 'primary responder',
        copy: 'Keeps alert, trace, and deploy context bound to the active mitigation thread.',
        meta: '2 active handoffs'
      },
      {
        owner: 'observability',
        queue: 'signal validation',
        copy: 'Validates replay safety and ingestion recovery before closing the incident.',
        meta: '1 active handoff'
      },
      {
        owner: 'edge-sre',
        queue: 'capacity review',
        copy: 'Tracks post-deploy regressions and the next rollback checkpoint.',
        meta: 'awaiting rollback note'
      }
    ],
    checklist: [
      { title: t('incidents.checklist.shell.title'), copy: t('incidents.checklist.shell.copy'), meta: 'done' },
      { title: t('incidents.checklist.adapter.title'), copy: t('incidents.checklist.adapter.copy'), meta: 'next' },
      { title: t('incidents.checklist.drilldown.title'), copy: t('incidents.checklist.drilldown.copy'), meta: 'reserved' }
    ],
    nextHops: [
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' },
      { label: t('menu.log.manage'), href: '/log/manage', variant: 'default' },
      { label: t('menu.trace.manage'), href: '/trace/manage', variant: 'primary' }
    ]
  };
}
