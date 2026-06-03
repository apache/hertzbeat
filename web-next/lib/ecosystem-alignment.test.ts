import { describe, expect, it } from 'vitest';

import {
  ECOSYSTEM_ALIGNMENT,
  REQUIRED_ECOSYSTEM_CAPABILITIES,
  REQUIRED_ECOSYSTEM_SOURCES,
  buildEcosystemCapabilityMatrix,
  buildEcosystemMigrationPlan,
  getEcosystemSourcePlan,
  validateEcosystemAlignment,
  validateEcosystemCompletionGate
} from './ecosystem-alignment';
import { findForbiddenProductLanguage, isAllowedExternalProductReference } from './hertzbeat-product-language';

describe('HertzBeat ecosystem alignment contract', () => {
  it('anchors HertzBeat as OTel-first, private-deployable, and entity-centered', () => {
    expect(ECOSYSTEM_ALIGNMENT.positioning.deploymentModel).toBe('open-source-private-deployable');
    expect(ECOSYSTEM_ALIGNMENT.positioning.statement).toContain('OTLP three signals');
    expect(ECOSYSTEM_ALIGNMENT.positioning.statement).toContain('entity catalog');
    expect(ECOSYSTEM_ALIGNMENT.positioning.statement).toContain('private-deployable');
    expect(ECOSYSTEM_ALIGNMENT.positioning.coreLoop).toEqual(
      expect.arrayContaining(['collectors', 'monitor-templates', 'otlp-three-signals', 'entity-catalog', 'alert-closure'])
    );
    expect(findForbiddenProductLanguage(ECOSYSTEM_ALIGNMENT.positioning.statement)).toEqual([]);
  });

  it('uses benchmark products only as migration or compatibility references', () => {
    expect(REQUIRED_ECOSYSTEM_SOURCES).toEqual(['opentelemetry', 'grafana', 'datadog', 'signoz']);

    for (const sourceKey of REQUIRED_ECOSYSTEM_SOURCES) {
      const plan = getEcosystemSourcePlan(sourceKey);

      expect(plan).toBeDefined();
      expect(plan.referenceContext).not.toBe('product-copy');
      expect(isAllowedExternalProductReference(plan.sourceName, plan.referenceContext)).toBe(true);
      expect(plan.pageIdentityBorrowed).toBe(false);
      expect(plan.sourceStyleCopied).toBe(false);
      expect(plan.benchmarkRole).toMatch(/benchmark|migration|compatibility|standard/i);
    }
  });

  it('maps dashboard and alert imports into HertzBeat-native operator targets', () => {
    for (const sourceKey of ['grafana', 'datadog', 'signoz'] as const) {
      const plan = getEcosystemSourcePlan(sourceKey);
      const dashboard = plan.importMappings.find(mapping => mapping.kind === 'dashboard');
      const alert = plan.importMappings.find(mapping => mapping.kind === 'alert-rule');

      expect(dashboard).toBeDefined();
      expect(alert).toBeDefined();
      expect(dashboard?.migrationMode).not.toMatch(/clone|copy-ui|external-style/i);
      expect(alert?.migrationMode).not.toMatch(/clone|copy-ui|external-style/i);
      expect(dashboard?.targetSurfaces).toEqual(expect.arrayContaining(['monitor-template', 'entity-workbench']));
      expect(alert?.targetSurfaces).toEqual(expect.arrayContaining(['alert-center', 'notification-policy']));
      expect(dashboard?.operatorReviewRequired).toBe(true);
      expect(alert?.operatorReviewRequired).toBe(true);
    }
  });

  it('keeps OpenTelemetry migration native to OTLP without replacing the collector', () => {
    const plan = getEcosystemSourcePlan('opentelemetry');
    const otlp = plan.importMappings.find(mapping => mapping.kind === 'otlp-pipeline');

    expect(otlp).toBeDefined();
    expect(otlp?.migrationMode).toBe('native-otlp');
    expect(otlp?.targetSurfaces).toEqual(
      expect.arrayContaining(['otlp-center', 'metrics', 'logs', 'traces', 'entity-catalog'])
    );
    expect(plan.nonGoals).toEqual(expect.arrayContaining(['replace-opentelemetry-collector']));
  });

  it('validates source coverage, import coverage, and non-goals as release blockers', () => {
    expect(validateEcosystemAlignment(ECOSYSTEM_ALIGNMENT)).toEqual([]);
    expect(
      validateEcosystemAlignment({
        ...ECOSYSTEM_ALIGNMENT,
        sourcePlans: ECOSYSTEM_ALIGNMENT.sourcePlans.filter(plan => plan.sourceKey !== 'datadog')
      })
    ).toEqual(expect.arrayContaining(['missing-source:datadog']));
    expect(
      validateEcosystemAlignment({
        ...ECOSYSTEM_ALIGNMENT,
        sourcePlans: ECOSYSTEM_ALIGNMENT.sourcePlans.map(plan =>
          plan.sourceKey === 'grafana' ? { ...plan, nonGoals: [] } : plan
        )
      })
    ).toEqual(expect.arrayContaining(['missing-non-goals:grafana']));
  });

  it('builds a source-specific migration plan with cutover order and review gates', () => {
    const datadogPlan = buildEcosystemMigrationPlan('datadog');

    expect(datadogPlan.sourceKey).toBe('datadog');
    expect(datadogPlan.cutoverSteps.map(step => step.key)).toEqual([
      'inventory-source-artifacts',
      'map-identity-and-labels',
      'translate-dashboards',
      'translate-alert-rules',
      'operator-review',
      'hertzbeat-cutover'
    ]);
    expect(datadogPlan.cutoverSteps.find(step => step.key === 'translate-dashboards')?.targetSurfaces).toEqual(
      expect.arrayContaining(['monitor-template', 'entity-workbench'])
    );
    expect(datadogPlan.cutoverSteps.find(step => step.key === 'translate-alert-rules')?.targetSurfaces).toEqual(
      expect.arrayContaining(['alert-center', 'notification-policy'])
    );
    expect(datadogPlan.reviewRequired).toBe(true);
    expect(datadogPlan.blockedNarratives).toEqual(
      expect.arrayContaining(['copy-datadog-saas-packaging', 'copy-datadog-dashboard-widgets'])
    );
  });

  it('builds an OpenTelemetry migration plan around native OTLP cutover only', () => {
    const otelPlan = buildEcosystemMigrationPlan('opentelemetry');

    expect(otelPlan.cutoverSteps.map(step => step.key)).toEqual([
      'inventory-source-artifacts',
      'map-identity-and-labels',
      'configure-otlp-ingest',
      'verify-three-signal-ingest',
      'hertzbeat-cutover'
    ]);
    expect(otelPlan.reviewRequired).toBe(false);
    expect(otelPlan.cutoverSteps.flatMap(step => step.targetSurfaces)).toEqual(
      expect.arrayContaining(['otlp-center', 'metrics', 'logs', 'traces', 'entity-catalog'])
    );
    expect(otelPlan.blockedNarratives).toEqual(expect.arrayContaining(['replace-opentelemetry-collector']));
  });

  it('builds a benchmark capability matrix without copied page identity', () => {
    const matrix = buildEcosystemCapabilityMatrix();

    expect(matrix.map(row => row.capability)).toEqual([
      'otlp-three-signal-ingest',
      'resource-to-entity-resolution',
      'dashboard-import',
      'alert-rule-import',
      'topology-and-evidence-handoff',
      'safe-automation'
    ]);
    expect(matrix.find(row => row.capability === 'dashboard-import')?.hertzbeatTarget).toContain('monitor templates');
    expect(matrix.find(row => row.capability === 'alert-rule-import')?.hertzbeatTarget).toContain('alert closure');
    expect(matrix.every(row => row.externalReferenceContext !== 'product-copy')).toBe(true);
    expect(matrix.every(row => row.pageIdentityBorrowed === false)).toBe(true);
  });

  it('passes a focused M9 completion gate and reports release blockers', () => {
    expect(REQUIRED_ECOSYSTEM_CAPABILITIES).toEqual([
      'otlp-three-signal-ingest',
      'resource-to-entity-resolution',
      'dashboard-import',
      'alert-rule-import',
      'topology-and-evidence-handoff',
      'safe-automation'
    ]);
    expect(validateEcosystemCompletionGate()).toEqual([]);
    expect(
      validateEcosystemCompletionGate({
        ...ECOSYSTEM_ALIGNMENT,
        positioning: {
          ...ECOSYSTEM_ALIGNMENT.positioning,
          statement: 'SigNoZ-style Service Map for all services'
        }
      })
    ).toEqual(expect.arrayContaining(['forbidden-positioning-language']));
    expect(
      validateEcosystemCompletionGate({
        ...ECOSYSTEM_ALIGNMENT,
        sourcePlans: ECOSYSTEM_ALIGNMENT.sourcePlans.map(plan =>
          plan.sourceKey === 'datadog'
            ? { ...plan, importMappings: plan.importMappings.filter(mapping => mapping.kind !== 'alert-rule') }
            : plan
        )
      })
    ).toEqual(expect.arrayContaining(['alignment:missing-import:datadog:alert-rule']));
  });
});
