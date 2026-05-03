import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('operator family cold-workbench chrome', () => {
  it('removes the remaining route-local rounded panel recipes from the OTLP operator slice', () => {
    const otlpSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');
    const combinedSource = [otlpSource, metricsSource].join('\n');

    expect(combinedSource).not.toContain('rounded-[10px] border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-4 py-3 shadow-none');
    expect(combinedSource).not.toContain('rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] p-4');
    expect(combinedSource).not.toContain('rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
  });

  it('moves the OTLP pilot route onto the new observability owner layer', () => {
    const otlpSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/page.tsx'), 'utf8');

    expect(otlpSource).toContain('components/observability');
    expect(otlpSource).toContain('FactsStrip');
    expect(otlpSource).toContain('StageSection');
    expect(otlpSource).toContain('SummaryMetricGrid');
    expect(otlpSource).toContain('DrawerSection');
    expect(otlpSource).toContain('SupportActionBar');
    expect(otlpSource).not.toContain('components/workbench/primitives');

    expect(metricsSource).toContain('components/observability');
    expect(metricsSource).toContain('FactsStrip');
    expect(metricsSource).toContain('StageSection');
    expect(metricsSource).toContain('SummaryMetricGrid');
    expect(metricsSource).toContain('DrawerSection');
    expect(metricsSource).toContain('DrawerCodePreview');
    expect(metricsSource).not.toContain('components/workbench/primitives');
  });
});
