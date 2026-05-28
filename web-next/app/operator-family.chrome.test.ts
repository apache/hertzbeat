import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('operator family cold-workbench chrome', () => {
  it('removes the remaining route-local rounded panel recipes from the OTLP operator slice', () => {
    const otlpSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/otlp-page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');
    const combinedSource = [otlpSource, metricsSource].join('\n');

    expect(combinedSource).not.toContain('rounded-[10px] border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-4 py-3 shadow-none');
    expect(combinedSource).not.toContain('rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] p-4');
    expect(combinedSource).not.toContain('rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
  });

  it('keeps the OTLP pilot route on the cold-ops catalog owner layer', () => {
    const otlpSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/otlp-page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(otlpSource).toContain('coldOpsCatalogVisual');
    expect(otlpSource).toContain('SearchRow');
    expect(otlpSource).toContain('ClientWorkbench');
    expect(otlpSource).toContain('buildReadinessRows');
    expect(otlpSource).toContain('buildSelfCheckRows');
    expect(otlpSource).toContain('data-otlp-center-source-grid="hertzbeat-source-catalog"');
    expect(otlpSource).toContain('data-otlp-center-filter-rail="hertzbeat-prism-filters"');
    expect(otlpSource).not.toContain('components/workbench/primitives');

    expect(metricsSource).toContain('components/observability');
    expect(metricsSource).toContain('components/observability/time-range-control');
    expect(metricsSource).toContain('EChartsPanel');
    expect(metricsSource).toContain('ClientWorkbench');
    expect(metricsSource).toContain('buildConsoleFacts');
    expect(metricsSource).toContain('buildMetricsHandoffLinks');
    expect(metricsSource).toContain('data-otlp-metrics-route="otlp-cold-metrics-workbench"');
    expect(metricsSource).not.toContain('components/workbench/primitives');
  });
});
