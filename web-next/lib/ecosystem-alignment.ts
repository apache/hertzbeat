import { findForbiddenProductLanguage, type ExternalProductReferenceContext } from './hertzbeat-product-language';

export type EcosystemSourceKey = 'opentelemetry' | 'grafana' | 'datadog' | 'signoz';

export type EcosystemImportKind = 'otlp-pipeline' | 'dashboard' | 'alert-rule';

export type HertzBeatMigrationSurface =
  | 'otlp-center'
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'entity-catalog'
  | 'entity-workbench'
  | 'monitor-template'
  | 'monitor-detail'
  | 'alert-center'
  | 'notification-policy';

export type EcosystemMigrationMode =
  | 'native-otlp'
  | 'link-and-translate'
  | 'inventory-and-translate'
  | 'pipeline-repoint-and-review';

export interface EcosystemImportMapping {
  kind: EcosystemImportKind;
  sourceArtifact: string;
  hertzbeatTarget: string;
  targetSurfaces: HertzBeatMigrationSurface[];
  migrationMode: EcosystemMigrationMode;
  operatorReviewRequired: boolean;
  notes: string[];
}

export interface EcosystemSourcePlan {
  sourceKey: EcosystemSourceKey;
  sourceName: string;
  referenceContext: ExternalProductReferenceContext;
  benchmarkRole: string;
  migrationPrinciple: string;
  pageIdentityBorrowed: boolean;
  sourceStyleCopied: boolean;
  importMappings: EcosystemImportMapping[];
  nonGoals: string[];
}

export interface EcosystemAlignment {
  positioning: {
    deploymentModel: 'open-source-private-deployable';
    statement: string;
    coreLoop: string[];
  };
  sourcePlans: EcosystemSourcePlan[];
}

export type EcosystemAlignmentIssue =
  | `missing-source:${EcosystemSourceKey}`
  | `missing-import:${EcosystemSourceKey}:${'dashboard' | 'alert-rule'}`
  | `missing-non-goals:${EcosystemSourceKey}`
  | `borrowed-identity:${EcosystemSourceKey}`;

export type EcosystemCutoverStepKey =
  | 'inventory-source-artifacts'
  | 'map-identity-and-labels'
  | 'configure-otlp-ingest'
  | 'verify-three-signal-ingest'
  | 'translate-dashboards'
  | 'translate-alert-rules'
  | 'operator-review'
  | 'hertzbeat-cutover';

export interface EcosystemCutoverStep {
  key: EcosystemCutoverStepKey;
  label: string;
  targetSurfaces: HertzBeatMigrationSurface[];
  reviewGate: boolean;
}

export interface EcosystemMigrationPlan {
  sourceKey: EcosystemSourceKey;
  sourceName: string;
  reviewRequired: boolean;
  cutoverSteps: EcosystemCutoverStep[];
  blockedNarratives: string[];
}

export type EcosystemCapability =
  | 'otlp-three-signal-ingest'
  | 'resource-to-entity-resolution'
  | 'dashboard-import'
  | 'alert-rule-import'
  | 'topology-and-evidence-handoff'
  | 'safe-automation';

export interface EcosystemCapabilityRow {
  capability: EcosystemCapability;
  benchmarkSources: EcosystemSourceKey[];
  hertzbeatTarget: string;
  migrationAction: string;
  externalReferenceContext: ExternalProductReferenceContext;
  pageIdentityBorrowed: boolean;
}

export const REQUIRED_ECOSYSTEM_SOURCES: EcosystemSourceKey[] = ['opentelemetry', 'grafana', 'datadog', 'signoz'];
export const REQUIRED_ECOSYSTEM_CAPABILITIES: EcosystemCapability[] = [
  'otlp-three-signal-ingest',
  'resource-to-entity-resolution',
  'dashboard-import',
  'alert-rule-import',
  'topology-and-evidence-handoff',
  'safe-automation'
];

const dashboardTargets: HertzBeatMigrationSurface[] = ['monitor-template', 'entity-workbench', 'monitor-detail'];
const alertTargets: HertzBeatMigrationSurface[] = ['alert-center', 'notification-policy', 'entity-workbench'];

export const ECOSYSTEM_ALIGNMENT: EcosystemAlignment = {
  positioning: {
    deploymentModel: 'open-source-private-deployable',
    statement:
      'HertzBeat is an open-source private-deployable observability platform that forms an enterprise operations loop through collectors, monitor templates, OTLP three signals, entity catalog, alert closure, and safe automation.',
    coreLoop: ['collectors', 'monitor-templates', 'otlp-three-signals', 'entity-catalog', 'alert-closure', 'safe-automation']
  },
  sourcePlans: [
    {
      sourceKey: 'opentelemetry',
      sourceName: 'OpenTelemetry',
      referenceContext: 'compatibility-note',
      benchmarkRole: 'OTLP protocol and semantic compatibility standard',
      migrationPrinciple:
        'Keep existing SDK or Collector pipelines, repoint OTLP metrics, logs, and traces into HertzBeat, then resolve resources into entities.',
      pageIdentityBorrowed: false,
      sourceStyleCopied: false,
      importMappings: [
        {
          kind: 'otlp-pipeline',
          sourceArtifact: 'OpenTelemetry SDK or Collector OTLP exporters',
          hertzbeatTarget: 'HertzBeat OTLP ingest endpoints plus entity/resource catalog resolution',
          targetSurfaces: ['otlp-center', 'metrics', 'logs', 'traces', 'entity-catalog'],
          migrationMode: 'native-otlp',
          operatorReviewRequired: false,
          notes: [
            'Preserve resource attributes for identity resolution.',
            'Use HertzBeat ingestion tokens and workspace scope instead of external account identity.'
          ]
        }
      ],
      nonGoals: ['replace-opentelemetry-collector', 'copy-external-protocol-docs', 'invent-non-otlp-signal-model']
    },
    {
      sourceKey: 'grafana',
      sourceName: 'Grafana',
      referenceContext: 'migration-source',
      benchmarkRole: 'dashboard and alert migration benchmark',
      migrationPrinciple:
        'Treat dashboards and alert rules as source artifacts; translate them into HertzBeat monitor templates, entity workbench evidence, and alert closure flows.',
      pageIdentityBorrowed: false,
      sourceStyleCopied: false,
      importMappings: [
        {
          kind: 'dashboard',
          sourceArtifact: 'Dashboard JSON or linked dashboard template',
          hertzbeatTarget: 'Monitor template, monitor detail, and entity workbench evidence entry points',
          targetSurfaces: dashboardTargets,
          migrationMode: 'link-and-translate',
          operatorReviewRequired: true,
          notes: [
            'Keep existing Grafana links when configured on a monitor.',
            'Translate panels only when their data source and HertzBeat metric template are known.'
          ]
        },
        {
          kind: 'alert-rule',
          sourceArtifact: 'Grafana-managed alert rule definitions',
          hertzbeatTarget: 'HertzBeat alert rules, inhibit/silence policy, and notification routes',
          targetSurfaces: alertTargets,
          migrationMode: 'inventory-and-translate',
          operatorReviewRequired: true,
          notes: [
            'Carry threshold intent, labels, and notification ownership forward.',
            'Require operator review for query expressions and notification semantics.'
          ]
        }
      ],
      nonGoals: ['copy-grafana-dashboard-layout', 'clone-panel-plugin-dsl', 'make-grafana-the-primary-ia']
    },
    {
      sourceKey: 'datadog',
      sourceName: 'Datadog',
      referenceContext: 'migration-source',
      benchmarkRole: 'SaaS dashboard and monitor migration benchmark',
      migrationPrinciple:
        'Use exported dashboard and monitor inventory only as migration input, then rebuild around HertzBeat collectors, templates, entities, alerts, and private deployment.',
      pageIdentityBorrowed: false,
      sourceStyleCopied: false,
      importMappings: [
        {
          kind: 'dashboard',
          sourceArtifact: 'Dashboard JSON or dashboard API inventory',
          hertzbeatTarget: 'Monitor template coverage, entity workbench drilldowns, and signal-specific views',
          targetSurfaces: dashboardTargets,
          migrationMode: 'inventory-and-translate',
          operatorReviewRequired: true,
          notes: [
            'Translate widgets into HertzBeat-native signal views only when metric/log/trace sources are mapped.',
            'Keep SaaS account, pricing, notebook, and collaboration concepts out of HertzBeat page identity.'
          ]
        },
        {
          kind: 'alert-rule',
          sourceArtifact: 'Monitor API inventory',
          hertzbeatTarget: 'HertzBeat threshold rules, alert grouping, silence/inhibit, and notification closure',
          targetSurfaces: alertTargets,
          migrationMode: 'inventory-and-translate',
          operatorReviewRequired: true,
          notes: [
            'Map monitor thresholds and scoped tags to HertzBeat alert labels and resources.',
            'Require review before enabling actions because notification semantics differ by environment.'
          ]
        }
      ],
      nonGoals: ['copy-datadog-saas-packaging', 'copy-datadog-dashboard-widgets', 'represent-cost-or-tenant-governance']
    },
    {
      sourceKey: 'signoz',
      sourceName: 'SigNoZ',
      referenceContext: 'migration-source',
      benchmarkRole: 'OpenTelemetry-native migration benchmark',
      migrationPrinciple:
        'Repoint OTLP pipelines into HertzBeat and translate dashboards or alerts only as reviewed source artifacts, preserving HertzBeat entity and alert closure workflows.',
      pageIdentityBorrowed: false,
      sourceStyleCopied: false,
      importMappings: [
        {
          kind: 'otlp-pipeline',
          sourceArtifact: 'OTLP metrics, logs, and traces pipeline',
          hertzbeatTarget: 'HertzBeat OTLP center, three signal workbenches, and entity/resource catalog',
          targetSurfaces: ['otlp-center', 'metrics', 'logs', 'traces', 'entity-catalog'],
          migrationMode: 'pipeline-repoint-and-review',
          operatorReviewRequired: true,
          notes: [
            'Preserve service namespace, service name, environment, and deployment attributes.',
            'Confirm ingestion tokens, quotas, and redaction policy before cutover.'
          ]
        },
        {
          kind: 'dashboard',
          sourceArtifact: 'Dashboard or query inventory',
          hertzbeatTarget: 'Entity workbench, monitor detail, and signal-specific views',
          targetSurfaces: dashboardTargets,
          migrationMode: 'inventory-and-translate',
          operatorReviewRequired: true,
          notes: ['Translate useful operational views into HertzBeat entity or monitor context instead of copying page hierarchy.']
        },
        {
          kind: 'alert-rule',
          sourceArtifact: 'Alert rule inventory',
          hertzbeatTarget: 'HertzBeat alert center, grouping, silence/inhibit, and notification policy',
          targetSurfaces: alertTargets,
          migrationMode: 'inventory-and-translate',
          operatorReviewRequired: true,
          notes: ['Review labels, routing, and evidence links before enabling alert closure automation.']
        }
      ],
      nonGoals: ['copy-signoz-page-hierarchy', 'copy-signoz-query-workbench', 'describe-hertzbeat-as-apm-only']
    }
  ]
};

export function getEcosystemSourcePlan(sourceKey: EcosystemSourceKey): EcosystemSourcePlan {
  const plan = ECOSYSTEM_ALIGNMENT.sourcePlans.find(candidate => candidate.sourceKey === sourceKey);

  if (!plan) {
    throw new Error(`Missing ecosystem source plan: ${sourceKey}`);
  }

  return plan;
}

export function validateEcosystemAlignment(alignment: EcosystemAlignment): EcosystemAlignmentIssue[] {
  const issues: EcosystemAlignmentIssue[] = [];

  for (const sourceKey of REQUIRED_ECOSYSTEM_SOURCES) {
    const plan = alignment.sourcePlans.find(candidate => candidate.sourceKey === sourceKey);

    if (!plan) {
      issues.push(`missing-source:${sourceKey}`);
      continue;
    }

    if (plan.pageIdentityBorrowed || plan.sourceStyleCopied || plan.referenceContext === 'product-copy') {
      issues.push(`borrowed-identity:${sourceKey}`);
    }

    if (sourceKey !== 'opentelemetry') {
      for (const kind of ['dashboard', 'alert-rule'] as const) {
        if (!plan.importMappings.some(mapping => mapping.kind === kind)) {
          issues.push(`missing-import:${sourceKey}:${kind}`);
        }
      }
    }

    if (plan.nonGoals.length === 0) {
      issues.push(`missing-non-goals:${sourceKey}`);
    }
  }

  return issues;
}

function buildStep(
  key: EcosystemCutoverStepKey,
  label: string,
  targetSurfaces: HertzBeatMigrationSurface[],
  reviewGate = false
): EcosystemCutoverStep {
  return { key, label, targetSurfaces, reviewGate };
}

function hasMapping(plan: EcosystemSourcePlan, kind: EcosystemImportKind) {
  return plan.importMappings.some(mapping => mapping.kind === kind);
}

function surfacesFor(plan: EcosystemSourcePlan, kind: EcosystemImportKind): HertzBeatMigrationSurface[] {
  return [...new Set(plan.importMappings.filter(mapping => mapping.kind === kind).flatMap(mapping => mapping.targetSurfaces))];
}

export function buildEcosystemMigrationPlan(
  sourceKey: EcosystemSourceKey,
  alignment: EcosystemAlignment = ECOSYSTEM_ALIGNMENT
): EcosystemMigrationPlan {
  const plan = alignment.sourcePlans.find(candidate => candidate.sourceKey === sourceKey);

  if (!plan) {
    throw new Error(`Missing ecosystem source plan: ${sourceKey}`);
  }

  const cutoverSteps: EcosystemCutoverStep[] = [
    buildStep('inventory-source-artifacts', 'Inventory migration source artifacts', []),
    buildStep('map-identity-and-labels', 'Map resource identity, labels, and ownership into HertzBeat entities', [
      'entity-catalog'
    ])
  ];

  if (hasMapping(plan, 'otlp-pipeline')) {
    cutoverSteps.push(
      buildStep('configure-otlp-ingest', 'Configure HertzBeat OTLP ingest endpoints and tokens', surfacesFor(plan, 'otlp-pipeline')),
      buildStep('verify-three-signal-ingest', 'Verify metrics, logs, traces, and entity resolution before cutover', [
        'metrics',
        'logs',
        'traces',
        'entity-catalog'
      ])
    );
  }

  if (hasMapping(plan, 'dashboard')) {
    cutoverSteps.push(
      buildStep('translate-dashboards', 'Translate dashboard intent into HertzBeat monitor and entity views', surfacesFor(plan, 'dashboard'), true)
    );
  }

  if (hasMapping(plan, 'alert-rule')) {
    cutoverSteps.push(
      buildStep('translate-alert-rules', 'Translate alert intent into HertzBeat alert closure policy', surfacesFor(plan, 'alert-rule'), true)
    );
  }

  if (plan.importMappings.some(mapping => mapping.operatorReviewRequired)) {
    cutoverSteps.push(
      buildStep('operator-review', 'Review translated thresholds, labels, routing, and evidence links before enabling automation', [
        'alert-center',
        'entity-workbench'
      ], true)
    );
  }

  cutoverSteps.push(
    buildStep('hertzbeat-cutover', 'Cut over to HertzBeat-native collector, template, entity, signal, and alert workflows', [
      'otlp-center',
      'entity-workbench',
      'alert-center'
    ])
  );

  return {
    sourceKey: plan.sourceKey,
    sourceName: plan.sourceName,
    reviewRequired: plan.importMappings.some(mapping => mapping.operatorReviewRequired),
    cutoverSteps,
    blockedNarratives: [...plan.nonGoals]
  };
}

export function buildEcosystemCapabilityMatrix(): EcosystemCapabilityRow[] {
  return [
    {
      capability: 'otlp-three-signal-ingest',
      benchmarkSources: ['opentelemetry', 'signoz'],
      hertzbeatTarget: 'native OTLP metrics, logs, and traces ingest through HertzBeat workspace tokens',
      migrationAction: 'repoint SDK or Collector OTLP exporters, then validate RED ingest evidence',
      externalReferenceContext: 'compatibility-note',
      pageIdentityBorrowed: false
    },
    {
      capability: 'resource-to-entity-resolution',
      benchmarkSources: ['opentelemetry', 'signoz'],
      hertzbeatTarget: 'entity catalog resolution from service, namespace, environment, and HertzBeat identity attributes',
      migrationAction: 'map resource attributes into entity identities and review unresolved candidates',
      externalReferenceContext: 'compatibility-note',
      pageIdentityBorrowed: false
    },
    {
      capability: 'dashboard-import',
      benchmarkSources: ['grafana', 'datadog', 'signoz'],
      hertzbeatTarget: 'reviewed monitor templates, monitor detail context, and entity workbench views',
      migrationAction: 'inventory dashboards as source artifacts and translate only mapped signal views',
      externalReferenceContext: 'migration-source',
      pageIdentityBorrowed: false
    },
    {
      capability: 'alert-rule-import',
      benchmarkSources: ['grafana', 'datadog', 'signoz'],
      hertzbeatTarget: 'HertzBeat alert closure through grouping, silence, inhibit, and notification policy',
      migrationAction: 'translate threshold intent, labels, routing, and evidence links with operator review',
      externalReferenceContext: 'migration-source',
      pageIdentityBorrowed: false
    },
    {
      capability: 'topology-and-evidence-handoff',
      benchmarkSources: ['opentelemetry', 'grafana', 'datadog', 'signoz'],
      hertzbeatTarget: 'entity-centered topology, alert evidence, and cross-signal drilldowns',
      migrationAction: 'derive handoffs from HertzBeat entity relations and real telemetry evidence',
      externalReferenceContext: 'compatibility-note',
      pageIdentityBorrowed: false
    },
    {
      capability: 'safe-automation',
      benchmarkSources: ['grafana', 'datadog', 'signoz'],
      hertzbeatTarget: 'reviewed HertzBeat notification, runbook, and automation actions inside private deployment',
      migrationAction: 'require operator review before enabling migrated actions or notification semantics',
      externalReferenceContext: 'migration-source',
      pageIdentityBorrowed: false
    }
  ];
}

export function validateEcosystemCompletionGate(alignment: EcosystemAlignment = ECOSYSTEM_ALIGNMENT): string[] {
  const issues = validateEcosystemAlignment(alignment).map(issue => `alignment:${issue}`);
  const capabilityMatrix = buildEcosystemCapabilityMatrix();

  if (alignment.positioning.deploymentModel !== 'open-source-private-deployable') {
    issues.push('missing-private-deployable-positioning');
  }

  if (!alignment.positioning.statement.includes('OTLP three signals') || !alignment.positioning.statement.includes('entity catalog')) {
    issues.push('missing-otel-entity-positioning');
  }

  if (findForbiddenProductLanguage(alignment.positioning.statement).length > 0) {
    issues.push('forbidden-positioning-language');
  }

  for (const sourceKey of REQUIRED_ECOSYSTEM_SOURCES) {
    const plan = alignment.sourcePlans.find(candidate => candidate.sourceKey === sourceKey);
    if (!plan) {
      continue;
    }

    const migrationPlan = buildEcosystemMigrationPlan(sourceKey, alignment);
    if (migrationPlan.cutoverSteps.length < 4) {
      issues.push(`incomplete-migration-plan:${sourceKey}`);
    }

    if (migrationPlan.blockedNarratives.length === 0) {
      issues.push(`missing-blocked-narratives:${sourceKey}`);
    }
  }

  for (const capability of REQUIRED_ECOSYSTEM_CAPABILITIES) {
    const row = capabilityMatrix.find(candidate => candidate.capability === capability);
    if (!row) {
      issues.push(`missing-capability:${capability}`);
      continue;
    }

    if (row.externalReferenceContext === 'product-copy' || row.pageIdentityBorrowed) {
      issues.push(`borrowed-capability-identity:${capability}`);
    }

  }

  return issues;
}
