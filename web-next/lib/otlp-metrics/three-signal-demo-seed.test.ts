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
        TRACE_ID: '0123456789abcdef0123456789abcdef',
        ROOT_SPAN_ID: '1111222233334444',
        HERTZBEAT_ENTITY_ID: '4200',
        HERTZBEAT_ENTITY_TYPE: 'service',
        HERTZBEAT_ENTITY_NAME: 'Checkout API',
        HERTZBEAT_WORKSPACE_ID: 'workspace-demo',
        HERTZBEAT_COLLECTOR: 'collector-demo-a',
        HERTZBEAT_TEMPLATE: 'spring-boot',
        SERVICE_VERSION: '1.2.3',
      },
    });
    const plan = JSON.parse(output);

    expect(plan.counts).toMatchObject({
      traces: { spans: 4, events: 6 },
      metrics: { series: 4, pointsPerSeries: 5 },
      logs: { records: 4, linkedTraceRecords: 4 },
    });
    expect(plan.serviceVersion).toBe('1.2.3');
    expect(plan.resourceDimensions).toEqual({
      'host.name': 'checkout-node-a',
      'k8s.namespace.name': 'payments',
      'k8s.pod.name': 'checkout-v1-78dfd',
      'container.name': 'checkout',
    });
    expect(plan.entityBinding).toMatchObject({
      entity: {
        id: '4200',
        type: 'service',
        name: 'checkout',
        displayName: 'Checkout API',
        namespace: 'hertzbeat-demo',
        environment: 'demo',
        workspaceId: 'workspace-demo',
      },
      identities: [
        { identityType: 'otel_resource', identityKey: 'service.name', identityValue: 'checkout' },
        { identityType: 'otel_resource', identityKey: 'service.namespace', identityValue: 'hertzbeat-demo' },
        { identityType: 'otel_resource', identityKey: 'deployment.environment.name', identityValue: 'demo' },
        { identityType: 'otel_resource', identityKey: 'service.version', identityValue: '1.2.3' },
        { identityType: 'otel_resource', identityKey: 'host.name', identityValue: 'checkout-node-a' },
        { identityType: 'otel_resource', identityKey: 'k8s.namespace.name', identityValue: 'payments' },
        { identityType: 'otel_resource', identityKey: 'k8s.pod.name', identityValue: 'checkout-v1-78dfd' },
        { identityType: 'otel_resource', identityKey: 'container.name', identityValue: 'checkout' },
      ],
      entityApiEndpoint: 'http://127.0.0.1:1157/api/entities',
      ensureEntityDefault: false,
      ensureEntityOption: '--ensure-entity',
      ensureEntityCommand: 'bash script/dev/seed-otlp-three-signal-demo.sh --ensure-entity',
      entityApiPayload: {
        entity: {
          id: 4200,
          type: 'service',
          name: 'checkout',
          displayName: 'Checkout API',
          namespace: 'hertzbeat-demo',
          environment: 'demo',
          status: 'unknown',
          source: 'manual',
          workspaceId: 'workspace-demo',
          labels: {
            'service.name': 'checkout',
            'service.namespace': 'hertzbeat-demo',
            'deployment.environment.name': 'demo',
            'service.version': '1.2.3',
            'host.name': 'checkout-node-a',
            'k8s.namespace.name': 'payments',
            'k8s.pod.name': 'checkout-v1-78dfd',
            'container.name': 'checkout',
            'hertzbeat.entity_id': '4200',
            'hertzbeat.entity_type': 'service',
            'hertzbeat.entity_name': 'Checkout API',
          },
          tags: ['service:checkout', 'namespace:hertzbeat-demo', 'environment:demo'],
        },
        identities: [
          {
            identityType: 'otel_resource',
            identityKey: 'service.name',
            identityValue: 'checkout',
            primaryIdentity: true,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'service.namespace',
            identityValue: 'hertzbeat-demo',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'deployment.environment.name',
            identityValue: 'demo',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'service.version',
            identityValue: '1.2.3',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'host.name',
            identityValue: 'checkout-node-a',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'k8s.namespace.name',
            identityValue: 'payments',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'k8s.pod.name',
            identityValue: 'checkout-v1-78dfd',
            primaryIdentity: false,
          },
          {
            identityType: 'otel_resource',
            identityKey: 'container.name',
            identityValue: 'checkout',
            primaryIdentity: false,
          },
        ],
        monitorBinds: [],
        relations: [
          {
            sourceEntityId: 4200,
            targetEntityId: 4201,
            targetRef: 'host:checkout-node-a',
            relationType: 'runs_on',
            relationSource: 'otel_resource',
            status: 'confirmed',
            score: 95,
            description: 'checkout runs on checkout-node-a',
            attributes: { resourceKey: 'host.name', resourceValue: 'checkout-node-a' },
          },
          {
            sourceEntityId: 4200,
            targetEntityId: 4202,
            targetRef: 'k8s_workload:payments/checkout-v1-78dfd',
            relationType: 'deployed_on',
            relationSource: 'otel_resource',
            status: 'confirmed',
            score: 95,
            description: 'checkout is observed in pod checkout-v1-78dfd',
            attributes: { resourceKey: 'k8s.pod.name', resourceValue: 'checkout-v1-78dfd' },
          },
        ],
      },
      strongEntityRoute: '/entities/4200',
      fallbackEntityRoute: '/entities?search=checkout',
    });
    expect(plan.metricQueries).toContain('hertzbeat_demo_checkout_latency_ms_milliseconds');
    expect(plan.metricQueries).toContain('rpc_server_duration_milliseconds');
    expect(plan.metricSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
          points: 5,
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: '1111222233334444',
          labels: expect.arrayContaining([
            'service.name',
            'service.namespace',
            'service.version',
            'deployment.environment.name',
            'host.name',
            'k8s.namespace.name',
            'k8s.pod.name',
            'container.name',
            'hertzbeat.entity_id',
            'hertzbeat.entity_type',
            'hertzbeat.entity_name',
            'hertzbeat.workspace_id',
            'hertzbeat.collector',
            'hertzbeat.template',
            'trace_id',
            'span_id',
          ]),
        }),
      ]),
    );
    expect(plan.logHistoryUrl).toContain('/log/manage?');
    const logHistoryUrl = new URL(plan.logHistoryUrl);
    expect(logHistoryUrl.searchParams.get('view')).toBe('list');
    expect(logHistoryUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(logHistoryUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(logHistoryUrl.searchParams.get('entityId')).toBe('4200');
    expect(logHistoryUrl.searchParams.get('entityType')).toBe('service');
    expect(logHistoryUrl.searchParams.get('entityName')).toBe('Checkout API');
    expect(logHistoryUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logHistoryUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(logHistoryUrl.searchParams.get('environment')).toBe('demo');
    expect(logHistoryUrl.searchParams.get('collector')).toBe('collector-demo-a');
    expect(logHistoryUrl.searchParams.get('template')).toBe('spring-boot');
    expect(logHistoryUrl.searchParams.get('source')).toBe('otlp');

    const traceUrl = new URL(plan.traceUrl);
    expect(traceUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(traceUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(traceUrl.searchParams.get('entityId')).toBe('4200');
    expect(traceUrl.searchParams.get('entityType')).toBe('service');
    expect(traceUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(traceUrl.searchParams.get('collector')).toBe('collector-demo-a');

    const metricsUrl = new URL(plan.explicitMetricsUrl);
    expect(metricsUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(metricsUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(metricsUrl.searchParams.get('entityId')).toBe('4200');
    expect(metricsUrl.searchParams.get('entityType')).toBe('service');
    expect(metricsUrl.searchParams.get('entityName')).toBe('Checkout API');
    expect(metricsUrl.searchParams.get('collector')).toBe('collector-demo-a');
    expect(metricsUrl.searchParams.get('template')).toBe('spring-boot');
    expect(metricsUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');

    const metricsBreakoutUrl = new URL(plan.breakoutRoutes.metricsByServiceVersion);
    expect(metricsBreakoutUrl.pathname).toBe('/ingestion/otlp/metrics');
    expect(metricsBreakoutUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    expect(metricsBreakoutUrl.searchParams.get('groupBy')).toBe('service.version');
    expect(metricsBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const metricsHostBreakoutUrl = new URL(plan.breakoutRoutes.metricsByHost);
    expect(metricsHostBreakoutUrl.pathname).toBe('/ingestion/otlp/metrics');
    expect(metricsHostBreakoutUrl.searchParams.get('groupBy')).toBe('host.name');
    expect(metricsHostBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const metricsK8sPodBreakoutUrl = new URL(plan.breakoutRoutes.metricsByK8sPod);
    expect(metricsK8sPodBreakoutUrl.pathname).toBe('/ingestion/otlp/metrics');
    expect(metricsK8sPodBreakoutUrl.searchParams.get('groupBy')).toBe('k8s.pod.name');
    expect(metricsK8sPodBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const logsBreakoutUrl = new URL(plan.breakoutRoutes.logsByServiceVersion);
    expect(logsBreakoutUrl.pathname).toBe('/log/manage');
    expect(logsBreakoutUrl.searchParams.get('view')).toBe('list');
    expect(logsBreakoutUrl.searchParams.get('groupBy')).toBe('resource:service.version');
    expect(logsBreakoutUrl.searchParams.get('groupLimit')).toBe('8');
    expect(logsBreakoutUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logsBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(logsBreakoutUrl.searchParams.get('entityType')).toBe('service');

    const logsHostBreakoutUrl = new URL(plan.breakoutRoutes.logsByHost);
    expect(logsHostBreakoutUrl.pathname).toBe('/log/manage');
    expect(logsHostBreakoutUrl.searchParams.get('groupBy')).toBe('resource:host.name');
    expect(logsHostBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const logsK8sPodBreakoutUrl = new URL(plan.breakoutRoutes.logsByK8sPod);
    expect(logsK8sPodBreakoutUrl.pathname).toBe('/log/manage');
    expect(logsK8sPodBreakoutUrl.searchParams.get('groupBy')).toBe('resource:k8s.pod.name');
    expect(logsK8sPodBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const tracesBreakoutUrl = new URL(plan.breakoutRoutes.tracesByServiceVersion);
    expect(tracesBreakoutUrl.pathname).toBe('/trace/manage');
    expect(tracesBreakoutUrl.searchParams.get('view')).toBe('list');
    expect(tracesBreakoutUrl.searchParams.get('spanScope')).toBe('all');
    expect(tracesBreakoutUrl.searchParams.get('groupBy')).toBe('resource:service.version');
    expect(tracesBreakoutUrl.searchParams.get('groupLimit')).toBe('8');
    expect(tracesBreakoutUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(tracesBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(tracesBreakoutUrl.searchParams.get('entityType')).toBe('service');

    const tracesHostBreakoutUrl = new URL(plan.breakoutRoutes.tracesByHost);
    expect(tracesHostBreakoutUrl.pathname).toBe('/trace/manage');
    expect(tracesHostBreakoutUrl.searchParams.get('groupBy')).toBe('resource:host.name');
    expect(tracesHostBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const tracesK8sPodBreakoutUrl = new URL(plan.breakoutRoutes.tracesByK8sPod);
    expect(tracesK8sPodBreakoutUrl.pathname).toBe('/trace/manage');
    expect(tracesK8sPodBreakoutUrl.searchParams.get('groupBy')).toBe('resource:k8s.pod.name');
    expect(tracesK8sPodBreakoutUrl.searchParams.get('groupLimit')).toBe('8');

    const entityUrl = new URL(plan.entityUrl);
    expect(entityUrl.pathname).toBe('/entities/4200');
    expect(entityUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(entityUrl.searchParams.get('serviceName')).toBe('checkout');

    const alertUrl = new URL(plan.alertUrl);
    expect(alertUrl.pathname).toBe('/alert');
    expect(alertUrl.searchParams.get('status')).toBe('firing');
    expect(alertUrl.searchParams.get('signal')).toBe('metrics');
    expect(alertUrl.searchParams.get('entityId')).toBe('4200');
  });

  it('documents the live entity binding verification plan without writing state', () => {
    const scriptPath = resolve(process.cwd(), '..', 'script/dev/verify-otlp-three-signal-demo.sh');
    const output = execFileSync('bash', [scriptPath, '--dry-run'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HERTZBEAT_ENTITY_ID: '4200',
        HERTZBEAT_ENTITY_TYPE: 'service',
        HERTZBEAT_ENTITY_NAME: 'Checkout API',
        SERVICE_NAME: 'checkout',
        SERVICE_NAMESPACE: 'hertzbeat-demo',
        DEPLOYMENT_ENVIRONMENT: 'demo',
        TRACE_ID: '0123456789abcdef0123456789abcdef',
        ROOT_SPAN_ID: '1111222233334444',
        VERIFY_ATTEMPTS: '3',
        VERIFY_SLEEP_SECONDS: '1',
      },
    });
    const plan = JSON.parse(output);

    expect(plan.seedCommand).toBe('bash script/dev/seed-otlp-three-signal-demo.sh --ensure-entity');
    expect(plan.skipSeedOption).toBe('--skip-seed');
    expect(plan.checks).toMatchObject({
      entity: 'http://127.0.0.1:1157/api/entities/4200',
      bindings: 'http://127.0.0.1:1157/api/ingestion/otlp/bindings',
    });
    expect(plan.checks.metricsConsole).toContain('/api/ingestion/otlp/metrics/console?');
    expect(plan.checks.logsList).toContain('/api/logs/list?');
    expect(plan.checks.tracesList).toContain('/api/traces/list?');
    expect(plan.checks.metricsByServiceVersion).toContain('/api/ingestion/otlp/metrics/console?');
    expect(plan.checks.metricsByResourceDimensions).toContain('/api/ingestion/otlp/metrics/console?');
    expect(plan.checks.relatedMetrics).toContain('/api/ingestion/otlp/metrics/related?');
    expect(plan.checks.logsByServiceVersion).toContain('/api/logs/stats/group-by?');
    expect(plan.checks.logsByHost).toContain('/api/logs/stats/group-by?');
    expect(plan.checks.logsByK8sPod).toContain('/api/logs/stats/group-by?');
    expect(plan.checks.tracesByServiceVersion).toContain('/api/traces/stats/group-by?');
    expect(plan.checks.tracesByHost).toContain('/api/traces/stats/group-by?');
    expect(plan.checks.tracesByK8sPod).toContain('/api/traces/stats/group-by?');
    expect(plan.retry).toEqual({
      attempts: 3,
      sleepSeconds: 1,
      refetches: [
        'entity',
        'hostEntity',
        'k8sEntity',
        'bindings',
        'metricsConsole',
        'logsList',
        'tracesList',
        'metricsByServiceVersion',
        'metricsByResourceDimensions',
        'relatedMetrics',
        'logsByServiceVersion',
        'logsByHost',
        'logsByK8sPod',
        'tracesByServiceVersion',
        'tracesByHost',
        'tracesByK8sPod',
      ],
    });
    const metricsConsoleUrl = new URL(plan.checks.metricsConsole);
    expect(metricsConsoleUrl.searchParams.get('entityId')).toBe('4200');
    expect(metricsConsoleUrl.searchParams.get('entityType')).toBe('service');
    expect(metricsConsoleUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(metricsConsoleUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(metricsConsoleUrl.searchParams.get('environment')).toBe('demo');
    expect(metricsConsoleUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    const logsListUrl = new URL(plan.checks.logsList);
    expect(logsListUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(logsListUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(logsListUrl.searchParams.get('entityId')).toBe('4200');
    expect(logsListUrl.searchParams.get('entityType')).toBe('service');
    expect(logsListUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logsListUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(logsListUrl.searchParams.get('environment')).toBe('demo');
    const tracesListUrl = new URL(plan.checks.tracesList);
    expect(tracesListUrl.searchParams.get('entityId')).toBe('4200');
    expect(tracesListUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(tracesListUrl.searchParams.get('entityType')).toBe('service');
    expect(tracesListUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(tracesListUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(tracesListUrl.searchParams.get('environment')).toBe('demo');
    expect(tracesListUrl.searchParams.get('spanScope')).toBe('root');
    const metricsBreakoutUrl = new URL(plan.checks.metricsByServiceVersion);
    expect(metricsBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(metricsBreakoutUrl.searchParams.get('groupBy')).toBe('service.version');
    expect(metricsBreakoutUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    const metricsResourceBreakoutUrl = new URL(plan.checks.metricsByResourceDimensions);
    expect(metricsResourceBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(metricsResourceBreakoutUrl.searchParams.get('groupBy')).toBe('service.version,host.name,k8s.pod.name');
    expect(metricsResourceBreakoutUrl.searchParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    const relatedMetricsUrl = new URL(plan.checks.relatedMetrics);
    expect(relatedMetricsUrl.searchParams.get('entityId')).toBe('4200');
    expect(relatedMetricsUrl.searchParams.get('entityType')).toBe('service');
    expect(relatedMetricsUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(relatedMetricsUrl.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(relatedMetricsUrl.searchParams.get('environment')).toBe('demo');
    expect(relatedMetricsUrl.searchParams.get('limit')).toBe('8');
    expect(relatedMetricsUrl.searchParams.get('filter')).toBe(
      'host.name="checkout-node-a" and k8s.namespace.name="payments" and k8s.pod.name="checkout-v1-78dfd" and container.name="checkout"'
    );
    const logsBreakoutUrl = new URL(plan.checks.logsByServiceVersion);
    expect(logsBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(logsBreakoutUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(logsBreakoutUrl.searchParams.get('spanId')).toBe('1111222233334444');
    expect(logsBreakoutUrl.searchParams.get('groupBy')).toBe('resource:service.version');
    expect(logsBreakoutUrl.searchParams.get('limit')).toBe('8');
    const logsHostBreakoutUrl = new URL(plan.checks.logsByHost);
    expect(logsHostBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(logsHostBreakoutUrl.searchParams.get('groupBy')).toBe('resource:host.name');
    expect(logsHostBreakoutUrl.searchParams.get('limit')).toBe('8');
    const logsK8sPodBreakoutUrl = new URL(plan.checks.logsByK8sPod);
    expect(logsK8sPodBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(logsK8sPodBreakoutUrl.searchParams.get('groupBy')).toBe('resource:k8s.pod.name');
    expect(logsK8sPodBreakoutUrl.searchParams.get('limit')).toBe('8');
    const tracesBreakoutUrl = new URL(plan.checks.tracesByServiceVersion);
    expect(tracesBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(tracesBreakoutUrl.searchParams.get('traceId')).toBe('0123456789abcdef0123456789abcdef');
    expect(tracesBreakoutUrl.searchParams.get('spanScope')).toBe('all');
    expect(tracesBreakoutUrl.searchParams.get('groupBy')).toBe('resource:service.version');
    expect(tracesBreakoutUrl.searchParams.get('limit')).toBe('8');
    const tracesHostBreakoutUrl = new URL(plan.checks.tracesByHost);
    expect(tracesHostBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(tracesHostBreakoutUrl.searchParams.get('spanScope')).toBe('all');
    expect(tracesHostBreakoutUrl.searchParams.get('groupBy')).toBe('resource:host.name');
    expect(tracesHostBreakoutUrl.searchParams.get('limit')).toBe('8');
    const tracesK8sPodBreakoutUrl = new URL(plan.checks.tracesByK8sPod);
    expect(tracesK8sPodBreakoutUrl.searchParams.get('entityId')).toBe('4200');
    expect(tracesK8sPodBreakoutUrl.searchParams.get('spanScope')).toBe('all');
    expect(tracesK8sPodBreakoutUrl.searchParams.get('groupBy')).toBe('resource:k8s.pod.name');
    expect(tracesK8sPodBreakoutUrl.searchParams.get('limit')).toBe('8');
    expect(plan.expected).toMatchObject({
      entityId: '4200',
      entityType: 'service',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'hertzbeat-demo',
      environment: 'demo',
      resourceDimensions: {
        'host.name': 'checkout-node-a',
        'k8s.namespace.name': 'payments',
        'k8s.pod.name': 'checkout-v1-78dfd',
        'container.name': 'checkout',
      },
      serviceVersion: '1.2.3',
      metricQuery: 'hertzbeat_demo_checkout_latency_ms_milliseconds',
      traceId: '0123456789abcdef0123456789abcdef',
      rootSpanId: '1111222233334444',
    });
  });
});
