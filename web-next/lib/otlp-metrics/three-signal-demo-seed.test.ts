import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('otlp three-signal demo seed', () => {
  it('documents rich linked metric series with HertzBeat collector, template, workspace, entity, and trace labels', () => {
    const scriptPath = resolve(process.cwd(), '..', 'script/dev/seed-otlp-three-signal-demo.sh');
    const output = execFileSync('bash', [scriptPath, '--dry-run'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        TRACE_ID: 'trace-linked-demo',
        ROOT_SPAN_ID: '1111222233334444',
        HERTZBEAT_ENTITY_ID: '4200',
        HERTZBEAT_ENTITY_NAME: 'Checkout API',
        HERTZBEAT_WORKSPACE_ID: 'workspace-demo',
        HERTZBEAT_COLLECTOR: 'collector-demo-a',
        HERTZBEAT_TEMPLATE: 'spring-boot'
      }
    });
    const plan = JSON.parse(output);

    expect(plan.counts).toMatchObject({
      traces: { spans: 4, events: 6 },
      metrics: { series: 4, pointsPerSeries: 5 },
      logs: { records: 4, linkedTraceRecords: 4 }
    });
    expect(plan.metricQueries).toContain('hertzbeat_demo_checkout_latency_ms_milliseconds');
    expect(plan.metricQueries).toContain('rpc_server_duration_milliseconds');
    expect(plan.metricSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
          points: 5,
          traceId: 'trace-linked-demo',
          spanId: '1111222233334444',
          labels: expect.arrayContaining([
            'service.name',
            'service.namespace',
            'deployment.environment.name',
            'hertzbeat.entity_id',
            'hertzbeat.entity_name',
            'hertzbeat.workspace_id',
            'hertzbeat.collector',
            'hertzbeat.template',
            'trace_id',
            'span_id'
          ])
        })
      ])
    );
    expect(plan.logHistoryUrl).toContain('/log/manage?');
    const logHistoryUrl = new URL(plan.logHistoryUrl);
    expect(logHistoryUrl.searchParams.get('view')).toBe('list');
    expect(logHistoryUrl.searchParams.get('traceId')).toBe('trace-linked-demo');
    expect(logHistoryUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(logHistoryUrl.searchParams.get('entityId')).toBe('4200');
    expect(logHistoryUrl.searchParams.get('entityName')).toBe('Checkout API');
    expect(logHistoryUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logHistoryUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(logHistoryUrl.searchParams.get('environment')).toBe('demo');
    expect(logHistoryUrl.searchParams.get('collector')).toBe('collector-demo-a');
    expect(logHistoryUrl.searchParams.get('template')).toBe('spring-boot');
    expect(logHistoryUrl.searchParams.get('source')).toBe('otlp');

    const traceUrl = new URL(plan.traceUrl);
    expect(traceUrl.searchParams.get('traceId')).toBe('trace-linked-demo');
    expect(traceUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(traceUrl.searchParams.get('entityId')).toBe('4200');
    expect(traceUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(traceUrl.searchParams.get('collector')).toBe('collector-demo-a');

    const metricsUrl = new URL(plan.explicitMetricsUrl);
    expect(metricsUrl.searchParams.get('traceId')).toBe('trace-linked-demo');
    expect(metricsUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(metricsUrl.searchParams.get('entityId')).toBe('4200');
    expect(metricsUrl.searchParams.get('entityName')).toBe('Checkout API');
    expect(metricsUrl.searchParams.get('collector')).toBe('collector-demo-a');
    expect(metricsUrl.searchParams.get('template')).toBe('spring-boot');
    expect(metricsUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');

    const entityUrl = new URL(plan.entityUrl);
    expect(entityUrl.pathname).toBe('/entities/4200');
    expect(entityUrl.searchParams.get('traceId')).toBe('trace-linked-demo');
    expect(entityUrl.searchParams.get('serviceName')).toBe('checkout');

    const alertUrl = new URL(plan.alertUrl);
    expect(alertUrl.pathname).toBe('/alert');
    expect(alertUrl.searchParams.get('status')).toBe('firing');
    expect(alertUrl.searchParams.get('signal')).toBe('metrics');
    expect(alertUrl.searchParams.get('entityId')).toBe('4200');
  });
});
