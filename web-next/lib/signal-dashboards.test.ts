import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applySignalDashboardVariables,
  applySignalDashboardTimeRange,
  buildSignalDashboardVariablesFromDrafts,
  buildSignalDashboardCompositionFromDrafts,
  buildSignalDashboardExecutionPlans,
  buildSignalDashboardPanelEditHref,
  deleteSignalDashboard,
  executeSignalDashboardPanelPlan,
  filterSignalDashboardVariableOptions,
  loadSignalDashboards,
  buildSignalDashboardVariableOptions,
  mergeSignalDashboardDraftsIntoComposition,
  normalizeSignalDashboardVariableName,
  normalizeSignalDashboardTimeRange,
  parseSignalDashboardVariables,
  normalizeSignalDashboardKey,
  parseSignalDashboardPreviewPanels,
  readSignalDashboardWidgetPanelEditMetadata,
  resolveSignalDashboardRefreshState,
  resolveSignalDashboardTimeRange,
  saveSignalDashboard,
  selectSignalDashboardVariableOption,
  buildSignalDashboardPanelRuntimeRenderDescriptor,
  buildSignalOperationDrilldownDashboard,
  buildSignalServiceOverviewDashboard,
  createSignalDashboardPanelDraftFromFilterSelection,
  createSignalDashboardPanelDraftsFromFilterSelection,
  createSignalDashboardPanelDraftFromRuntimeBreakout,
  createSignalDashboardPanelDraftFromRuntimeEvidence,
  buildSignalDashboardPanelRuntimePreview,
  buildSignalDashboardRuntimeEvidenceSourceHandoff,
  buildSignalDashboardRuntimeEvidenceFilters,
  buildSignalDashboardRuntimeEvidenceFilterSuggestions,
  buildSignalDashboardRuntimeMetricsTooltip,
  buildSignalDashboardRuntimeSyncCrosshair,
  buildSignalDashboardRuntimeSyncTooltip,
  resolveSignalDashboardPreviewPanels,
  resolveSignalDashboardVariableValue,
  saveSignalDashboardPanelEditContext,
  summarizeSignalDashboardPanelRuntime,
  updateSignalDashboardPanelLayout,
  updateSignalDashboardPanelWidgetFromDraft,
  updateSignalDashboardVariables
} from './signal-dashboards';
import {
  applySignalDashboardPanelEditContext,
  createSignalDashboardPanelDraft
} from './signal-dashboard-panel-drafts';
import { createSignalDashboardPanelDraftFromSavedView } from './signal-saved-views';
import { readSignalPanelEditContext } from './signal-route-context';

describe('signal dashboards API client', () => {
  const originalFetch = globalThis.fetch;
  type ThreeSignalDemoSeedPlan = {
    traceId: string;
    explicitMetricsUrl: string;
    logHistoryUrl: string;
    traceUrl: string;
    alertUrl: string;
    breakoutRoutes: {
      metricsByServiceVersion: string;
      logsByServiceVersion: string;
      tracesByServiceVersion: string;
    };
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function readThreeSignalDemoSeedPlan() {
    const scriptPath = resolve(process.cwd(), '..', 'script/dev/seed-otlp-three-signal-demo.sh');
    return JSON.parse(execFileSync('bash', [scriptPath, '--dry-run'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        TRACE_ID: '6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b',
        ROOT_SPAN_ID: '1111222233334444',
        HERTZBEAT_ENTITY_ID: '4200',
	        HERTZBEAT_ENTITY_NAME: 'Checkout API',
	        HERTZBEAT_WORKSPACE_ID: 'workspace-demo',
	        HERTZBEAT_COLLECTOR: 'collector-demo-a',
	        HERTZBEAT_TEMPLATE: 'spring-boot',
	        SERVICE_VERSION: '1.2.3'
	      }
	    })) as ThreeSignalDemoSeedPlan;
	  }

  function apiUrlSearchParams(value: string | undefined) {
    expect(value).toBeTruthy();
    return new URL(String(value), 'http://hertzbeat.local').searchParams;
  }

  it('normalizes operator-provided dashboard keys for the backend contract', () => {
    expect(normalizeSignalDashboardKey('Signals Overview')).toBe('signals-overview');
    expect(normalizeSignalDashboardKey('team.a:checkout/prod')).toBe('team.a:checkout-prod');
    expect(normalizeSignalDashboardKey('   ', 'fallback-dashboard')).toBe('fallback-dashboard');
  });

  it('normalizes dashboard variable names for query references', () => {
    expect(normalizeSignalDashboardVariableName('service.name')).toBe('service.name');
    expect(normalizeSignalDashboardVariableName('deployment environment/name')).toBe('deployment_environment_name');
    expect(normalizeSignalDashboardVariableName('  ')).toBe('');
  });

  it('builds a dashboard composition with widgets, layout, variables, and panel map from drafts', () => {
    const dashboard = buildSignalDashboardCompositionFromDrafts({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Dashboard composed from signal panel drafts.',
      tags: ['logs', 'traces', 'metrics'],
      drafts: [
        {
          signal: 'logs',
          draftKey: 'logs-panel',
          title: 'Error logs',
          description: 'Errors',
          visualization: 'table',
          route: '/log/manage?view=table&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot',
          querySnapshot: '/log/manage?view=table'
        },
        {
          signal: 'metrics',
          draftKey: 'metrics-panel',
          title: 'Latency',
          description: 'p95',
          visualization: 'time-series',
          route: '/ingestion/otlp/metrics?query=latency'
        }
      ]
    });

    expect(dashboard).toEqual(expect.objectContaining({
      dashboardKey: 'signals-overview',
      tags: 'logs,traces,metrics',
      version: 'v1'
    }));
    expect(JSON.parse(dashboard.layout)).toEqual([
      { i: 'logs-logs-panel', x: 0, y: 0, w: 6, h: 4 },
      { i: 'metrics-metrics-panel', x: 6, y: 0, w: 6, h: 4 }
    ]);
    expect(JSON.parse(dashboard.widgets)).toEqual([
      expect.objectContaining({
        id: 'logs-logs-panel',
        signal: 'logs',
        route: '/log/manage?view=table&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot'
      }),
      expect.objectContaining({ id: 'metrics-metrics-panel', signal: 'metrics' })
    ]);
    expect(parseSignalDashboardVariables(dashboard)).toEqual([
      expect.objectContaining({ name: 'service.name', type: 'textbox', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', type: 'textbox', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', type: 'textbox', value: 'prod' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', type: 'textbox', value: '7' }),
      expect.objectContaining({ name: 'hertzbeat.entity_name', type: 'textbox', value: 'Checkout API' }),
      expect.objectContaining({ name: 'hertzbeat.source', type: 'textbox', value: 'otlp' }),
      expect.objectContaining({ name: 'hertzbeat.collector', type: 'textbox', value: 'collector-a' }),
      expect.objectContaining({ name: 'hertzbeat.template', type: 'textbox', value: 'spring-boot' })
    ]);
    expect(JSON.parse(String(dashboard.panelMap))).toEqual({
      'logs-logs-panel': 'logs-panel',
      'metrics-metrics-panel': 'metrics-panel'
    });
  });

  it('builds a service overview dashboard from HertzBeat entity context', () => {
    const dashboard = buildSignalServiceOverviewDashboard({
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      entityId: '4200',
      entityType: 'service',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      timeRange: 'last-1h',
      refresh: '30',
      live: 'true'
    });
    const panels = parseSignalDashboardPreviewPanels(dashboard);
    const variables = parseSignalDashboardVariables(dashboard);
    const plans = buildSignalDashboardExecutionPlans(dashboard);

    expect(dashboard).toEqual(expect.objectContaining({
      dashboardKey: 'service-checkout-overview',
      title: 'Checkout API service overview',
      tags: 'service,apm,metrics,logs,traces,alerts'
    }));
    expect(panels).toHaveLength(18);
    expect(variables).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'service.name', type: 'query', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', type: 'query', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', type: 'query', value: 'prod' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', type: 'dynamic', value: '4200' }),
      expect.objectContaining({ name: 'hertzbeat.entity_type', type: 'dynamic', value: 'service' }),
      expect.objectContaining({ name: 'hertzbeat.template', type: 'dynamic', value: 'spring-boot' })
    ]));
    expect(panels.map(panel => panel.widget.title)).toEqual([
      'Service overview: service.name=checkout',
      'Service overview table: service.name=checkout',
      'Service overview latency p95: service.name=checkout',
      'Service overview request rate: service.name=checkout',
      'Service overview error rate: service.name=checkout',
      'Service overview apdex: service.name=checkout',
      'Service overview db calls rate: service.name=checkout',
      'Service overview db call duration: service.name=checkout',
      'Service overview external calls rate: service.name=checkout',
      'Service overview external call duration: service.name=checkout',
      'Service overview key operations: service.name=checkout',
      'Service overview logs: service.name=checkout',
      'Service overview log errors: service.name=checkout',
      'Service overview traces: service.name=checkout',
      'Service overview trace errors: service.name=checkout',
      'Service overview exceptions: service.name=checkout',
      'Service overview exception messages: service.name=checkout',
      'Service overview firing alerts: service.name=checkout'
    ]);
    expect(plans[2]).toEqual(expect.objectContaining({
      signal: 'metrics',
      primaryUrl: expect.stringContaining('/ingestion/otlp/metrics/console?')
    }));
    expect(plans[2]?.primaryUrl).toContain('query=http.server.duration');
    expect(plans[2]?.primaryUrl).toContain('entityType=service');
    expect(plans[3]?.primaryUrl).toContain('query=http_server_duration_milliseconds_count');
    expect(plans[3]?.primaryUrl).toContain('temporalAggregation=rate');
    expect(plans[5]?.apiUrls).toEqual(expect.objectContaining({
      apdexTolerating: expect.stringContaining('le%3D%222.0%22'),
      apdexTotal: expect.stringContaining('query=http.server.duration.count')
    }));
    expect(plans[12]?.primaryUrl).toContain('/logs/list?');
    expect(plans[12]?.primaryUrl).toContain('severityText=ERROR');
    expect(plans[15]?.primaryUrl).toContain('/traces/stats/group-by?');
    expect(plans[15]?.primaryUrl).toContain('groupBy=exception.type');
    expect(plans[17]?.primaryUrl).toContain('/alerts/group?');
    expect(plans.every(plan => plan.state === 'ready')).toBe(true);
  });

  it('builds an operation drilldown dashboard without promoting operation to an entity', () => {
    const dashboard = buildSignalOperationDrilldownDashboard({
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      operationName: 'POST /checkout',
      entityId: '4200',
      entityType: 'service',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      timeRange: 'last-1h'
    });
    const panels = parseSignalDashboardPreviewPanels(dashboard);
    const variables = parseSignalDashboardVariables(dashboard);
    const plans = buildSignalDashboardExecutionPlans(dashboard);

    expect(dashboard).toEqual(expect.objectContaining({
      dashboardKey: 'service-checkout-operation-post-checkout-drilldown',
      title: 'Checkout API POST /checkout operation drilldown',
      tags: 'service,operation,apm,metrics,logs,traces'
    }));
    expect(panels).toHaveLength(8);
    expect(panels.map(panel => panel.widget.title)).toEqual([
      'Operation drilldown latency p95: operation.name=POST /checkout',
      'Operation drilldown request rate: operation.name=POST /checkout',
      'Operation drilldown error rate: operation.name=POST /checkout',
      'Operation drilldown logs: operation.name=POST /checkout',
      'Operation drilldown log errors: operation.name=POST /checkout',
      'Operation drilldown traces: operation.name=POST /checkout',
      'Operation drilldown trace errors: operation.name=POST /checkout',
      'Operation drilldown exceptions: operation.name=POST /checkout'
    ]);
    expect(variables).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'service.name', type: 'query', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', type: 'query', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', type: 'query', value: 'prod' }),
      expect.objectContaining({ name: 'operation.name', type: 'query', value: 'POST /checkout' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', type: 'dynamic', value: '4200' }),
      expect.objectContaining({ name: 'hertzbeat.entity_type', type: 'dynamic', value: 'service' })
    ]));
    expect(variables.find(variable => variable.name === 'operation.name')?.type).toBe('query');
    expect(variables.find(variable => variable.name === 'hertzbeat.entity_type')?.value).toBe('service');
    expect(variables.some(variable => variable.name === 'hertzbeat.operation_entity')).toBe(false);

    expect(plans[0]).toEqual(expect.objectContaining({
      signal: 'metrics',
      primaryUrl: expect.stringContaining('/ingestion/otlp/metrics/console?')
    }));
    expect(plans[0]?.primaryUrl).toContain('query=http.server.duration');
    expect(plans[0]?.primaryUrl).toContain('operation%3D%22POST+%2Fcheckout%22');
    expect(plans[1]?.primaryUrl).toContain('temporalAggregation=rate');
    expect(plans[2]?.primaryUrl).toContain('status_code%3D%22STATUS_CODE_ERROR%22');
    expect(plans[3]?.primaryUrl).toContain('/logs/list?');
    expect(plans[3]?.primaryUrl).toContain('attributeFilter=http.route%3APOST+%2Fcheckout');
    expect(plans[4]?.primaryUrl).toContain('severityText=ERROR');
    expect(plans[5]?.primaryUrl).toContain('/traces/list?');
    expect(plans[5]?.primaryUrl).toContain('operationName=POST+%2Fcheckout');
    expect(plans[6]?.primaryUrl).toContain('errorOnly=true');
    expect(plans[7]?.primaryUrl).toContain('/traces/stats/group-by?');
    expect(plans[7]?.primaryUrl).toContain('groupBy=exception.type');
    expect(plans.every(plan => plan.state === 'ready')).toBe(true);
  });

  it('merges suggested panel drafts into an existing dashboard composition', () => {
    const dashboard = buildSignalDashboardCompositionFromDrafts({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Existing dashboard',
      tags: ['metrics'],
      drafts: [{
        signal: 'metrics',
        draftKey: 'metrics-graph',
        title: 'Latency graph',
        description: 'Latency',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=latency&serviceName=checkout&serviceNamespace=payments&environment=prod'
      }]
    });
    const merged = mergeSignalDashboardDraftsIntoComposition(dashboard, [
      {
        signal: 'metrics',
        draftKey: 'metrics-graph',
        title: 'Latency graph duplicate',
        description: 'Duplicate',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=latency&serviceName=checkout&serviceNamespace=payments&environment=prod'
      },
      {
        signal: 'metrics',
        draftKey: 'metrics-table',
        title: 'Latency table',
        description: 'Latency table',
        visualization: 'table',
        route: '/ingestion/otlp/metrics?query=latency&serviceName=checkout&serviceNamespace=payments&environment=prod&inspector=table'
      }
    ]);

    expect(JSON.parse(merged.widgets)).toEqual([
      expect.objectContaining({ id: 'metrics-metrics-graph', draftKey: 'metrics-graph', title: 'Latency graph' }),
      expect.objectContaining({ id: 'metrics-metrics-table', draftKey: 'metrics-table', title: 'Latency table' })
    ]);
    expect(JSON.parse(merged.layout)).toEqual([
      { i: 'metrics-metrics-graph', x: 0, y: 0, w: 6, h: 4 },
      { i: 'metrics-metrics-table', x: 0, y: 4, w: 6, h: 4 }
    ]);
    expect(JSON.parse(String(merged.panelMap))).toEqual({
      'metrics-metrics-graph': 'metrics-graph',
      'metrics-metrics-table': 'metrics-table'
    });
    expect(parseSignalDashboardVariables(merged)).toEqual([
      expect.objectContaining({ name: 'service.name', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', value: 'prod' })
    ]);
  });

  it('derives dashboard variables from signal panel draft routes', () => {
    expect(buildSignalDashboardVariablesFromDrafts([
      {
        signal: 'traces',
        draftKey: 'trace-panel',
        title: 'Checkout traces',
        description: 'Trace context',
        visualization: 'trace',
        route: '/trace/manage?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot'
      }
    ])).toEqual([
      expect.objectContaining({ name: 'service.name', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', value: 'prod' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', value: '7' }),
      expect.objectContaining({ name: 'hertzbeat.entity_type', value: 'service' }),
      expect.objectContaining({ name: 'hertzbeat.entity_name', value: 'Checkout API' }),
      expect.objectContaining({ name: 'hertzbeat.source', value: 'otlp' }),
      expect.objectContaining({ name: 'hertzbeat.collector', value: 'collector-a' }),
      expect.objectContaining({ name: 'hertzbeat.template', value: 'spring-boot' })
    ]);
  });

  it('parses and updates dashboard variables defensively', () => {
    const dashboard = updateSignalDashboardVariables({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: '',
      layout: '[]',
      widgets: '[]',
      variables: '{bad-json'
    }, [
      {
        name: 'service.name',
        type: 'custom',
        value: 'checkout',
        description: 'Service selector',
        options: ['checkout', 'billing'],
        multi: true
      },
      {
        name: 'bad name / with spaces',
        type: 'textbox',
        value: 'prod'
      }
    ]);

    expect(parseSignalDashboardVariables(dashboard)).toEqual([
      {
        name: 'service.name',
        type: 'custom',
        value: 'checkout',
        description: 'Service selector',
        options: ['checkout', 'billing'],
        multi: true
      },
      expect.objectContaining({ name: 'bad_name_with_spaces', type: 'textbox', value: 'prod' })
    ]);
    expect(parseSignalDashboardVariables({ variables: '{bad-json' })).toEqual([]);
  });

  it('applies dashboard variables to saved routes and query snapshots', () => {
    const variables = [
      {
        name: 'service.name',
        type: 'textbox' as const,
        value: 'checkout'
      },
      {
        name: 'deployment.environment.name',
        type: 'textbox' as const,
        value: 'prod'
      }
    ];

    expect(applySignalDashboardVariables(
      '/log/manage?serviceName=$service.name&environment=$deployment.environment.name&unknown=$missing',
      variables
    )).toBe('/log/manage?serviceName=checkout&environment=prod&unknown=$missing');
  });

  it('normalizes and applies dashboard time ranges to route-like saved panel routes', () => {
    expect(normalizeSignalDashboardTimeRange({ start: ' 100 ', end: ' 200 ', timeRange: 'last-1h' })).toEqual({
      start: '100',
      end: '200'
    });
    expect(normalizeSignalDashboardTimeRange({ timeRange: ' last-1h ' })).toEqual({ timeRange: 'last-1h' });
    expect(normalizeSignalDashboardTimeRange({ timeRange: ' last-1h ', refresh: ' 30 ', live: ' true ' })).toEqual({
      timeRange: 'last-1h',
      refresh: '30',
      live: 'true'
    });
    expect(normalizeSignalDashboardTimeRange({ timeRange: 'last-1h', refresh: '30', live: 'false' })).toEqual({
      timeRange: 'last-1h',
      live: 'false'
    });
    expect(resolveSignalDashboardRefreshState({ refresh: '30' })).toEqual({
      mode: 'auto',
      intervalSeconds: 30,
      tickMs: 30000
    });
    expect(resolveSignalDashboardRefreshState({ refresh: '30', live: 'false' })).toEqual({
      mode: 'manual',
      intervalSeconds: -1,
      tickMs: 0
    });
    expect(resolveSignalDashboardRefreshState({})).toEqual({
      mode: 'manual',
      intervalSeconds: -1,
      tickMs: 0
    });
    expect(resolveSignalDashboardTimeRange({ timeRange: 'last-1h' }, 1_712_733_600_000)).toEqual({
      start: '1712730000000',
      end: '1712733600000'
    });
    expect(applySignalDashboardTimeRange(
      '/log/manage?search=timeout&start=10&end=20&timeRange=last-1h',
      { start: '100', end: '200' }
    )).toBe('/log/manage?search=timeout&start=100&end=200');
    expect(applySignalDashboardTimeRange(
      '/log/manage?search=timeout&start=10&end=20&refresh=10',
      { start: '100', end: '200', refresh: '30', live: 'true' }
    )).toBe('/log/manage?search=timeout&start=100&end=200&refresh=30&live=true');
    expect(applySignalDashboardTimeRange(
      '/log/manage?search=timeout&refresh=30&live=true',
      { timeRange: 'last-30m', live: 'false' }
    )).toBe('/log/manage?search=timeout&live=false&timeRange=last-30m');
    expect(applySignalDashboardTimeRange(
      '/ingestion/otlp/metrics?query=cpu&start=10&end=20',
      { timeRange: 'last-30m' }
    )).toBe('/ingestion/otlp/metrics?query=cpu&timeRange=last-30m');
    expect(applySignalDashboardTimeRange('service.name=checkout', { start: '100', end: '200' })).toBe('service.name=checkout');
  });

  it('expands multi-value variables from selected values or custom options', () => {
    expect(resolveSignalDashboardVariableValue({
      name: 'service.name',
      type: 'custom',
      value: '',
      options: ['checkout', 'billing'],
      multi: true
    })).toBe('checkout|billing');
    expect(resolveSignalDashboardVariableValue({
      name: 'service.name',
      type: 'custom',
      value: 'checkout, payments',
      options: ['ignored'],
      multi: true
    })).toBe('checkout|payments');
  });

  it('selects dashboard variable options and re-resolves saved panel routes', () => {
    const selectedVariables = selectSignalDashboardVariableOption([
      {
        name: 'service.name',
        type: 'query',
        value: 'checkout',
        options: ['checkout', 'payments'],
        multi: false
      },
      {
        name: 'deployment.environment.name',
        type: 'custom',
        value: 'prod',
        options: ['prod', 'stage'],
        multi: true
      }
    ], 'service.name', 'payments');

    expect(selectedVariables[0]).toEqual(expect.objectContaining({
      name: 'service.name',
      value: 'payments'
    }));
    expect(selectSignalDashboardVariableOption(selectedVariables, 'deployment.environment.name', 'stage')[1]).toEqual(expect.objectContaining({
      name: 'deployment.environment.name',
      value: 'prod,stage'
    }));
    expect(selectSignalDashboardVariableOption([
      {
        name: 'deployment.environment.name',
        type: 'custom',
        value: 'prod,stage',
        options: ['prod', 'stage'],
        multi: true
      }
    ], 'deployment.environment.name', 'prod')[0]).toEqual(expect.objectContaining({
      value: 'stage'
    }));
    expect(selectSignalDashboardVariableOption(selectedVariables, 'service.name', '')[0]).toEqual(expect.objectContaining({
      name: 'service.name',
      value: ''
    }));

    const dashboard = updateSignalDashboardVariables({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      layout: JSON.stringify([{ i: 'logs-errors', x: 0, y: 0, w: 6, h: 4 }]),
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'table',
          route: '/log/manage?serviceName=$service.name&environment=$deployment.environment.name'
        }
      ])
    }, selectSignalDashboardVariableOption(selectedVariables, 'deployment.environment.name', 'stage'));

    expect(resolveSignalDashboardPreviewPanels(dashboard)[0]).toEqual(expect.objectContaining({
      resolvedRoute: '/log/manage?serviceName=payments&environment=prod|stage'
    }));
  });

  it('derives query and dynamic variable options from ready panel runtime data', () => {
    const options = buildSignalDashboardVariableOptions([
      {
        name: 'service.name',
        type: 'query',
        value: '',
        options: ['checkout'],
        multi: false
      },
      {
        name: 'deployment.environment.name',
        type: 'dynamic',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'service.namespace',
        type: 'query',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'hertzbeat.entity_name',
        type: 'query',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'hertzbeat.source',
        type: 'dynamic',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'hertzbeat.collector',
        type: 'dynamic',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'hertzbeat.template',
        type: 'dynamic',
        value: '',
        options: [],
        multi: false
      },
      {
        name: 'release',
        type: 'custom',
        value: '',
        options: ['stable'],
        multi: false
      }
    ], [
      {
        panelId: 'logs',
        signal: 'logs',
        visualization: 'table',
        state: 'ready',
        sourceRoute: '/log/manage',
        resolvedRoute: '/log/manage',
        resolvedQuerySnapshot: '/log/manage',
        primaryUrl: '/log/list',
        apiUrls: { list: '/log/list' }
      },
      {
        panelId: 'metrics',
        signal: 'metrics',
        visualization: 'time-series',
        state: 'ready',
        sourceRoute: '/ingestion/otlp/metrics',
        resolvedRoute: '/ingestion/otlp/metrics',
        resolvedQuerySnapshot: '/ingestion/otlp/metrics',
        primaryUrl: '/metrics/console',
        apiUrls: { console: '/metrics/console' }
      }
    ], {
      logs: {
        panelId: 'logs',
        state: 'ready',
        primaryUrl: '/log/list',
        apiUrl: '/log/list',
        data: {
          content: [
            {
              serviceName: 'checkout',
              serviceNamespace: 'payments',
              entityName: 'Checkout API',
              source: 'otlp',
              collector: 'collector-a',
              template: 'spring-boot',
              resource: {
                'service.name': 'checkout',
                'service.namespace': 'payments',
                'deployment.environment.name': 'prod',
                'hertzbeat.entity_name': 'Checkout API',
                'hertzbeat.source': 'otlp',
                'hertzbeat.collector': 'collector-a',
                'hertzbeat.template': 'spring-boot'
              }
            },
            {
              serviceName: 'payments',
              serviceNamespace: 'payments',
              entityName: 'Checkout API',
              source: 'otlp',
              collector: 'collector-a',
              template: 'spring-boot',
              resource: {
                'service.name': 'payments',
                'service.namespace': 'payments',
                'deployment.environment.name': 'prod',
                'hertzbeat.entity_name': 'Checkout API',
                'hertzbeat.source': 'otlp',
                'hertzbeat.collector': 'collector-a',
                'hertzbeat.template': 'spring-boot'
              }
            }
          ]
        }
      },
      metrics: {
        panelId: 'metrics',
        state: 'ready',
        primaryUrl: '/metrics/console',
        apiUrl: '/metrics/console',
        data: {
          results: {
            frames: [
              {
                schema: {
                  labels: {
                    'service.name': 'checkout',
                    'service.namespace': 'payments',
                    'deployment.environment.name': 'stage',
                    'hertzbeat.entity_name': 'Checkout API',
                    'hertzbeat.source': 'otlp',
                    'hertzbeat.collector': 'collector-a',
                    'hertzbeat.template': 'spring-boot'
                  }
                },
                data: [[100, 1]]
              }
            ]
          }
        }
      }
    });

    expect(options['service.name']).toEqual([
      expect.objectContaining({ value: 'checkout', source: 'static', count: 1 }),
      expect.objectContaining({ value: 'payments', source: 'runtime', count: 2 })
    ]);
    expect(options['deployment.environment.name']).toEqual([
      expect.objectContaining({ value: 'prod', source: 'runtime', count: 2 }),
      expect.objectContaining({ value: 'stage', source: 'runtime', count: 1 })
    ]);
    expect(options['service.namespace']).toEqual([
      expect.objectContaining({ value: 'payments', source: 'runtime', count: 5 })
    ]);
    expect(options['hertzbeat.entity_name']).toEqual([
      expect.objectContaining({ value: 'Checkout API', source: 'runtime', count: 5 })
    ]);
    expect(options['hertzbeat.source']).toEqual([
      expect.objectContaining({ value: 'otlp', source: 'runtime', count: 5 })
    ]);
    expect(options['hertzbeat.collector']).toEqual([
      expect.objectContaining({ value: 'collector-a', source: 'runtime', count: 5 })
    ]);
    expect(options['hertzbeat.template']).toEqual([
      expect.objectContaining({ value: 'spring-boot', source: 'runtime', count: 5 })
    ]);
    expect(options.release).toEqual([
      expect.objectContaining({ value: 'stable', source: 'static', count: 1 })
    ]);
    expect(filterSignalDashboardVariableOptions(options['service.name'], 'pay')).toEqual([
      expect.objectContaining({ value: 'payments', source: 'runtime' })
    ]);
    expect(filterSignalDashboardVariableOptions(options['service.name'], 'static')).toEqual([
      expect.objectContaining({ value: 'checkout', source: 'static' })
    ]);
  });

  it('resolves saved dashboard preview panels with current variable values', () => {
    const panels = resolveSignalDashboardPreviewPanels({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      variables: JSON.stringify([
        { name: 'service.name', type: 'textbox', value: 'checkout' },
        { name: 'service.namespace', type: 'textbox', value: 'payments' },
        { name: 'deployment.environment.name', type: 'textbox', value: 'prod' }
      ]),
      layout: JSON.stringify([{ i: 'logs-errors', x: 0, y: 0, w: 6, h: 4 }]),
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'table',
          route: '/log/manage?serviceName=$service.name&serviceNamespace=$service.namespace&environment=$deployment.environment.name',
          querySnapshot: 'service.name=$service.name service.namespace=$service.namespace environment=$deployment.environment.name'
        }
      ])
    });

    expect(panels).toEqual([
      expect.objectContaining({
        resolvedRoute: '/log/manage?serviceName=checkout&serviceNamespace=payments&environment=prod',
        resolvedQuerySnapshot: 'service.name=checkout service.namespace=payments environment=prod'
      })
    ]);
  });

  it('preserves the dashboard-source-dashboard panel edit loop through shared contracts', () => {
    const sourceDraft = createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: 'CPU utilization',
      description: 'Initial metrics panel',
      visualization: 'time-series',
      route: '/ingestion/otlp/metrics?query=system.cpu.utilization&serviceName=checkout&inspector=graph&timeRange=last-15m'
    });
    const dashboard = buildSignalDashboardCompositionFromDrafts({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: ['metrics'],
      drafts: [sourceDraft]
    });
    const previewPanel = resolveSignalDashboardPreviewPanels(dashboard)[0];
    const returnTo = '/dashboard?dashboard=signals-overview&timeRange=last-15m';
    const editHref = buildSignalDashboardPanelEditHref({
      route: previewPanel.resolvedRoute,
      dashboardKey: dashboard.dashboardKey,
      panelId: previewPanel.widget.id,
      draftKey: previewPanel.widget.draftKey,
      returnTo,
      returnLabel: 'Signals overview'
    });
    const editUrl = new URL(editHref, 'http://localhost');
    const editContext = readSignalPanelEditContext({ get: name => editUrl.searchParams.get(name) });

    expect(editHref).toBe(
      `/ingestion/otlp/metrics?query=system.cpu.utilization&serviceName=checkout&inspector=graph&timeRange=last-15m&intent=edit-panel&dashboardKey=signals-overview&panelId=${previewPanel.widget.id}&draftKey=${sourceDraft.draftKey}&returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview%26timeRange%3Dlast-15m&returnLabel=Signals+overview`
    );
    expect(editContext).toEqual({
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: previewPanel.widget.id,
      draftKey: sourceDraft.draftKey,
      returnTo,
      returnLabel: 'Signals overview'
    });

    const editedDraft = applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: 'Latency p95',
      description: 'Edited metrics panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration.p95&serviceName=payments&inspector=graph&timeRange=last-15m'
    }), editContext);
    const updatedDashboard = updateSignalDashboardPanelWidgetFromDraft(
      dashboard,
      previewPanel.widget.id,
      editedDraft
    );
    const updatedPreviewPanel = resolveSignalDashboardPreviewPanels(updatedDashboard)[0];
    const editMetadata = readSignalDashboardWidgetPanelEditMetadata(updatedPreviewPanel.widget);

    expect(updatedPreviewPanel.widget).toEqual(expect.objectContaining({
      id: previewPanel.widget.id,
      draftKey: sourceDraft.draftKey,
      title: 'Latency p95',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration.p95&serviceName=payments&inspector=graph&timeRange=last-15m'
    }));
    expect(updatedPreviewPanel.resolvedRoute).toBe(
      '/ingestion/otlp/metrics?query=http.server.duration.p95&serviceName=payments&inspector=graph&timeRange=last-15m'
    );
    expect(JSON.parse(String(updatedDashboard.panelMap))).toEqual({
      [previewPanel.widget.id]: sourceDraft.draftKey
    });
    expect(editMetadata).toEqual(editContext);
  });

  it('builds executable API plans for resolved logs, traces, and metrics panels', () => {
    const plans = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces,metrics',
      variables: JSON.stringify([
        { name: 'service.name', type: 'textbox', value: 'checkout' },
        { name: 'deployment.environment.name', type: 'textbox', value: 'prod' }
      ]),
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'time-series',
          route: '/log/manage?search=$service.name&serviceName=$service.name&environment=$deployment.environment.name&start=10&end=20&view=time-series'
        },
        {
          id: 'traces-errors',
          signal: 'traces',
          title: 'Trace errors',
          visualization: 'table',
          route: '/trace/manage?serviceName=$service.name&environment=$deployment.environment.name&errorOnly=true&spanScope=all&start=10&end=20&view=table'
        },
        {
          id: 'metrics-cpu',
          signal: 'metrics',
          title: 'CPU',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?query=system.cpu.utilization&serviceName=$service.name&environment=$deployment.environment.name&step=60&inspector=graph'
        }
      ])
    });

    expect(plans).toEqual([
      expect.objectContaining({
        panelId: 'logs-errors',
        state: 'ready',
        view: 'time-series',
        primaryUrl: '/logs/stats/trend?search=checkout&serviceName=checkout&environment=prod&start=10&end=20',
        apiUrls: expect.objectContaining({
          list: '/logs/list?pageIndex=0&pageSize=8&search=checkout&serviceName=checkout&environment=prod&start=10&end=20',
          coverage: '/logs/stats/trace-coverage?search=checkout&serviceName=checkout&environment=prod&start=10&end=20'
        })
      }),
      expect.objectContaining({
        panelId: 'traces-errors',
        state: 'ready',
        view: 'table',
        primaryUrl: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&start=10&end=20',
        apiUrls: expect.objectContaining({
          overview: '/traces/stats/overview?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&start=10&end=20'
        })
      }),
      expect.objectContaining({
        panelId: 'metrics-cpu',
        state: 'ready',
        view: 'graph',
        primaryUrl: '/ingestion/otlp/metrics/console?query=system.cpu.utilization&step=60&serviceName=checkout&environment=prod',
        apiUrls: {
          console: '/ingestion/otlp/metrics/console?query=system.cpu.utilization&step=60&serviceName=checkout&environment=prod'
        }
      })
    ]);
  });

  it('replays saved-view promoted logs, traces, and metrics panels through dashboard execution plans', () => {
    const promotedDrafts = [
      createSignalDashboardPanelDraftFromSavedView('logs', {
        id: 'logs-checkout-errors',
        label: 'Checkout errors',
        description: '',
        route: '/log/manage?view=table&search=timeout&severityText=ERROR&serviceName=checkout&serviceNamespace=payments&environment=prod&traceId=trace-1&spanId=span-1&resourceFilter=service.version%3D1.2.3&attributeFilter=region%3Dus&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=count-asc&groupMinCount=2&columns=time%2Cseverity%2Cbody&format=column&maxLines=3&listPageSize=20&listPageIndex=1&start=1000&end=3000',
        createdAt: 1780740000000
      }),
      createSignalDashboardPanelDraftFromSavedView('traces', {
        id: 'traces-checkout-latency',
        label: 'Checkout traces',
        description: '',
        route: '/trace/manage?view=time-series&serviceName=checkout&serviceNamespace=payments&operationName=POST+%2Fcheckout&environment=prod&resourceFilter=service.version%3D1.2.3&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=entrypoint&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=latency-p95-desc&groupMinCount=2&columns=start%2Cservice%2Cduration&start=1000&end=3000',
        createdAt: 1780740000000
      }),
      createSignalDashboardPanelDraftFromSavedView('metrics', {
        id: 'metrics-checkout-p95',
        label: 'Checkout p95',
        description: '',
        route: '/ingestion/otlp/metrics?query=http.server.duration&series=checkout_latency-0&filter=service.name%3D%22checkout%22&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&aggregation=p95&temporalAggregation=rate&groupBy=route&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=10&inspector=table&warningThreshold=75&criticalThreshold=90&expectedRange=on&relatedMetricSource=pod&relatedMetricFamily=latency&relatedMetricReason=resource-filter&relatedMetricMatchedLabels=k8s_pod_name&relatedMetricResourceMatch=%7B%22k8s_pod_name%22%3A%22checkout-7d9%22%7D&start=1000&end=3000',
        createdAt: 1780740000000
      })
    ];
    const dashboard = mergeSignalDashboardDraftsIntoComposition({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Saved-view promoted dashboard',
      tags: 'logs,traces,metrics',
      layout: '[]',
      widgets: '[]'
    }, promotedDrafts);

    const plans = buildSignalDashboardExecutionPlans(dashboard);
    const logPlan = plans.find(plan => plan.signal === 'logs');
    const tracePlan = plans.find(plan => plan.signal === 'traces');
    const metricsPlan = plans.find(plan => plan.signal === 'metrics');

    expect(logPlan).toEqual(expect.objectContaining({
      state: 'ready',
      view: 'table',
      resolvedRoute: expect.stringContaining('/log/manage?'),
      primaryUrl: expect.stringContaining('/logs/stats/group-by?')
    }));
    expect(logPlan?.resolvedRoute).toContain('columns=time%2Cseverity%2Cbody');
    expect(logPlan?.resolvedRoute).toContain('format=column');
    const logGroupUrl = new URL(logPlan?.apiUrls.groupBy || '', 'http://localhost');
    expect(logGroupUrl.searchParams.get('search')).toBe('timeout');
    expect(logGroupUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(logGroupUrl.searchParams.get('serviceNamespace')).toBe('payments');
    expect(logGroupUrl.searchParams.get('environment')).toBe('prod');
    expect(logGroupUrl.searchParams.get('groupBy')).toBe('resource:service.version');
    expect(logGroupUrl.searchParams.get('limit')).toBe('7');
    expect(logGroupUrl.searchParams.get('orderBy')).toBe('count-asc');
    expect(logGroupUrl.searchParams.get('minCount')).toBe('2');

    expect(tracePlan).toEqual(expect.objectContaining({
      state: 'ready',
      view: 'time-series',
      resolvedRoute: expect.stringContaining('/trace/manage?'),
      primaryUrl: expect.stringContaining('/traces/stats/group-by?')
    }));
    const traceGroupUrl = new URL(tracePlan?.apiUrls.groupBy || '', 'http://localhost');
    expect(traceGroupUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(traceGroupUrl.searchParams.get('serviceNamespace')).toBe('payments');
    expect(traceGroupUrl.searchParams.get('operationName')).toBe('POST /checkout');
    expect(traceGroupUrl.searchParams.get('resourceFilter')).toBe('service.version=1.2.3');
    expect(traceGroupUrl.searchParams.get('minDurationMs')).toBe('100');
    expect(traceGroupUrl.searchParams.get('maxDurationMs')).toBe('500');
    expect(traceGroupUrl.searchParams.get('errorOnly')).toBe('true');
    expect(traceGroupUrl.searchParams.get('spanScope')).toBe('entrypoint');
    expect(traceGroupUrl.searchParams.get('groupBy')).toBe('resource:service.version');

    expect(metricsPlan).toEqual(expect.objectContaining({
      state: 'ready',
      view: 'table',
      resolvedRoute: expect.stringContaining('/ingestion/otlp/metrics?'),
      primaryUrl: expect.stringContaining('/ingestion/otlp/metrics/console?')
    }));
    expect(metricsPlan?.resolvedRoute).toContain('relatedMetricSource=pod');
    expect(metricsPlan?.resolvedRoute).toContain('relatedMetricResourceMatch=');
    const metricsConsoleUrl = new URL(metricsPlan?.primaryUrl || '', 'http://localhost');
    expect(metricsConsoleUrl.searchParams.get('query')).toBe('http.server.duration');
    expect(metricsConsoleUrl.searchParams.get('filter')).toBe('service.name="checkout"');
    expect(metricsConsoleUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(metricsConsoleUrl.searchParams.get('serviceNamespace')).toBe('payments');
    expect(metricsConsoleUrl.searchParams.get('aggregation')).toBe('p95');
    expect(metricsConsoleUrl.searchParams.get('temporalAggregation')).toBe('rate');
    expect(metricsConsoleUrl.searchParams.get('groupBy')).toBe('route');
    expect(metricsConsoleUrl.searchParams.get('step')).toBe('60');
    expect(metricsConsoleUrl.searchParams.get('limit')).toBe('10');
    expect(metricsConsoleUrl.searchParams.get('relatedMetricSource')).toBeNull();
    expect(metricsConsoleUrl.searchParams.get('relatedMetricResourceMatch')).toBeNull();
  });

  it('overrides saved panel time ranges with a dashboard-level time range when building execution plans', () => {
    const plans = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces,metrics',
      variables: JSON.stringify([
        { name: 'service.name', type: 'textbox', value: 'checkout' }
      ]),
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'time-series',
          route: '/log/manage?search=$service.name&start=10&end=20&view=time-series'
        },
        {
          id: 'traces-errors',
          signal: 'traces',
          title: 'Trace errors',
          visualization: 'table',
          route: '/trace/manage?serviceName=$service.name&start=30&end=40&view=table'
        },
        {
          id: 'metrics-cpu',
          signal: 'metrics',
          title: 'CPU',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?query=cpu&timeRange=last-1h&serviceName=$service.name&inspector=graph'
        }
      ])
    }, {
      timeRange: { start: '100', end: '200' }
    });

    expect(plans).toEqual([
      expect.objectContaining({
        panelId: 'logs-errors',
        resolvedRoute: '/log/manage?search=checkout&start=100&end=200&view=time-series',
        primaryUrl: '/logs/stats/trend?search=checkout&start=100&end=200'
      }),
      expect.objectContaining({
        panelId: 'traces-errors',
        resolvedRoute: '/trace/manage?serviceName=checkout&start=100&end=200&view=table',
        primaryUrl: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&spanScope=root&start=100&end=200'
      }),
      expect.objectContaining({
        panelId: 'metrics-cpu',
        resolvedRoute: '/ingestion/otlp/metrics?query=cpu&serviceName=checkout&inspector=graph&start=100&end=200',
        primaryUrl: '/ingestion/otlp/metrics/console?query=cpu&serviceName=checkout&start=100&end=200'
      })
    ]);
  });

  it('resolves dashboard-level relative time ranges into one absolute execution window', () => {
    const plans = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces,metrics',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'time-series',
          route: '/log/manage?search=timeout&start=10&end=20&view=time-series'
        },
        {
          id: 'traces-errors',
          signal: 'traces',
          title: 'Trace errors',
          visualization: 'table',
          route: '/trace/manage?serviceName=checkout&timeRange=last-6h&view=table'
        },
        {
          id: 'metrics-cpu',
          signal: 'metrics',
          title: 'CPU',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?query=cpu&timeRange=last-6h&inspector=graph'
        }
      ])
    }, {
      timeRange: { timeRange: 'last-1h' },
      now: 1_712_733_600_000
    });

    expect(plans).toEqual([
      expect.objectContaining({
        panelId: 'logs-errors',
        resolvedRoute: '/log/manage?search=timeout&start=1712730000000&end=1712733600000&view=time-series',
        primaryUrl: '/logs/stats/trend?search=timeout&start=1712730000000&end=1712733600000'
      }),
      expect.objectContaining({
        panelId: 'traces-errors',
        resolvedRoute: '/trace/manage?serviceName=checkout&view=table&start=1712730000000&end=1712733600000',
        primaryUrl: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&spanScope=root&start=1712730000000&end=1712733600000'
      }),
      expect.objectContaining({
        panelId: 'metrics-cpu',
        resolvedRoute: '/ingestion/otlp/metrics?query=cpu&inspector=graph&start=1712730000000&end=1712733600000',
        primaryUrl: '/ingestion/otlp/metrics/console?query=cpu&start=1712730000000&end=1712733600000'
      })
    ]);
  });

  it('marks unsupported saved panel execution routes without inventing API calls', () => {
    const plans = buildSignalDashboardExecutionPlans({
      dashboardKey: 'bad',
      title: 'Bad',
      description: '',
      tags: '',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'logs-wrong-route',
          signal: 'logs',
          title: 'Logs',
          visualization: 'list',
          route: '/overview?search=error'
        },
        {
          id: 'unknown-signal',
          signal: 'profiles',
          title: 'Profiles',
          visualization: 'table',
          route: '/profiles'
        }
      ])
    });

    expect(plans).toEqual([
      expect.objectContaining({
        panelId: 'logs-wrong-route',
        state: 'unsupported',
        unsupportedReason: 'unsupported-route',
        apiUrls: {}
      }),
      expect.objectContaining({
        panelId: 'unknown-signal',
        state: 'unsupported',
        unsupportedReason: 'unsupported-signal',
        apiUrls: {}
      })
    ]);
  });

  it('executes a ready dashboard panel plan through the local API proxy', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'logs-errors',
          signal: 'logs',
          title: 'Errors',
          visualization: 'list',
          route: '/log/manage?search=timeout'
        }
      ])
    });
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: { rows: [{ id: 'log-1' }] }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(executeSignalDashboardPanelPlan(plan)).resolves.toEqual({
      panelId: 'logs-errors',
      state: 'ready',
      primaryUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout',
      apiUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout',
      data: { rows: [{ id: 'log-1' }] }
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/logs/list?pageIndex=0&pageSize=8&search=timeout', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('does not execute unsupported dashboard panel plans', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'bad',
      title: 'Bad',
      description: '',
      tags: '',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'profiles',
          signal: 'profiles',
          title: 'Profiles',
          visualization: 'table',
          route: '/profiles'
        }
      ])
    });
    const executor = vi.fn(async () => ({ rows: [] }));

    await expect(executeSignalDashboardPanelPlan(plan, executor)).resolves.toEqual(expect.objectContaining({
      panelId: 'profiles',
      state: 'unsupported',
      errorMessage: 'unsupported-signal'
    }));
    expect(executor).not.toHaveBeenCalled();
  });

  it('reports dashboard panel execution errors without converting them to empty data', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'metrics-cpu',
          signal: 'metrics',
          title: 'CPU',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?query=system.cpu.utilization'
        }
      ])
    });

    await expect(executeSignalDashboardPanelPlan(plan, async () => {
      throw new Error('backend offline');
    })).resolves.toEqual(expect.objectContaining({
      panelId: 'metrics-cpu',
      state: 'error',
      primaryUrl: '/ingestion/otlp/metrics/console?query=system.cpu.utilization',
      errorMessage: 'backend offline'
    }));
  });

  it('turns the deterministic three-signal demo seed routes into executable dashboard panel plans', () => {
    const seedPlan = readThreeSignalDemoSeedPlan();
    const plans = buildSignalDashboardExecutionPlans({
      dashboardKey: 'three-signal-demo',
      title: 'Three signal demo',
      description: 'Seeded OTLP demo dashboard',
      tags: 'metrics,logs,traces,alerts',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'demo-metrics',
          signal: 'metrics',
          title: 'Seeded checkout latency',
          visualization: 'graph',
          route: seedPlan.explicitMetricsUrl
        },
        {
          id: 'demo-logs',
          signal: 'logs',
          title: 'Seeded linked logs',
          visualization: 'list',
          route: seedPlan.logHistoryUrl
        },
        {
          id: 'demo-trace',
          signal: 'traces',
          title: 'Seeded checkout trace',
          visualization: 'table',
          route: seedPlan.traceUrl
        },
	        {
	          id: 'demo-alerts',
	          signal: 'alerts',
	          title: 'Seeded alert handling',
	          visualization: 'list',
	          route: seedPlan.alertUrl
	        },
	        {
	          id: 'demo-metrics-by-service-version',
	          signal: 'metrics',
	          title: 'Seeded metrics by service version',
	          visualization: 'graph',
	          route: seedPlan.breakoutRoutes.metricsByServiceVersion
	        },
	        {
	          id: 'demo-logs-by-service-version',
	          signal: 'logs',
	          title: 'Seeded logs by service version',
	          visualization: 'list',
	          route: seedPlan.breakoutRoutes.logsByServiceVersion
	        },
	        {
	          id: 'demo-traces-by-service-version',
	          signal: 'traces',
	          title: 'Seeded traces by service version',
	          visualization: 'list',
	          route: seedPlan.breakoutRoutes.tracesByServiceVersion
	        }
	      ])
	    });

	    const [metricsPlan, logsPlan, tracePlan, alertPlan, metricsBreakoutPlan, logsBreakoutPlan, tracesBreakoutPlan] = plans;
	    expect(plans.map(plan => `${plan.panelId}:${plan.signal}:${plan.state}`)).toEqual([
	      'demo-metrics:metrics:ready',
	      'demo-logs:logs:ready',
	      'demo-trace:traces:ready',
	      'demo-alerts:alerts:ready',
	      'demo-metrics-by-service-version:metrics:ready',
	      'demo-logs-by-service-version:logs:ready',
	      'demo-traces-by-service-version:traces:ready'
	    ]);

    expect(metricsPlan?.primaryUrl).toContain('/ingestion/otlp/metrics/console?');
    const metricsParams = apiUrlSearchParams(metricsPlan?.primaryUrl);
    expect(metricsParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    expect(metricsParams.get('serviceName')).toBe('checkout');
    expect(metricsParams.get('entityId')).toBe('4200');
    expect(metricsParams.get('entityName')).toBe('Checkout API');
    expect(metricsParams.get('environment')).toBe('demo');

    expect(logsPlan?.primaryUrl).toContain('/logs/list?');
    const logsParams = apiUrlSearchParams(logsPlan?.primaryUrl);
    expect(logsParams.get('traceId')).toBe(seedPlan.traceId);
    expect(logsParams.get('spanId')).toBe('1111222233334444');
    expect(logsParams.get('serviceName')).toBe('checkout');
    expect(logsParams.get('environment')).toBe('demo');

    expect(tracePlan?.primaryUrl).toContain('/traces/list?');
    const traceParams = apiUrlSearchParams(tracePlan?.primaryUrl);
    expect(traceParams.get('traceId')).toBe(seedPlan.traceId);
    expect(traceParams.get('serviceName')).toBe('checkout');
    expect(traceParams.get('entityId')).toBe('4200');
    expect(traceParams.get('spanScope')).toBe('root');

    expect(alertPlan?.primaryUrl).toContain('/alerts/group?');
    const alertParams = apiUrlSearchParams(alertPlan?.primaryUrl);
    expect(alertParams.get('search')).toBe('checkout');
    expect(alertParams.get('status')).toBe('firing');
    expect(alertParams.get('serviceName')).toBe('checkout');
    expect(alertParams.get('environment')).toBe('demo');
	    expect(alertPlan?.apiUrls.summary).toBe('/alerts/summary');
	    expect(alertPlan?.resolvedRoute).toContain('traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b');
	    expect(alertPlan?.resolvedRoute).toContain('entityId=4200');

	    const metricsBreakoutParams = apiUrlSearchParams(metricsBreakoutPlan?.primaryUrl);
	    expect(metricsBreakoutPlan?.primaryUrl).toContain('/ingestion/otlp/metrics/console?');
	    expect(metricsBreakoutParams.get('query')).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
	    expect(metricsBreakoutParams.get('groupBy')).toBe('service.version');
	    expect(metricsBreakoutParams.get('serviceName')).toBe('checkout');
	    expect(metricsBreakoutParams.get('environment')).toBe('demo');

    expect(logsBreakoutPlan?.primaryUrl).toContain('/logs/stats/group-by?');
    const logsBreakoutParams = apiUrlSearchParams(logsBreakoutPlan?.primaryUrl);
    expect(logsBreakoutParams.get('serviceName')).toBe('checkout');
    expect(logsBreakoutParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(logsBreakoutParams.get('environment')).toBe('demo');
    expect(logsBreakoutParams.get('groupBy')).toBe('resource:service.version');
    expect(logsBreakoutParams.get('limit')).toBe('8');

    expect(tracesBreakoutPlan?.primaryUrl).toContain('/traces/stats/group-by?');
    const tracesBreakoutParams = apiUrlSearchParams(tracesBreakoutPlan?.primaryUrl);
    expect(tracesBreakoutParams.get('serviceName')).toBe('checkout');
    expect(tracesBreakoutParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(tracesBreakoutParams.get('environment')).toBe('demo');
    expect(tracesBreakoutParams.get('groupBy')).toBe('resource:service.version');
    expect(tracesBreakoutParams.get('spanScope')).toBe('all');
    expect(tracesBreakoutParams.get('limit')).toBe('8');
	  });

  it('summarizes page-shaped log and trace panel execution data', () => {
    const [logPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'list', route: '/log/manage?search=timeout' }
      ])
    });

    expect(summarizeSignalDashboardPanelRuntime(logPlan, {
      panelId: 'logs-errors',
      state: 'ready',
      primaryUrl: logPlan.primaryUrl,
      data: {
        content: [{ id: 'log-1' }, { id: 'log-2' }],
        totalElements: 17,
        pageIndex: 0,
        pageSize: 8
      }
    })).toEqual(expect.objectContaining({
      panelId: 'logs-errors',
      state: 'ready',
      kind: 'page',
      itemCount: 2,
      totalCount: 17
    }));
  });

  it('summarizes log trend and trace overview panel execution data', () => {
    const [logTrendPlan, traceOverviewPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-trend', signal: 'logs', title: 'Log trend', visualization: 'time-series', route: '/log/manage?search=timeout&view=time-series' },
        { id: 'traces-trend', signal: 'traces', title: 'Trace trend', visualization: 'time-series', route: '/trace/manage?serviceName=checkout&view=time-series' }
      ])
    });

    expect(summarizeSignalDashboardPanelRuntime(logTrendPlan, {
      panelId: 'logs-trend',
      state: 'ready',
      primaryUrl: logTrendPlan.primaryUrl,
      data: { hourlyStats: { '10:00': 3, '11:00': 5 } }
    })).toEqual(expect.objectContaining({
      kind: 'time-series',
      itemCount: 2,
      totalCount: 8,
      sampleCount: 2
    }));
    expect(summarizeSignalDashboardPanelRuntime(traceOverviewPlan, {
      panelId: 'traces-trend',
      state: 'ready',
      primaryUrl: traceOverviewPlan.primaryUrl,
      data: { totalTraceCount: 9, errorTraceCount: 1, latestObservedAt: 1710000000000 }
    })).toEqual(expect.objectContaining({
      kind: 'overview',
      itemCount: 9,
      totalCount: 9,
      latestObservedAt: 1710000000000
    }));
  });

  it('summarizes metrics console frames without inventing samples', () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'metrics-cpu', signal: 'metrics', title: 'CPU', visualization: 'graph', route: '/ingestion/otlp/metrics?query=system.cpu.utilization' }
      ])
    });

    expect(summarizeSignalDashboardPanelRuntime(plan, {
      panelId: 'metrics-cpu',
      state: 'ready',
      primaryUrl: plan.primaryUrl,
      data: {
        stats: { totalSeries: 3, nonEmptySeries: 2, latestObservedAt: 1710000000000 },
        results: {
          frames: [
            { data: [[1, 0.1], [2, 0.2]] },
            { data: [[1, 0.3]] }
          ]
        }
      }
    })).toEqual(expect.objectContaining({
      kind: 'metrics-console',
      itemCount: 2,
      totalCount: 3,
      seriesCount: 2,
      sampleCount: 3,
      latestObservedAt: 1710000000000
    }));
  });

  it('summarizes loading, unsupported, and error runtime states explicitly', () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'bad',
      title: 'Bad',
      description: '',
      tags: '',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'unknown', signal: 'profiles', title: 'Profiles', visualization: 'table', route: '/profiles' }
      ])
    });

    expect(summarizeSignalDashboardPanelRuntime(plan, undefined)).toEqual(expect.objectContaining({
      state: 'loading',
      kind: 'loading',
      itemCount: 0
    }));
    expect(summarizeSignalDashboardPanelRuntime(plan, {
      panelId: 'unknown',
      state: 'unsupported',
      errorMessage: 'unsupported-signal'
    })).toEqual(expect.objectContaining({
      state: 'unsupported',
      kind: 'unsupported',
      errorMessage: 'unsupported-signal'
    }));
    expect(summarizeSignalDashboardPanelRuntime({ ...plan, state: 'ready', primaryUrl: '/api/profiles' }, {
      panelId: 'unknown',
      state: 'error',
      primaryUrl: '/api/profiles',
      errorMessage: 'backend offline'
    })).toEqual(expect.objectContaining({
      state: 'error',
      kind: 'error',
      errorMessage: 'backend offline'
    }));
  });

  it('builds row previews from page-shaped log runtime data', () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'table', route: '/log/manage?search=timeout' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimePreview(plan, {
      panelId: 'logs-errors',
      state: 'ready',
      primaryUrl: plan.primaryUrl,
      data: {
        content: [
          {
            severityText: 'ERROR',
            body: 'checkout timeout',
            traceId: 'trace-1',
            resource: { 'service.name': 'checkout' }
          }
        ],
        totalElements: 1
      }
    })).toEqual(expect.objectContaining({
      mode: 'rows',
      kind: 'page',
      rows: [
        {
          key: 'logs-errors:row:0',
          title: 'ERROR',
          copy: 'checkout timeout',
          meta: 'trace-1'
        }
      ],
      bars: []
    }));
  });

  it('builds bar previews from trend and metrics runtime data', () => {
    const [logTrendPlan, metricsPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-trend', signal: 'logs', title: 'Log trend', visualization: 'time-series', route: '/log/manage?view=time-series' },
        { id: 'metrics-cpu', signal: 'metrics', title: 'CPU', visualization: 'graph', route: '/ingestion/otlp/metrics?query=cpu' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimePreview(logTrendPlan, {
      panelId: 'logs-trend',
      state: 'ready',
      primaryUrl: logTrendPlan.primaryUrl,
      data: { hourlyStats: { '10:00': 2, '11:00': 8 } }
    })).toEqual(expect.objectContaining({
      mode: 'bars',
      kind: 'time-series',
      bars: [
        expect.objectContaining({ label: '10:00', value: 2, heightPct: 25 }),
        expect.objectContaining({ label: '11:00', value: 8, heightPct: 100 })
      ]
    }));
    expect(buildSignalDashboardPanelRuntimePreview(metricsPlan, {
      panelId: 'metrics-cpu',
      state: 'ready',
      primaryUrl: metricsPlan.primaryUrl,
      data: {
        results: {
          frames: [
            { schema: { labels: { __name__: 'cpu.usage' } }, data: [[1, 0.2], [2, 0.5]] }
          ]
        }
      }
    })).toEqual(expect.objectContaining({
      mode: 'bars',
      kind: 'metrics-console',
      bars: [
        expect.objectContaining({ label: 'cpu.usage', value: 0.5, heightPct: 100 })
      ]
    }));
  });

  it('builds state previews for loading or failed runtime data', () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'metrics-cpu', signal: 'metrics', title: 'CPU', visualization: 'graph', route: '/ingestion/otlp/metrics?query=cpu' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimePreview(plan, undefined)).toEqual(expect.objectContaining({
      mode: 'state',
      kind: 'loading',
      rows: [expect.objectContaining({ title: 'loading', copy: 'loading' })]
    }));
    expect(buildSignalDashboardPanelRuntimePreview(plan, {
      panelId: 'metrics-cpu',
      state: 'error',
      primaryUrl: plan.primaryUrl,
      errorMessage: 'backend offline'
    })).toEqual(expect.objectContaining({
      mode: 'state',
      kind: 'error',
      rows: [expect.objectContaining({ title: 'error', copy: 'backend offline' })]
    }));
  });

  it('selects concrete dashboard panel runtime renderers from live response shapes', () => {
    const [logsPlan, tracesPlan, logTrendPlan, traceOverviewPlan, metricsPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces,metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'table', route: '/log/manage?search=timeout' },
        { id: 'traces-errors', signal: 'traces', title: 'Trace errors', visualization: 'table', route: '/trace/manage?serviceName=checkout&view=table' },
        { id: 'logs-trend', signal: 'logs', title: 'Log trend', visualization: 'time-series', route: '/log/manage?view=time-series' },
        { id: 'traces-overview', signal: 'traces', title: 'Trace overview', visualization: 'time-series', route: '/trace/manage?serviceName=checkout&view=time-series' },
        { id: 'metrics-cpu', signal: 'metrics', title: 'CPU', visualization: 'graph', route: '/ingestion/otlp/metrics?query=cpu' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(logsPlan, {
      panelId: 'logs-errors',
      state: 'ready',
      primaryUrl: logsPlan.primaryUrl,
      data: { content: [{ body: 'timeout' }], totalElements: 1 }
    })).toEqual(expect.objectContaining({
      renderer: 'logs-table',
      kind: 'page',
      mode: 'rows',
      itemCount: 1
    }));
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(tracesPlan, {
      panelId: 'traces-errors',
      state: 'ready',
      primaryUrl: tracesPlan.primaryUrl,
      data: { content: [{ traceId: 'trace-1' }], totalElements: 1 }
    })).toEqual(expect.objectContaining({
      renderer: 'trace-table',
      kind: 'page',
      mode: 'rows'
    }));
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(logTrendPlan, {
      panelId: 'logs-trend',
      state: 'ready',
      primaryUrl: logTrendPlan.primaryUrl,
      data: { hourlyStats: { '10:00': 2, '11:00': 8 } }
    })).toEqual(expect.objectContaining({
      renderer: 'log-trend-chart',
      kind: 'time-series',
      mode: 'bars',
      sampleCount: 2
    }));
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(traceOverviewPlan, {
      panelId: 'traces-overview',
      state: 'ready',
      primaryUrl: traceOverviewPlan.primaryUrl,
      data: { totalTraceCount: 9, errorTraceCount: 1 }
    })).toEqual(expect.objectContaining({
      renderer: 'trace-overview',
      kind: 'overview',
      mode: 'rows',
      totalCount: 9
    }));
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(metricsPlan, {
      panelId: 'metrics-cpu',
      state: 'ready',
      primaryUrl: metricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: { frames: [{ schema: { labels: { __name__: 'cpu' } }, data: [[1, 0.5]] }] }
      }
    })).toEqual(expect.objectContaining({
      renderer: 'metrics-chart',
      kind: 'metrics-console',
      mode: 'bars',
      seriesCount: 1,
      metricsChart: expect.objectContaining({
        seriesCount: 1,
        sampleCount: 1
      })
    }));
  });

  it('extracts metrics chart axes, series, and tooltip rows from console frames', () => {
    const [metricsPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'metrics-runtime', signal: 'metrics', title: 'Runtime', visualization: 'graph', route: '/ingestion/otlp/metrics?query=runtime' }
      ])
    });

    const descriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(metricsPlan, {
      panelId: 'metrics-runtime',
      state: 'ready',
      primaryUrl: metricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 2, nonEmptySeries: 2, latestObservedAt: 2000 },
        results: {
          frames: [
            {
              schema: { labels: { __name__: 'cpu.usage', 'service.name': 'checkout' } },
              data: [[1000, 0.2], [2000, 0.5]]
            },
            {
              schema: { labels: { __name__: 'memory.usage', 'service.name': 'checkout' } },
              data: [[1000, 20], [2000, 30]]
            }
          ]
        }
      }
    });

    expect(descriptor.metricsChart).toEqual(expect.objectContaining({
      xMin: 1000,
      xMax: 2000,
      yMin: 0.2,
      yMax: 30,
      xMinLabel: '1000',
      xMaxLabel: '2000',
      yMinLabel: '0.2',
      yMaxLabel: '30',
      seriesCount: 2,
      sampleCount: 4
    }));
    expect(descriptor.metricsChart?.series).toEqual([
      expect.objectContaining({
        label: 'cpu.usage',
        labels: expect.objectContaining({ 'service.name': 'checkout' }),
        sampleCount: 2,
        latestTimestamp: 2000,
        latestValue: 0.5,
        minValue: 0.2,
        maxValue: 0.5,
        pathD: 'M 0 100 L 100 98.99',
        points: [
          expect.objectContaining({ timestamp: 1000, value: 0.2, xPct: 0, yPct: 0 }),
          expect.objectContaining({ timestamp: 2000, value: 0.5, xPct: 100 })
        ]
      }),
      expect.objectContaining({
        label: 'memory.usage',
        sampleCount: 2,
        latestTimestamp: 2000,
        latestValue: 30,
        minValue: 20,
        maxValue: 30,
        pathD: 'M 0 33.56 L 100 0',
        points: [
          expect.objectContaining({ timestamp: 1000, value: 20, xPct: 0 }),
          expect.objectContaining({ timestamp: 2000, value: 30, xPct: 100, yPct: 100 })
        ]
      })
    ]);
    expect(descriptor.metricsChart?.tooltipRows).toEqual([
      expect.objectContaining({ title: 'cpu.usage', copy: '0.5', meta: '2000' }),
      expect.objectContaining({ title: 'memory.usage', copy: '30', meta: '2000' })
    ]);
  });

  it('builds a synchronized dashboard tooltip from metrics, table, and trace rows', () => {
    const [logsPlan, tracePlan, metricsPlan, dbMetricsPlan, externalMetricsPlan, operationMetricsPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'sync',
      title: 'Sync dashboard',
      description: 'Runtime sync',
      tags: 'logs,traces,metrics',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-panel', signal: 'logs', title: 'Logs', visualization: 'table', route: '/log/manage?view=table' },
        { id: 'trace-panel', signal: 'traces', title: 'Trace', visualization: 'table', route: '/trace/manage?view=table' },
        { id: 'metrics-panel', signal: 'metrics', title: 'Metrics', visualization: 'time-series', route: '/ingestion/otlp/metrics?query=cpu' },
        { id: 'db-metrics-panel', signal: 'metrics', title: 'DB Metrics', visualization: 'time-series', route: '/ingestion/otlp/metrics?query=signoz_db_latency_count&serviceName=checkout&groupBy=db.system' },
        { id: 'external-metrics-panel', signal: 'metrics', title: 'External Metrics', visualization: 'time-series', route: '/ingestion/otlp/metrics?query=signoz_external_call_latency_count&serviceName=checkout&groupBy=external.service.address' },
        { id: 'operation-metrics-panel', signal: 'metrics', title: 'Service key operations', visualization: 'time-series', route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&groupBy=operation' }
      ])
    });
    const logsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(logsPlan, {
      panelId: 'logs-panel',
      state: 'ready',
      primaryUrl: logsPlan.primaryUrl,
      data: {
        content: [{
          timeUnixNano: '2000',
          severityText: 'ERROR',
          body: 'checkout timeout',
          traceId: 'trace-1',
          spanId: 'span-log',
          resource: {
            'service.name': 'checkout',
            'service.namespace': 'payments',
            'deployment.environment.name': 'prod',
            'hertzbeat.entity_id': '4200',
            'hertzbeat.entity_type': 'service',
            'hertzbeat.entity_name': 'Checkout API',
            'hertzbeat.source': 'otlp',
            'hertzbeat.collector': 'collector-a',
            'hertzbeat.template': 'spring-boot'
          }
        }]
      }
    });
    const traceDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(tracePlan, {
      panelId: 'trace-panel',
      state: 'ready',
      primaryUrl: tracePlan.primaryUrl,
      data: {
        content: [{
          traceId: 'trace-1',
          rootSpanId: 'span-root',
          serviceName: 'checkout',
          resourceAttributes: {
            'service.name': 'checkout',
            'service.namespace': 'payments',
            'deployment.environment.name': 'prod',
            'hertzbeat.entity_id': '4200',
            'hertzbeat.entity_type': 'service',
            'hertzbeat.entity_name': 'Checkout API',
            'hertzbeat.source': 'otlp',
            'hertzbeat.collector': 'collector-a',
            'hertzbeat.template': 'spring-boot'
          },
          rootSpanName: 'POST /checkout',
          startTime: '2000',
          durationNanos: 4000000
        }]
      }
    });
    const metricsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(metricsPlan, {
      panelId: 'metrics-panel',
      state: 'ready',
      primaryUrl: metricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: {
          frames: [{
            schema: { labels: { __name__: 'cpu.usage' } },
            data: [[1000, 0.2], [2000, 0.5]]
          }]
        }
      }
    });
    const dbMetricsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(dbMetricsPlan, {
      panelId: 'db-metrics-panel',
      state: 'ready',
      primaryUrl: dbMetricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: {
          frames: [{
            schema: {
              labels: {
                __name__: 'signoz_db_latency_count',
                'service.name': 'checkout',
                'service.namespace': 'payments',
                'deployment.environment.name': 'prod',
                'hertzbeat.entity_id': '4200',
                'hertzbeat.entity_type': 'service',
                'hertzbeat.entity_name': 'Checkout API',
                'hertzbeat.source': 'otlp',
                'hertzbeat.collector': 'collector-a',
                'hertzbeat.template': 'spring-boot',
                'db.system': 'postgresql'
              }
            },
            data: [[1000, 4], [2000, 7]]
          }]
        }
      }
    });
    const externalMetricsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(externalMetricsPlan, {
      panelId: 'external-metrics-panel',
      state: 'ready',
      primaryUrl: externalMetricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: {
          frames: [{
            schema: { labels: { __name__: 'signoz_external_call_latency_count', 'service.name': 'checkout', 'service.namespace': 'payments', 'external.service.address': 'payments.internal' } },
            data: [[1000, 2], [2000, 6]]
          }]
        }
      }
    });
    const operationMetricsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(operationMetricsPlan, {
      panelId: 'operation-metrics-panel',
      state: 'ready',
      primaryUrl: operationMetricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: {
          frames: [{
            schema: { labels: { __name__: 'http.server.duration', 'service.name': 'checkout', 'service.namespace': 'payments', operation: 'POST /checkout' } },
            data: [[1000, 180], [2000, 240]]
          }]
        }
      }
    });

    const syncTooltip = buildSignalDashboardRuntimeSyncTooltip([
      logsDescriptor,
      traceDescriptor,
      metricsDescriptor,
      dbMetricsDescriptor,
      externalMetricsDescriptor,
      operationMetricsDescriptor
    ], '2000', { timeRange: { start: '1000', end: '3000' }, returnTo: '/dashboard?start=1000&end=3000' });
    expect(syncTooltip).toEqual({
      timestamp: '2000',
      state: 'active',
      rowCount: 7,
      rows: [
        expect.objectContaining({
          panelId: 'logs-panel',
          signal: 'logs',
          source: 'table-row',
          label: 'checkout',
          value: 'checkout timeout',
          traceId: 'trace-1',
          spanId: 'span-log',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          breakoutAttributes: expect.arrayContaining([
            expect.objectContaining({ name: 'resource:service.name', value: 'checkout' }),
            expect.objectContaining({ name: 'resource:service.namespace', value: 'payments' }),
            expect.objectContaining({ name: 'resource:deployment.environment.name', value: 'prod' }),
            expect.objectContaining({ name: 'resource:hertzbeat.entity_name', value: 'Checkout API' }),
            expect.objectContaining({ name: 'resource:hertzbeat.source', value: 'otlp' })
          ]),
          relatedSignal: 'traces',
          relatedHandoffHref: '/trace/manage?traceId=trace-1&view=trace&spanId=span-log&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        }),
        expect.objectContaining({
          panelId: 'trace-panel',
          signal: 'traces',
          source: 'table-row',
          label: 'checkout',
          value: 'span-root',
          traceId: 'trace-1',
          spanId: 'span-root',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          breakoutAttributes: expect.arrayContaining([
            expect.objectContaining({ name: 'resource:service.name', value: 'checkout' }),
            expect.objectContaining({ name: 'resource:service.namespace', value: 'payments' }),
            expect.objectContaining({ name: 'resource:deployment.environment.name', value: 'prod' }),
            expect.objectContaining({ name: 'resource:hertzbeat.entity_name', value: 'Checkout API' }),
            expect.objectContaining({ name: 'resource:hertzbeat.source', value: 'otlp' })
          ]),
          relatedSignal: 'logs',
          relatedHandoffHref: '/log/manage?traceId=trace-1&view=list&spanId=span-root&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        }),
        expect.objectContaining({
          panelId: 'trace-panel',
          signal: 'traces',
          source: 'trace-waterfall-row',
          label: 'checkout',
          value: 'POST /checkout',
          traceId: 'trace-1',
          spanId: 'span-root',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          breakoutAttributes: expect.arrayContaining([
            expect.objectContaining({ name: 'resource:service.name', value: 'checkout' }),
            expect.objectContaining({ name: 'resource:service.namespace', value: 'payments' }),
            expect.objectContaining({ name: 'resource:deployment.environment.name', value: 'prod' }),
            expect.objectContaining({ name: 'resource:hertzbeat.entity_name', value: 'Checkout API' }),
            expect.objectContaining({ name: 'resource:hertzbeat.source', value: 'otlp' })
          ]),
          relatedSignal: 'logs',
          relatedHandoffHref: '/log/manage?traceId=trace-1&view=list&spanId=span-root&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        }),
        expect.objectContaining({ panelId: 'metrics-panel', signal: 'metrics', source: 'metrics-point', label: 'cpu.usage', value: '0.5' }),
        expect.objectContaining({
          panelId: 'db-metrics-panel',
          signal: 'metrics',
          source: 'metrics-point',
          label: 'signoz_db_latency_count',
          value: '7',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          resourceFilter: 'db.system=postgresql',
          relatedSignal: 'traces',
          relatedHandoffHref: '/trace/manage?view=list&spanScope=all&serviceName=checkout&serviceNamespace=payments&resourceFilter=db.system%3Dpostgresql&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        }),
        expect.objectContaining({
          panelId: 'external-metrics-panel',
          signal: 'metrics',
          source: 'metrics-point',
          label: 'signoz_external_call_latency_count',
          value: '6',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          resourceFilter: 'external.service.address=payments.internal',
          relatedSignal: 'traces',
          relatedHandoffHref: '/trace/manage?view=list&spanScope=all&serviceName=checkout&serviceNamespace=payments&resourceFilter=external.service.address%3Dpayments.internal&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        }),
        expect.objectContaining({
          panelId: 'operation-metrics-panel',
          signal: 'metrics',
          source: 'metrics-point',
          label: 'http.server.duration',
          value: '240',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          operationName: 'POST /checkout',
          relatedSignal: 'traces',
          relatedHandoffHref: '/trace/manage?view=list&spanScope=all&serviceName=checkout&serviceNamespace=payments&operationName=POST+%2Fcheckout&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
        })
      ]
    });
    expect(buildSignalDashboardRuntimeEvidenceFilters([
      { name: 'service.name', type: 'query', value: '' },
      { name: 'service.namespace', type: 'query', value: '' },
      { name: 'deployment.environment.name', type: 'query', value: '' },
      { name: 'hertzbeat.entity_id', type: 'textbox', value: '' },
      { name: 'hertzbeat.entity_type', type: 'dynamic', value: '' },
      { name: 'hertzbeat.entity_name', type: 'query', value: '' },
      { name: 'hertzbeat.source', type: 'dynamic', value: '' },
      { name: 'hertzbeat.collector', type: 'dynamic', value: '' },
      { name: 'hertzbeat.template', type: 'dynamic', value: '' },
      { name: 'traceId', type: 'textbox', value: '' },
      { name: 'spanId', type: 'textbox', value: '' }
    ], syncTooltip.rows[0])).toEqual([
      expect.objectContaining({ variableName: 'service.name', value: 'checkout', source: 'service' }),
      expect.objectContaining({ variableName: 'service.namespace', value: 'payments', source: 'serviceNamespace' }),
      expect.objectContaining({ variableName: 'deployment.environment.name', value: 'prod', source: 'environment' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_id', value: '4200', source: 'entityId' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_type', value: 'service', source: 'entityType' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_name', value: 'Checkout API', source: 'entityName' }),
      expect.objectContaining({ variableName: 'hertzbeat.source', value: 'otlp', source: 'signalSource' }),
      expect.objectContaining({ variableName: 'hertzbeat.collector', value: 'collector-a', source: 'collector' }),
      expect.objectContaining({ variableName: 'hertzbeat.template', value: 'spring-boot', source: 'template' }),
      expect.objectContaining({ variableName: 'traceId', value: 'trace-1', source: 'traceId' }),
      expect.objectContaining({ variableName: 'spanId', value: 'span-log', source: 'spanId' })
    ]);
    expect(buildSignalDashboardRuntimeEvidenceFilters([
      { name: 'unrelated', type: 'textbox', value: '' }
    ], syncTooltip.rows[0])).toEqual([]);
    expect(buildSignalDashboardRuntimeEvidenceFilters([
      { name: 'service.name', type: 'query', value: '' }
    ], syncTooltip.rows[3])).toEqual([]);
    expect(buildSignalDashboardRuntimeEvidenceFilters([
      { name: 'service.name', type: 'query', value: '' },
      { name: 'service.namespace', type: 'query', value: '' },
      { name: 'deployment.environment.name', type: 'query', value: '' },
      { name: 'hertzbeat.entity_id', type: 'textbox', value: '' },
      { name: 'hertzbeat.entity_type', type: 'dynamic', value: '' },
      { name: 'hertzbeat.entity_name', type: 'query', value: '' },
      { name: 'hertzbeat.source', type: 'dynamic', value: '' },
      { name: 'hertzbeat.collector', type: 'dynamic', value: '' },
      { name: 'hertzbeat.template', type: 'dynamic', value: '' }
    ], syncTooltip.rows[4])).toEqual([
      expect.objectContaining({ variableName: 'service.name', value: 'checkout', source: 'service' }),
      expect.objectContaining({ variableName: 'service.namespace', value: 'payments', source: 'serviceNamespace' }),
      expect.objectContaining({ variableName: 'deployment.environment.name', value: 'prod', source: 'environment' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_id', value: '4200', source: 'entityId' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_type', value: 'service', source: 'entityType' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_name', value: 'Checkout API', source: 'entityName' }),
      expect.objectContaining({ variableName: 'hertzbeat.source', value: 'otlp', source: 'signalSource' }),
      expect.objectContaining({ variableName: 'hertzbeat.collector', value: 'collector-a', source: 'collector' }),
      expect.objectContaining({ variableName: 'hertzbeat.template', value: 'spring-boot', source: 'template' })
    ]);
    expect(buildSignalDashboardRuntimeEvidenceFilterSuggestions([], syncTooltip.rows[0])).toEqual([
      expect.objectContaining({ variableName: 'service.name', value: 'checkout', source: 'service', variableType: 'query' }),
      expect.objectContaining({ variableName: 'service.namespace', value: 'payments', source: 'serviceNamespace', variableType: 'query' }),
      expect.objectContaining({ variableName: 'deployment.environment.name', value: 'prod', source: 'environment', variableType: 'query' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_id', value: '4200', source: 'entityId', variableType: 'textbox' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_type', value: 'service', source: 'entityType', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_name', value: 'Checkout API', source: 'entityName', variableType: 'query' }),
      expect.objectContaining({ variableName: 'hertzbeat.source', value: 'otlp', source: 'signalSource', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.collector', value: 'collector-a', source: 'collector', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.template', value: 'spring-boot', source: 'template', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'traceId', value: 'trace-1', source: 'traceId', variableType: 'textbox' }),
      expect.objectContaining({ variableName: 'spanId', value: 'span-log', source: 'spanId', variableType: 'textbox' })
    ]);
    expect(buildSignalDashboardRuntimeEvidenceFilterSuggestions([
      { name: 'service.name', type: 'query', value: '' },
      { name: 'service.namespace', type: 'query', value: '' },
      { name: 'deployment.environment.name', type: 'query', value: '' },
      { name: 'hertzbeat.entity_id', type: 'textbox', value: '' },
      { name: 'hertzbeat.entity_type', type: 'dynamic', value: '' },
      { name: 'hertzbeat.entity_name', type: 'query', value: '' },
      { name: 'hertzbeat.source', type: 'dynamic', value: '' },
      { name: 'hertzbeat.collector', type: 'dynamic', value: '' },
      { name: 'hertzbeat.template', type: 'dynamic', value: '' },
      { name: 'traceId', type: 'textbox', value: '' },
      { name: 'spanId', type: 'textbox', value: '' }
    ], syncTooltip.rows[0])).toEqual([]);
    expect(buildSignalDashboardRuntimeEvidenceFilterSuggestions([], syncTooltip.rows[3])).toEqual([]);
    expect(buildSignalDashboardRuntimeEvidenceFilterSuggestions([], syncTooltip.rows[4])).toEqual([
      expect.objectContaining({ variableName: 'service.name', value: 'checkout', source: 'service', variableType: 'query' }),
      expect.objectContaining({ variableName: 'service.namespace', value: 'payments', source: 'serviceNamespace', variableType: 'query' }),
      expect.objectContaining({ variableName: 'deployment.environment.name', value: 'prod', source: 'environment', variableType: 'query' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_id', value: '4200', source: 'entityId', variableType: 'textbox' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_type', value: 'service', source: 'entityType', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.entity_name', value: 'Checkout API', source: 'entityName', variableType: 'query' }),
      expect.objectContaining({ variableName: 'hertzbeat.source', value: 'otlp', source: 'signalSource', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.collector', value: 'collector-a', source: 'collector', variableType: 'dynamic' }),
      expect.objectContaining({ variableName: 'hertzbeat.template', value: 'spring-boot', source: 'template', variableType: 'dynamic' })
    ]);
    expect(syncTooltip.rows[4].breakoutAttributes).toEqual([
      expect.objectContaining({ name: 'service.name', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', value: 'payments' }),
      expect.objectContaining({ name: 'deployment.environment.name', value: 'prod' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', value: '4200' }),
      expect.objectContaining({ name: 'hertzbeat.entity_type', value: 'service' }),
      expect.objectContaining({ name: 'hertzbeat.entity_name', value: 'Checkout API' }),
      expect.objectContaining({ name: 'hertzbeat.source', value: 'otlp' }),
      expect.objectContaining({ name: 'hertzbeat.collector', value: 'collector-a' }),
      expect.objectContaining({ name: 'hertzbeat.template', value: 'spring-boot' }),
      expect.objectContaining({ name: 'db.system', value: 'postgresql' })
    ]);
    expect(syncTooltip.rows[5]).toEqual(expect.objectContaining({
      resourceFilter: 'external.service.address=payments.internal',
      relatedHandoffHref: '/trace/manage?view=list&spanScope=all&serviceName=checkout&serviceNamespace=payments&resourceFilter=external.service.address%3Dpayments.internal&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000',
      breakoutAttributes: [
        expect.objectContaining({ name: 'service.name', value: 'checkout' }),
        expect.objectContaining({ name: 'service.namespace', value: 'payments' }),
        expect.objectContaining({ name: 'external.service.address', value: 'payments.internal' })
      ]
    }));
    expect(syncTooltip.rows[6]).toEqual(expect.objectContaining({
      operationName: 'POST /checkout',
      breakoutAttributes: expect.arrayContaining([
        expect.objectContaining({ name: 'service.name', value: 'checkout' }),
        expect.objectContaining({ name: 'service.namespace', value: 'payments' }),
        expect.objectContaining({ name: 'deployment.environment.name', value: 'prod' }),
        expect.objectContaining({ name: 'hertzbeat.entity_id', value: '4200' }),
        expect.objectContaining({ name: 'hertzbeat.entity_type', value: 'service' }),
        expect.objectContaining({ name: 'hertzbeat.entity_name', value: 'Checkout API' }),
        expect.objectContaining({ name: 'hertzbeat.source', value: 'otlp' }),
        expect.objectContaining({ name: 'hertzbeat.collector', value: 'collector-a' }),
        expect.objectContaining({ name: 'hertzbeat.template', value: 'spring-boot' }),
        expect.objectContaining({ name: 'operation', value: 'POST /checkout' })
      ])
    }));
    expect(buildSignalDashboardRuntimeEvidenceSourceHandoff('/log/manage?view=table', syncTooltip.rows[0], {
      timeRange: { start: '1000', end: '3000' },
      returnTo: '/dashboard?start=1000&end=3000'
    })).toBe('/log/manage?view=table&traceId=trace-1&spanId=span-log&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000');
    expect(buildSignalDashboardRuntimeEvidenceSourceHandoff('/trace/manage?view=list', syncTooltip.rows[4], {
      timeRange: { start: '1000', end: '3000' },
      returnTo: '/dashboard?start=1000&end=3000'
    })).toBe('/trace/manage?view=list&serviceName=checkout&serviceNamespace=payments&resourceFilter=db.system%3Dpostgresql&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000');
    expect(buildSignalDashboardRuntimeEvidenceSourceHandoff('/trace/manage?serviceName=payments', syncTooltip.rows[2], {
      timeRange: { start: '1000', end: '3000' },
      returnTo: '/dashboard?start=1000&end=3000'
    })).toBe('/trace/manage?serviceName=payments&traceId=trace-1&spanId=span-root&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000');
    expect(buildSignalDashboardRuntimeEvidenceSourceHandoff('/trace/manage?view=list', syncTooltip.rows[6], {
      timeRange: { start: '1000', end: '3000' },
      returnTo: '/dashboard?start=1000&end=3000'
    })).toBe('/trace/manage?view=list&serviceName=checkout&serviceNamespace=payments&operationName=POST+%2Fcheckout&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000');
    expect(buildSignalDashboardRuntimeEvidenceSourceHandoff('/ingestion/otlp/metrics?query=cpu.usage', syncTooltip.rows[3], {
      timeRange: { start: '1000', end: '3000' },
      returnTo: '/dashboard?start=1000&end=3000'
    })).toBe('/ingestion/otlp/metrics?query=cpu.usage&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000');
    expect(buildSignalDashboardRuntimeSyncTooltip([metricsDescriptor], '')).toEqual({
      timestamp: '',
      state: 'idle',
      rowCount: 0,
      rows: []
    });
    expect(buildSignalDashboardRuntimeSyncCrosshair([
      logsDescriptor,
      traceDescriptor,
      metricsDescriptor
    ], '2000')).toEqual({
      timestamp: '2000',
      state: 'active',
      panelCount: 1,
      pointCount: 1,
      panels: [
        expect.objectContaining({
          panelId: 'metrics-panel',
          signal: 'metrics',
          xPct: 100,
          pointCount: 1
        })
      ]
    });
    expect(buildSignalDashboardRuntimeSyncCrosshair([metricsDescriptor], '3000')).toEqual({
      timestamp: '3000',
      state: 'idle',
      panelCount: 0,
      pointCount: 0,
      panels: []
    });
    expect(buildSignalDashboardRuntimeSyncCrosshair([metricsDescriptor], '')).toEqual({
      timestamp: '',
      state: 'idle',
      panelCount: 0,
      pointCount: 0,
      panels: []
    });
    expect(buildSignalDashboardRuntimeMetricsTooltip(metricsDescriptor.metricsChart, '2000')).toEqual({
      timestamp: '2000',
      state: 'sync',
      rowCount: 1,
      rows: [
        expect.objectContaining({
          title: 'cpu.usage',
          copy: '0.5',
          meta: '2000'
        })
      ]
    });
    expect(buildSignalDashboardRuntimeMetricsTooltip(metricsDescriptor.metricsChart, '3000')).toEqual({
      timestamp: '',
      state: 'latest',
      rowCount: 1,
      rows: [
        expect.objectContaining({
          title: 'cpu.usage',
          copy: '0.5',
          meta: '2000'
        })
      ]
    });
    expect(buildSignalDashboardRuntimeMetricsTooltip(null, '2000')).toEqual({
      timestamp: '',
      state: 'latest',
      rowCount: 0,
      rows: []
    });
  });

  it('keeps failed or unsupported dashboard panel runtime renderers explicit', () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'bad',
      title: 'Bad',
      description: '',
      tags: '',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'profiles', signal: 'profiles', title: 'Profiles', visualization: 'table', route: '/profiles' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(plan, undefined)).toEqual(expect.objectContaining({
      renderer: 'state-panel',
      state: 'loading',
      kind: 'loading',
      mode: 'state'
    }));
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(plan, {
      panelId: 'profiles',
      state: 'unsupported',
      errorMessage: 'unsupported-signal'
    })).toEqual(expect.objectContaining({
      renderer: 'state-panel',
      state: 'unsupported',
      kind: 'unsupported',
      mode: 'state'
    }));
  });

  it('builds RPC metric point handoffs with service and method operation context', () => {
    const [rpcMetricsPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'rpc-sync',
      title: 'RPC sync dashboard',
      description: 'Runtime sync',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'rpc-metrics-panel',
          signal: 'metrics',
          title: 'RPC latency',
          visualization: 'time-series',
          route: '/ingestion/otlp/metrics?query=rpc.server.duration&serviceName=checkout&groupBy=rpc.service,rpc.method'
        }
      ])
    });
    const rpcMetricsDescriptor = buildSignalDashboardPanelRuntimeRenderDescriptor(rpcMetricsPlan, {
      panelId: 'rpc-metrics-panel',
      state: 'ready',
      primaryUrl: rpcMetricsPlan.primaryUrl,
      data: {
        stats: { totalSeries: 1, nonEmptySeries: 1 },
        results: {
          frames: [{
            schema: {
              labels: {
                __name__: 'rpc.server.duration',
                'service.name': 'checkout',
                'service.namespace': 'payments',
                'rpc.service': 'payments.CheckoutService',
                'rpc.method': 'Authorize'
              }
            },
            data: [[1000, 32], [2000, 45]]
          }]
        }
      }
    });

    const syncTooltip = buildSignalDashboardRuntimeSyncTooltip(
      [rpcMetricsDescriptor],
      '2000',
      { timeRange: { start: '1000', end: '3000' }, returnTo: '/dashboard?start=1000&end=3000' }
    );

    expect(syncTooltip.rows[0]).toEqual(expect.objectContaining({
      panelId: 'rpc-metrics-panel',
      signal: 'metrics',
      source: 'metrics-point',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      operationName: 'payments.CheckoutService/Authorize',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?view=list&spanScope=all&serviceName=checkout&serviceNamespace=payments&operationName=payments.CheckoutService%2FAuthorize&returnTo=%2Fdashboard%3Fstart%3D1000%26end%3D3000&start=1000&end=3000'
    }));
  });

  it('creates panel drafts from runtime evidence rows with source context', () => {
    const draft = createSignalDashboardPanelDraftFromRuntimeEvidence({
      row: {
        key: 'logs-panel:trace-1:span-log',
        panelId: 'logs-panel',
        signal: 'logs',
        source: 'table-row',
        label: 'checkout',
        value: 'checkout timeout',
        meta: 'ERROR',
        traceId: 'trace-1',
        spanId: 'span-log',
        relatedSignal: 'traces'
      },
      route: '/log/manage?view=table&traceId=trace-1&spanId=span-log&serviceName=checkout&start=1000&end=3000',
      titlePrefix: 'Evidence panel'
    });

    expect(draft).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'Evidence panel: checkout',
      description: 'table-row · checkout timeout · ERROR',
      visualization: 'table',
      route: '/log/manage?view=table&traceId=trace-1&spanId=span-log&serviceName=checkout&start=1000&end=3000',
      querySnapshot: '/log/manage?view=table&traceId=trace-1&spanId=span-log&serviceName=checkout&start=1000&end=3000'
    }));
    expect(JSON.parse(String(draft?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-evidence',
      sourcePanelId: 'logs-panel',
      evidenceRowKey: 'logs-panel:trace-1:span-log',
      evidenceSource: 'table-row',
      evidenceLabel: 'checkout',
      evidenceValue: 'checkout timeout',
      traceId: 'trace-1',
      spanId: 'span-log',
      relatedSignal: 'traces'
    }));
    expect(createSignalDashboardPanelDraftFromRuntimeEvidence({
      row: {
        key: 'unsupported',
        panelId: 'panel',
        signal: 'unknown',
        source: 'metrics-point',
        label: 'cpu',
        value: '1'
      },
      route: '/unknown',
      titlePrefix: 'Evidence panel'
    })).toBeNull();
    const metricsDraft = createSignalDashboardPanelDraftFromRuntimeEvidence({
      row: {
        key: 'metrics-panel:series:point:sync',
        panelId: 'metrics-panel',
        signal: 'metrics',
        source: 'metrics-point',
        label: 'series-1',
        value: '120',
        meta: '1713200000000'
      },
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
      titlePrefix: 'Evidence panel'
    });
    expect(metricsDraft).toEqual(expect.objectContaining({
      title: 'Evidence panel: http.server.duration',
      visualization: 'graph'
    }));
    expect(JSON.parse(String(metricsDraft?.payload))).toEqual(expect.objectContaining({
      evidenceLabel: 'http.server.duration',
      evidenceSeriesLabel: 'series-1'
    }));
  });

  it('creates metrics breakout panel drafts from runtime metric label evidence', () => {
    const draft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row: {
        key: 'metrics-panel:point:2000',
        panelId: 'metrics-panel',
        signal: 'metrics',
        source: 'metrics-point',
        label: 'signoz_db_latency_count',
        value: '7',
        meta: '2000'
      },
      route: '/ingestion/otlp/metrics?query=signoz_db_latency_count&serviceName=checkout&series=postgresql&inspector=graph&start=1000&end=3000',
      attribute: {
        key: 'db.system:postgresql',
        name: 'db.system',
        value: 'postgresql'
      },
      titlePrefix: 'Breakout panel'
    });

    expect(draft).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Breakout panel: db.system',
      description: 'breakout by db.system · postgresql',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=signoz_db_latency_count&serviceName=checkout&inspector=graph&start=1000&end=3000&groupBy=db.system&groupLimit=8',
      querySnapshot: '/ingestion/otlp/metrics?query=signoz_db_latency_count&serviceName=checkout&inspector=graph&start=1000&end=3000&groupBy=db.system&groupLimit=8'
    }));
    expect(JSON.parse(String(draft?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'metrics-panel',
      evidenceRowKey: 'metrics-panel:point:2000',
      evidenceSource: 'metrics-point',
      evidenceLabel: 'signoz_db_latency_count',
      evidenceValue: '7',
      breakoutAttribute: 'db.system',
      breakoutAttributeValue: 'postgresql'
    }));
    const logDraft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row: {
        key: 'logs-row',
        panelId: 'logs-panel',
        signal: 'logs',
        source: 'table-row',
        label: 'checkout',
        value: 'timeout',
        traceId: 'trace-1',
        spanId: 'span-1'
      },
      route: '/log/manage?view=table&traceId=trace-1&spanId=span-1&serviceName=checkout&serviceNamespace=payments&start=1000&end=3000',
      attribute: {
        key: 'service.name:checkout',
        name: 'resource:service.name',
        value: 'checkout'
      },
      titlePrefix: 'Breakout panel'
    });
    expect(logDraft).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'Breakout panel: resource:service.name',
      visualization: 'list',
      route: '/log/manage?view=list&serviceName=checkout&serviceNamespace=payments&start=1000&end=3000&groupBy=resource%3Aservice.name&groupLimit=8'
    }));
    expect(JSON.parse(String(logDraft?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'logs-panel',
      breakoutAttribute: 'resource:service.name',
      breakoutAttributeValue: 'checkout'
    }));
    const traceDraft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row: {
        key: 'trace-row',
        panelId: 'trace-panel',
        signal: 'traces',
        source: 'table-row',
        label: 'checkout',
        value: 'POST /checkout',
        traceId: 'trace-1',
        spanId: 'span-root'
      },
      route: '/trace/manage?view=trace&traceId=trace-1&spanId=span-root&serviceName=checkout&serviceNamespace=payments&spanScope=all&start=1000&end=3000',
      attribute: {
        key: 'resource:service.version:1.2.3',
        name: 'resource:service.version',
        value: '1.2.3'
      },
      titlePrefix: 'Breakout panel'
    });
    expect(traceDraft).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Breakout panel: resource:service.version',
      visualization: 'list',
      route: '/trace/manage?view=list&serviceName=checkout&serviceNamespace=payments&spanScope=all&start=1000&end=3000&groupBy=resource%3Aservice.version&groupLimit=8'
    }));
    expect(JSON.parse(String(traceDraft?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'trace-panel',
      breakoutAttribute: 'resource:service.version',
      breakoutAttributeValue: '1.2.3'
    }));
  });

  it('executes log and trace breakout dashboard panels through group-by APIs', async () => {
    const [logPlan, tracePlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'breakouts',
      title: 'Breakouts',
      description: 'Grouped signal panels',
      tags: 'logs,traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'log-breakout',
          signal: 'logs',
          title: 'Logs by service version',
          visualization: 'list',
          route: '/log/manage?view=list&search=timeout&serviceName=checkout&serviceNamespace=payments&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&groupBy=resource:service.version&groupLimit=8'
        },
        {
          id: 'trace-breakout',
          signal: 'traces',
          title: 'Traces by service version',
          visualization: 'list',
          route: '/trace/manage?view=list&serviceName=checkout&serviceNamespace=payments&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&spanScope=all&groupBy=resource:service.version&groupLimit=8'
        }
      ])
    });

    expect(logPlan).toEqual(expect.objectContaining({
      signal: 'logs',
      primaryUrl: '/logs/stats/group-by?search=timeout&entityId=4200&entityType=service&serviceName=checkout&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8',
      apiUrls: expect.objectContaining({
        groupBy: '/logs/stats/group-by?search=timeout&entityId=4200&entityType=service&serviceName=checkout&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8'
      })
    }));
    expect(tracePlan).toEqual(expect.objectContaining({
      signal: 'traces',
      primaryUrl: '/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8',
      apiUrls: expect.objectContaining({
        groupBy: '/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8'
      })
    }));

    const logResult = await executeSignalDashboardPanelPlan(logPlan, async url => {
      expect(url).toBe('/logs/stats/group-by?search=timeout&entityId=4200&entityType=service&serviceName=checkout&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8');
      return {
        groupBy: 'resource:service.version',
        groups: [{
          value: '1.2.3',
          count: 12
        }]
      };
    });
    const traceResult = await executeSignalDashboardPanelPlan(tracePlan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8');
      return {
        groupBy: 'resource:service.version',
        groups: [{
          value: '1.2.3',
          traceCount: 8,
          errorTraceCount: 2,
          latencyP95Ms: 220
        }]
      };
    });
    const logRenderer = buildSignalDashboardPanelRuntimeRenderDescriptor(logPlan, logResult);
    const traceRenderer = buildSignalDashboardPanelRuntimeRenderDescriptor(tracePlan, traceResult);

    expect(logRenderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      signal: 'logs',
      itemCount: 1,
      rows: [
        expect.objectContaining({
          key: 'log-breakout:group:0',
          title: '1.2.3',
          copy: '12 logs',
          meta: 'resource:service.version',
          relatedSignal: 'logs',
          relatedHandoffHref: '/log/manage?search=timeout&serviceName=checkout&serviceNamespace=payments&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&view=list&resourceFilter=service.version%3D1.2.3'
        })
      ]
    }));
    expect(traceRenderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      signal: 'traces',
      itemCount: 1,
      rows: [
        expect.objectContaining({
          key: 'trace-breakout:group:0',
          title: '1.2.3',
          copy: '8 traces · 2 errors',
          meta: 'resource:service.version · p95 220ms',
          relatedSignal: 'traces',
          relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&entityName=Checkout+API&serviceNamespace=payments&source=otlp&collector=collector-a&template=spring-boot&view=list&resourceFilter=service.version%3D1.2.3'
        })
      ]
    }));
  });

  it('maps log attribute groups to log attribute-filter drilldowns with entity context', async () => {
    const [logPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'log-attribute-breakouts',
      title: 'Log attribute breakouts',
      description: 'Grouped log panels',
      tags: 'logs',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'log-route-breakout',
          signal: 'logs',
          title: 'Logs by route',
          visualization: 'list',
          route: '/log/manage?view=list&serviceName=checkout&serviceNamespace=payments&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&groupBy=attribute:http.route&groupLimit=8'
        }
      ])
    });

    const logResult = await executeSignalDashboardPanelPlan(logPlan, async url => {
      expect(url).toBe('/logs/stats/group-by?entityId=4200&entityType=service&serviceName=checkout&serviceNamespace=payments&groupBy=attribute%3Ahttp.route&limit=8');
      return {
        groupBy: 'attribute:http.route',
        groups: [{
          value: 'POST /checkout',
          count: 9,
          errorCount: 3
        }]
      };
    });
    const logRenderer = buildSignalDashboardPanelRuntimeRenderDescriptor(logPlan, logResult);

    expect(logRenderer.rows[0]).toEqual(expect.objectContaining({
      key: 'log-route-breakout:group:0',
      title: 'POST /checkout',
      copy: '9 logs · 3 errors',
      meta: 'attribute:http.route',
      relatedSignal: 'logs',
      relatedHandoffHref: '/log/manage?serviceName=checkout&serviceNamespace=payments&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&view=list&attributeFilter=http.route%3APOST+%2Fcheckout'
    }));
    expect(logRenderer.rows[0]?.relatedHandoffHref).not.toContain('attributeFilter=http.route%3D');
  });

  it('unwraps backend message envelopes for group-by dashboard panels before rendering', async () => {
    const [logPlan, tracePlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'wrapped-breakouts',
      title: 'Wrapped breakouts',
      description: 'Backend message payloads',
      tags: 'logs,traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'wrapped-log-group',
          signal: 'logs',
          title: 'Logs by service version',
          visualization: 'list',
          route: '/log/manage?view=list&serviceName=checkout&serviceNamespace=payments&groupBy=resource:service.version&groupLimit=8'
        },
        {
          id: 'wrapped-trace-group',
          signal: 'traces',
          title: 'Traces by service version',
          visualization: 'list',
          route: '/trace/manage?view=list&serviceName=checkout&serviceNamespace=payments&spanScope=all&groupBy=resource:service.version&groupLimit=8'
        }
      ])
    });
    const fetchCalls: string[] = [];
    globalThis.fetch = vi.fn(async input => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.includes('/api/logs/stats/group-by')) {
        return new Response(JSON.stringify({
          code: 0,
          msg: 'success',
          data: {
            groupBy: 'resource:service.version',
            groups: [{
              value: '1.2.3',
              count: 14
            }]
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/api/traces/stats/group-by')) {
        return new Response(JSON.stringify({
          code: 0,
          msg: 'success',
          data: {
            groupBy: 'resource:service.version',
            groups: [{
              value: '1.2.3',
              traceCount: 9,
              errorTraceCount: 3,
              latencyP95Ms: 245
            }]
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ code: 404, msg: 'unexpected dashboard request', data: null }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as typeof fetch;

    const logResult = await executeSignalDashboardPanelPlan(logPlan);
    const traceResult = await executeSignalDashboardPanelPlan(tracePlan);
    const logRenderer = buildSignalDashboardPanelRuntimeRenderDescriptor(logPlan, logResult);
    const traceRenderer = buildSignalDashboardPanelRuntimeRenderDescriptor(tracePlan, traceResult);

    expect(fetchCalls).toEqual([
      '/api/logs/stats/group-by?serviceName=checkout&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8',
      '/api/traces/stats/group-by?serviceName=checkout&spanScope=all&serviceNamespace=payments&groupBy=resource%3Aservice.version&limit=8'
    ]);
    expect(logRenderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      totalCount: 14,
      rows: [
        expect.objectContaining({
          title: '1.2.3',
          copy: '14 logs',
          relatedHandoffHref: '/log/manage?serviceName=checkout&serviceNamespace=payments&view=list&resourceFilter=service.version%3D1.2.3'
        })
      ]
    }));
    expect(traceRenderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      totalCount: 9,
      rows: [
        expect.objectContaining({
          title: '1.2.3',
          copy: '9 traces · 3 errors',
          meta: 'resource:service.version · p95 245ms',
          relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&serviceNamespace=payments&view=list&resourceFilter=service.version%3D1.2.3'
        })
      ]
    }));
  });

  it('creates panel drafts from selected dashboard filters', () => {
    const draft = createSignalDashboardPanelDraftFromFilterSelection({
      variable: {
        name: 'service.name',
        type: 'query',
        value: 'checkout'
      },
      signal: 'metrics',
      sourcePanelId: 'variable-metrics',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&serviceNamespace=payments&environment=prod&inspector=graph',
      titlePrefix: 'Filter panel'
    });

    expect(draft).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel: service.name=checkout',
      description: 'service.name=checkout',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&serviceNamespace=payments&environment=prod&inspector=graph'
    }));
    expect(JSON.parse(String(draft?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      sourcePanelId: 'variable-metrics',
      variableName: 'service.name',
      variableValue: 'checkout',
      variableType: 'query',
      templateKey: 'metrics-graph'
    }));
    expect(createSignalDashboardPanelDraftFromFilterSelection({
      variable: {
        name: 'service.name',
        type: 'query',
        value: ''
      },
      signal: 'metrics',
      route: '/ingestion/otlp/metrics?query=cpu',
      titlePrefix: 'Filter panel'
    })).toBeNull();
  });

  it('creates suggested panel draft templates from selected dashboard filters', () => {
    const metricsDrafts = createSignalDashboardPanelDraftsFromFilterSelection({
      variable: {
        name: 'service.name',
        type: 'query',
        value: 'checkout'
      },
      signal: 'metrics',
      sourcePanelId: 'variable-metrics',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot',
      titlePrefix: 'Filter panel'
    });
    expect(metricsDrafts).toHaveLength(18);
    expect(metricsDrafts.every(draft => new URL(draft.route, 'http://hertzbeat.local').searchParams.get('serviceNamespace') === 'payments')).toBe(true);
    expect(metricsDrafts.every(draft => {
      const params = new URL(draft.route, 'http://hertzbeat.local').searchParams;
      return params.get('entityId') === '4200'
        && params.get('entityType') === 'service'
        && params.get('entityName') === 'Checkout API'
        && params.get('collector') === 'collector-a'
        && Boolean(params.get('template'));
    })).toBe(true);
    expect(metricsDrafts.every(draft => {
      if (draft.signal === 'alerts') return true;
      const params = new URL(draft.route, 'http://hertzbeat.local').searchParams;
      return params.get('source') === 'otlp';
    })).toBe(true);
    expect(metricsDrafts.map(draft => draft.title)).toEqual([
      'Filter panel: service.name=checkout',
      'Filter panel table: service.name=checkout',
      'Filter panel latency p95: service.name=checkout',
      'Filter panel request rate: service.name=checkout',
      'Filter panel error rate: service.name=checkout',
      'Filter panel apdex: service.name=checkout',
      'Filter panel db calls rate: service.name=checkout',
      'Filter panel db call duration: service.name=checkout',
      'Filter panel external calls rate: service.name=checkout',
      'Filter panel external call duration: service.name=checkout',
      'Filter panel key operations: service.name=checkout',
      'Filter panel logs: service.name=checkout',
      'Filter panel log errors: service.name=checkout',
      'Filter panel traces: service.name=checkout',
      'Filter panel trace errors: service.name=checkout',
      'Filter panel exceptions: service.name=checkout',
      'Filter panel exception messages: service.name=checkout',
      'Filter panel firing alerts: service.name=checkout'
    ]);
    expect(metricsDrafts.map(draft => `${draft.signal}:${draft.visualization}`)).toEqual([
      'metrics:graph',
      'metrics:table',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'logs:list',
      'logs:table',
      'traces:table',
      'traces:table',
      'traces:list',
      'traces:list',
      'alerts:list'
    ]);
    expect(metricsDrafts[0]?.route).toContain('inspector=graph');
    expect(metricsDrafts[1]?.route).toContain('inspector=table');
    expect(metricsDrafts[2]?.route).toContain('query=http.server.duration');
    expect(metricsDrafts[2]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[2]?.route).toContain('aggregation=p95');
    expect(metricsDrafts[2]?.route).toContain('groupBy=route');
    expect(metricsDrafts[3]?.route).toContain('query=http_server_duration_milliseconds_count');
    expect(metricsDrafts[3]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[3]?.route).toContain('temporalAggregation=rate');
    expect(metricsDrafts[4]?.route).toContain('query=http_server_duration_milliseconds_count');
    expect(metricsDrafts[4]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22+and+status_code%3D%22STATUS_CODE_ERROR%22');
    expect(metricsDrafts[4]?.route).toContain('temporalAggregation=rate');
    expect(metricsDrafts[4]?.route).toContain('groupBy=status_code');
    expect(metricsDrafts[5]?.route).toContain('query=http.server.duration.bucket');
    expect(metricsDrafts[5]?.route).toContain('template=service-apdex');
    expect(metricsDrafts[5]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[5]?.route).toContain('groupBy=service.name');
    expect(metricsDrafts[6]?.route).toContain('query=signoz_db_latency_count');
    expect(metricsDrafts[6]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[6]?.route).toContain('temporalAggregation=rate');
    expect(metricsDrafts[6]?.route).toContain('groupBy=db.system');
    expect(metricsDrafts[7]?.route).toContain('query=signoz_db_latency_sum');
    expect(metricsDrafts[7]?.route).toContain('template=service-db-call-duration');
    expect(metricsDrafts[7]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[7]?.route).toContain('groupBy=db.system');
    expect(metricsDrafts[8]?.route).toContain('query=signoz_external_call_latency_count');
    expect(metricsDrafts[8]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[8]?.route).toContain('temporalAggregation=rate');
    expect(metricsDrafts[8]?.route).toContain('groupBy=external.service.address');
    expect(metricsDrafts[9]?.route).toContain('query=signoz_external_call_latency_sum');
    expect(metricsDrafts[9]?.route).toContain('template=service-external-call-duration');
    expect(metricsDrafts[9]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[9]?.route).toContain('groupBy=external.service.address');
    expect(metricsDrafts[10]?.route).toContain('query=http.server.duration');
    expect(metricsDrafts[10]?.route).toContain('filter=service.name%3D%22checkout%22+and+service.namespace%3D%22payments%22');
    expect(metricsDrafts[10]?.route).toContain('aggregation=p95');
    expect(metricsDrafts[10]?.route).toContain('groupBy=operation');
    expect(metricsDrafts[10]?.route).toContain('limit=10');
    expect(metricsDrafts[11]?.route).toContain('/log/manage?');
    expect(metricsDrafts[11]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[11]?.route).toContain('environment=prod');
    expect(metricsDrafts[11]?.route).toContain('view=list');
    expect(metricsDrafts[12]?.route).toContain('/log/manage?');
    expect(metricsDrafts[12]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[12]?.route).toContain('environment=prod');
    expect(metricsDrafts[12]?.route).toContain('view=table');
    expect(metricsDrafts[12]?.route).toContain('severityText=ERROR');
    expect(metricsDrafts[13]?.route).toContain('/trace/manage?');
    expect(metricsDrafts[13]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[13]?.route).toContain('environment=prod');
    expect(metricsDrafts[13]?.route).toContain('view=table');
    expect(metricsDrafts[14]?.route).toContain('/trace/manage?');
    expect(metricsDrafts[14]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[14]?.route).toContain('environment=prod');
    expect(metricsDrafts[14]?.route).toContain('view=table');
    expect(metricsDrafts[14]?.route).toContain('errorOnly=true');
    expect(metricsDrafts[15]?.route).toContain('/trace/manage?');
    expect(metricsDrafts[15]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[15]?.route).toContain('environment=prod');
    expect(metricsDrafts[15]?.route).toContain('template=service-exceptions');
    expect(metricsDrafts[15]?.route).toContain('errorOnly=true');
    expect(metricsDrafts[15]?.route).toContain('spanScope=all');
    expect(metricsDrafts[15]?.route).toContain('groupBy=exception.type');
    expect(metricsDrafts[16]?.route).toContain('/trace/manage?');
    expect(metricsDrafts[16]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[16]?.route).toContain('environment=prod');
    expect(metricsDrafts[16]?.route).toContain('template=service-exception-messages');
    expect(metricsDrafts[16]?.route).toContain('errorOnly=true');
    expect(metricsDrafts[16]?.route).toContain('spanScope=all');
    expect(metricsDrafts[16]?.route).toContain('groupBy=exception.message');
    expect(metricsDrafts[17]?.route).toContain('/alert?');
    expect(metricsDrafts[17]?.route).toContain('serviceName=checkout');
    expect(metricsDrafts[17]?.route).toContain('environment=prod');
    expect(metricsDrafts[17]?.route).toContain('search=checkout');
    expect(metricsDrafts[17]?.route).toContain('status=firing');
    expect(JSON.parse(String(metricsDrafts[2]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-latency-p95'
    }));
    expect(JSON.parse(String(metricsDrafts[3]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-request-rate'
    }));
    expect(JSON.parse(String(metricsDrafts[4]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-error-rate'
    }));
    expect(JSON.parse(String(metricsDrafts[5]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-apdex'
    }));
    expect(JSON.parse(String(metricsDrafts[6]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-db-call-rate'
    }));
    expect(JSON.parse(String(metricsDrafts[7]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-db-call-duration'
    }));
    expect(JSON.parse(String(metricsDrafts[8]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-external-call-rate'
    }));
    expect(JSON.parse(String(metricsDrafts[9]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-external-call-duration'
    }));
    expect(JSON.parse(String(metricsDrafts[10]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-key-operations'
    }));
    expect(JSON.parse(String(metricsDrafts[1]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-table',
      variableName: 'service.name',
      variableValue: 'checkout'
    }));
    expect(JSON.parse(String(metricsDrafts[11]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'logs-list'
    }));
    expect(JSON.parse(String(metricsDrafts[12]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'logs-errors'
    }));
    expect(JSON.parse(String(metricsDrafts[13]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-table'
    }));
    expect(JSON.parse(String(metricsDrafts[14]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-errors'
    }));
    expect(JSON.parse(String(metricsDrafts[15]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-exceptions'
    }));
    expect(JSON.parse(String(metricsDrafts[16]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-exception-messages'
    }));
    expect(JSON.parse(String(metricsDrafts[17]?.payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'alerts-firing'
    }));

    const logsDrafts = createSignalDashboardPanelDraftsFromFilterSelection({
      variable: {
        name: 'service.name',
        type: 'textbox',
        value: 'checkout'
      },
      signal: 'logs',
      sourcePanelId: 'logs-panel',
      route: '/log/manage?search=error&serviceName=checkout',
      titlePrefix: 'Filter panel'
    });
    expect(logsDrafts.map(draft => `${draft.signal}:${draft.visualization}`)).toEqual([
      'logs:list',
      'logs:table',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'traces:table',
      'traces:table',
      'traces:list',
      'traces:list',
      'alerts:list'
    ]);
    expect(logsDrafts[0]?.route).toContain('view=list');
    expect(logsDrafts[1]?.route).toContain('view=table');
    expect(JSON.parse(String(logsDrafts[1]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'logs-table'
    }));
    expect(JSON.parse(String(logsDrafts[12]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'traces-errors'
    }));
    expect(JSON.parse(String(logsDrafts[13]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'traces-exceptions'
    }));
    expect(JSON.parse(String(logsDrafts[14]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'traces-exception-messages'
    }));
    expect(JSON.parse(String(logsDrafts[15]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'alerts-firing'
    }));

    const tracesDrafts = createSignalDashboardPanelDraftsFromFilterSelection({
      variable: {
        name: 'service.name',
        type: 'textbox',
        value: 'checkout'
      },
      signal: 'traces',
      sourcePanelId: 'traces-panel',
      route: '/trace/manage?serviceName=checkout',
      titlePrefix: 'Filter panel'
    });
    expect(tracesDrafts.map(draft => `${draft.signal}:${draft.visualization}`)).toEqual([
      'traces:table',
      'traces:time-series',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'metrics:graph',
      'logs:list',
      'logs:table',
      'alerts:list'
    ]);
    expect(tracesDrafts[0]?.route).toContain('view=table');
    expect(tracesDrafts[1]?.route).toContain('view=time-series');
    expect(JSON.parse(String(tracesDrafts[1]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'traces-trend'
    }));
    expect(JSON.parse(String(tracesDrafts[12]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'logs-errors'
    }));
    expect(JSON.parse(String(tracesDrafts[13]?.payload))).toEqual(expect.objectContaining({
      templateKey: 'alerts-firing'
    }));
  });

  it('extracts source-backed table fields for logs and traces dashboard renderers', () => {
    const [logsPlan, tracesPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'table', route: '/log/manage?search=timeout' },
        { id: 'traces-errors', signal: 'traces', title: 'Trace errors', visualization: 'table', route: '/trace/manage?serviceName=checkout&view=table' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(logsPlan, {
      panelId: 'logs-errors',
      state: 'ready',
      primaryUrl: logsPlan.primaryUrl,
      data: {
        content: [{
          timeUnixNano: '1710000000000',
          severityText: 'ERROR',
          body: 'checkout timeout',
          traceId: 'trace-1',
          spanId: 'span-1',
          resource: { 'service.name': 'checkout' }
        }],
        totalElements: 1
      }
    }).tableRows).toEqual([
      expect.objectContaining({
        key: 'logs-errors:table:0',
        observedAt: '1710000000000',
        service: 'checkout',
        status: 'ERROR',
        name: 'ERROR',
        message: 'checkout timeout',
        traceId: 'trace-1',
        spanId: 'span-1',
        duration: '-',
        breakoutAttributes: [
          expect.objectContaining({ name: 'resource:service.name', value: 'checkout' })
        ]
      })
    ]);
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(tracesPlan, {
      panelId: 'traces-errors',
      state: 'ready',
      primaryUrl: tracesPlan.primaryUrl,
      data: {
        content: [{
          startTime: '2026-06-07T02:00:00Z',
          serviceName: 'checkout',
          status: 'ERROR',
          rootSpanName: 'POST /checkout',
          rootSpanId: 'span-root',
          traceId: 'trace-2',
          durationNanos: 12000000
        }],
        totalElements: 1
      }
    }).tableRows).toEqual([
      expect.objectContaining({
        key: 'traces-errors:table:0',
        observedAt: '2026-06-07T02:00:00Z',
        service: 'checkout',
        status: 'ERROR',
        name: 'POST /checkout',
        message: 'span-root',
        traceId: 'trace-2',
        spanId: 'span-root',
        duration: '12000000',
        breakoutAttributes: [
          expect.objectContaining({ name: 'resource:service.name', value: 'checkout' })
        ]
      })
    ]);
  });

  it('executes service apdex panels from histogram bucket and count contracts', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'metrics-apdex',
          signal: 'metrics',
          title: 'Apdex',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?template=service-apdex&query=http.server.duration.bucket&serviceName=checkout&serviceNamespace=payments&environment=prod&filter=service.name%3D%22checkout%22%20and%20service.namespace%3D%22payments%22'
        }
      ])
    });

    expect(plan).toEqual(expect.objectContaining({
      signal: 'metrics',
      state: 'ready',
      primaryUrl: expect.stringContaining('query=http.server.duration.bucket'),
      apiUrls: expect.objectContaining({
        console: expect.stringContaining('le%3D%220.5%22'),
        apdexTolerating: expect.stringContaining('le%3D%222.0%22'),
        apdexTotal: expect.stringContaining('query=http.server.duration.count')
      })
    }));
    expect(apiUrlSearchParams(plan.apiUrls.console).get('filter')).toBe('service.name="checkout" and service.namespace="payments" and le="0.5"');
    expect(apiUrlSearchParams(plan.apiUrls.apdexTolerating).get('filter')).toBe('service.name="checkout" and service.namespace="payments" and le="2.0"');
    expect(apiUrlSearchParams(plan.apiUrls.apdexTotal).get('filter')).toBe('service.name="checkout" and service.namespace="payments"');

    const metricPayload = (name: string, rows: number[][]) => ({
      results: {
        frames: [{
          schema: { labels: { __name__: name, 'service.name': 'checkout' } },
          data: rows
        }]
      }
    });
    const executedUrls: string[] = [];
    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      executedUrls.push(url);
      if (url.includes('le%3D%220.5%22')) return metricPayload('satisfied', [[1713200000000, 80], [1713200060000, 100]]);
      if (url.includes('le%3D%222.0%22')) return metricPayload('tolerating', [[1713200000000, 90], [1713200060000, 120]]);
      expect(url).toContain('query=http.server.duration.count');
      return metricPayload('total', [[1713200000000, 100], [1713200060000, 120]]);
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(executedUrls).toEqual([
      plan.apiUrls.console,
      plan.apiUrls.apdexTolerating,
      plan.apiUrls.apdexTotal
    ]);
    expect(summarizeSignalDashboardPanelRuntime(plan, result)).toEqual(expect.objectContaining({
      signal: 'metrics',
      kind: 'metrics-console',
      itemCount: 1,
      sampleCount: 2
    }));
    expect(renderer).toEqual(expect.objectContaining({
      renderer: 'metrics-chart',
      signal: 'metrics',
      sampleCount: 2
    }));
    expect(renderer.metricsChart?.series[0]).toEqual(expect.objectContaining({
      label: 'apdex',
      latestValue: 0.917,
      sampleCount: 2
    }));
    expect(renderer.metricsChart?.series[0]?.points.map(point => point.value)).toEqual([0.85, 0.917]);
  });

  it('executes service db call average duration panels from sum and count contracts', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'metrics-db-duration',
          signal: 'metrics',
          title: 'DB call duration',
          visualization: 'graph',
          route: '/ingestion/otlp/metrics?template=service-db-call-duration&query=signoz_db_latency_sum&serviceName=checkout&serviceNamespace=payments&environment=prod&groupBy=db.system&filter=service.name%3D%22checkout%22%20and%20service.namespace%3D%22payments%22'
        }
      ])
    });

    expect(plan).toEqual(expect.objectContaining({
      signal: 'metrics',
      state: 'ready',
      primaryUrl: expect.stringContaining('query=signoz_db_latency_sum'),
      apiUrls: expect.objectContaining({
        console: expect.stringContaining('query=signoz_db_latency_sum'),
        averageCount: expect.stringContaining('query=signoz_db_latency_count')
      })
    }));
    expect(apiUrlSearchParams(plan.apiUrls.console).get('filter')).toBe('service.name="checkout" and service.namespace="payments"');
    expect(apiUrlSearchParams(plan.apiUrls.averageCount).get('filter')).toBe('service.name="checkout" and service.namespace="payments"');

    const metricPayload = (name: string, rows: number[][]) => ({
      results: {
        frames: [{
          schema: { labels: { __name__: name, 'service.name': 'checkout', 'db.system': 'postgresql' } },
          data: rows
        }]
      }
    });
    const executedUrls: string[] = [];
    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      executedUrls.push(url);
      if (url.includes('signoz_db_latency_count')) return metricPayload('count', [[1713200000000, 10], [1713200060000, 20]]);
      expect(url).toContain('signoz_db_latency_sum');
      return metricPayload('sum', [[1713200000000, 1.5], [1713200060000, 5]]);
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(executedUrls).toEqual([
      plan.apiUrls.console,
      plan.apiUrls.averageCount
    ]);
    expect(summarizeSignalDashboardPanelRuntime(plan, result)).toEqual(expect.objectContaining({
      signal: 'metrics',
      kind: 'metrics-console',
      itemCount: 1,
      sampleCount: 2
    }));
    expect(renderer.metricsChart?.series[0]).toEqual(expect.objectContaining({
      label: 'db-call-avg-ms',
      latestValue: 250,
      sampleCount: 2
    }));
    expect(renderer.metricsChart?.series[0]?.points.map(point => point.value)).toEqual([150, 250]);
  });

  it('executes trace-backed exception panels through the trace group contract', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-exceptions',
          signal: 'traces',
          title: 'Exceptions',
          visualization: 'list',
          route: '/trace/manage?template=service-exceptions&serviceName=checkout&environment=prod&errorOnly=true&spanScope=all&groupBy=exception.type&groupOrder=error-count-desc&groupLimit=8'
        }
      ])
    });

    expect(plan).toEqual(expect.objectContaining({
      signal: 'traces',
      state: 'ready',
      primaryUrl: '/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.type&limit=8&orderBy=error-count-desc',
      apiUrls: expect.objectContaining({
        groupBy: '/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.type&limit=8&orderBy=error-count-desc'
      })
    }));

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.type&limit=8&orderBy=error-count-desc');
      return {
        groupBy: 'exception.type',
        groups: [{
          value: 'java.lang.IllegalStateException',
          traceCount: 7,
          errorTraceCount: 7,
          latencyAvgMs: 42,
          latencyP95Ms: 120
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(summarizeSignalDashboardPanelRuntime(plan, result)).toEqual(expect.objectContaining({
      signal: 'traces',
      kind: 'object',
      itemCount: 1,
      totalCount: 7
    }));
    expect(renderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      signal: 'traces',
      itemCount: 1
    }));
    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-exceptions:group:0',
      title: 'java.lang.IllegalStateException',
      copy: '7 traces · 7 errors',
      meta: 'exception.type · p95 120ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&template=service-exceptions&view=list&resourceFilter=exception.type%3Djava.lang.IllegalStateException'
    }));
  });

  it('executes trace-backed exception message panels through the trace group contract', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-exception-messages',
          signal: 'traces',
          title: 'Exception messages',
          visualization: 'list',
          route: '/trace/manage?template=service-exception-messages&serviceName=checkout&environment=prod&errorOnly=true&spanScope=all&groupBy=exception.message&groupOrder=error-count-desc&groupLimit=8'
        }
      ])
    });

    expect(plan).toEqual(expect.objectContaining({
      signal: 'traces',
      state: 'ready',
      primaryUrl: '/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.message&limit=8&orderBy=error-count-desc',
      apiUrls: expect.objectContaining({
        groupBy: '/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.message&limit=8&orderBy=error-count-desc'
      })
    }));

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&groupBy=exception.message&limit=8&orderBy=error-count-desc');
      return {
        groupBy: 'exception.message',
        groups: [{
          value: 'checkout timeout',
          traceCount: 5,
          errorTraceCount: 5,
          latencyAvgMs: 42
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      signal: 'traces',
      itemCount: 1
    }));
    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-exception-messages:group:0',
      title: 'checkout timeout',
      copy: '5 traces · 5 errors',
      meta: 'exception.message · avg 42ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&template=service-exception-messages&view=list&resourceFilter=exception.message%3Dcheckout+timeout'
    }));
  });

  it('maps trace operation groups to operation drilldown without creating operation entities', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-key-operations',
          signal: 'traces',
          title: 'Key operations',
          visualization: 'list',
          route: '/trace/manage?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&spanScope=all&groupBy=operation&groupLimit=8'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&environment=prod&groupBy=operation&limit=8');
      return {
        groupBy: 'operation',
        groups: [{
          value: 'POST /checkout',
          traceCount: 11,
          errorTraceCount: 2,
          latencyP95Ms: 240
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-key-operations:group:0',
      title: 'POST /checkout',
      copy: '11 traces · 2 errors',
      meta: 'operation · p95 240ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&serviceNamespace=payments&source=otlp&collector=collector-a&template=spring-boot&view=list&operationName=POST+%2Fcheckout'
    }));
    expect(renderer.rows[0]?.relatedHandoffHref).not.toContain('resourceFilter=operation');
  });

  it('maps trace http route groups to operation drilldown without creating route entities', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-routes',
          signal: 'traces',
          title: 'Routes',
          visualization: 'list',
          route: '/trace/manage?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&spanScope=all&groupBy=http.route&groupLimit=8'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&environment=prod&groupBy=http.route&limit=8');
      return {
        groupBy: 'http.route',
        groups: [{
          value: 'POST /checkout',
          traceCount: 7,
          errorTraceCount: 1,
          latencyP95Ms: 180
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-routes:group:0',
      title: 'POST /checkout',
      copy: '7 traces · 1 errors',
      meta: 'http.route · p95 180ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&serviceNamespace=payments&source=otlp&collector=collector-a&template=spring-boot&view=list&operationName=POST+%2Fcheckout'
    }));
    expect(renderer.rows[0]?.relatedHandoffHref).not.toContain('resourceFilter=http.route');
  });

  it('maps trace http target groups to operation drilldown without creating target entities', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-targets',
          signal: 'traces',
          title: 'HTTP targets',
          visualization: 'list',
          route: '/trace/manage?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&spanScope=all&groupBy=http.target&groupLimit=8'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&environment=prod&groupBy=http.target&limit=8');
      return {
        groupBy: 'http.target',
        groups: [{
          value: '/checkout/42',
          traceCount: 4,
          errorTraceCount: 1,
          latencyP95Ms: 95
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-targets:group:0',
      title: '/checkout/42',
      copy: '4 traces · 1 errors',
      meta: 'http.target · p95 95ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&serviceNamespace=payments&source=otlp&collector=collector-a&template=spring-boot&view=list&operationName=%2Fcheckout%2F42'
    }));
    expect(renderer.rows[0]?.relatedHandoffHref).not.toContain('resourceFilter=http.target');
  });

  it('maps trace snake_case span groups to operation drilldown without creating span entities', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-span-names',
          signal: 'traces',
          title: 'Span names',
          visualization: 'list',
          route: '/trace/manage?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&spanScope=all&groupBy=span_name&groupLimit=8'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      expect(url).toBe('/traces/stats/group-by?serviceName=checkout&spanScope=all&entityId=4200&entityType=service&serviceNamespace=payments&environment=prod&groupBy=span_name&limit=8');
      return {
        groupBy: 'span_name',
        groups: [{
          value: 'POST /checkout',
          traceCount: 6,
          errorTraceCount: 0,
          latencyP95Ms: 125
        }]
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'traces-span-names:group:0',
      title: 'POST /checkout',
      copy: '6 traces · 0 errors',
      meta: 'span_name · p95 125ms',
      relatedSignal: 'traces',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&spanScope=all&environment=prod&entityId=4200&entityType=service&entityName=Checkout+API&serviceNamespace=payments&source=otlp&collector=collector-a&template=spring-boot&view=list&operationName=POST+%2Fcheckout'
    }));
    expect(renderer.rows[0]?.relatedHandoffHref).not.toContain('resourceFilter=span_name');
  });

  it('renders backend-compatible trace group payload variants', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'traces-exception-messages',
          signal: 'traces',
          title: 'Exception messages',
          visualization: 'list',
          route: '/trace/manage?template=service-exception-messages&serviceName=checkout&environment=prod&errorOnly=true&spanScope=all&groupBy=exception.message&groupOrder=error-count-desc&groupLimit=8'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async () => ({
      groupBy: 'exception.message',
      groups: [{
        groupValue: 'payment failed',
        trace_count: 3,
        error_trace_count: 2,
        latency_p95_ms: 88
      }]
    }));
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      title: 'payment failed',
      copy: '3 traces · 2 errors',
      meta: 'exception.message · p95 88ms',
      relatedHandoffHref: '/trace/manage?serviceName=checkout&errorOnly=true&spanScope=all&environment=prod&template=service-exception-messages&view=list&resourceFilter=exception.message%3Dpayment+failed'
    }));
  });

  it('executes alert dashboard panels through the alert group list contract', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'alerts',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'alerts-firing',
          signal: 'alerts',
          title: 'Firing alerts',
          visualization: 'list',
          route: '/alert?search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod'
        }
      ])
    });

    expect(plan).toEqual(expect.objectContaining({
      signal: 'alerts',
      state: 'ready',
      primaryUrl: '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod',
      apiUrls: expect.objectContaining({
        list: '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod',
        summary: '/alerts/summary'
      })
    }));

    const executedUrls: string[] = [];
    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      executedUrls.push(url);
      if (url === '/alerts/summary') {
        return {
          total: 4,
          dealNum: 1,
          rate: 25,
          priorityWarningNum: 1,
          priorityCriticalNum: 2,
          priorityEmergencyNum: 1
        };
      }
      expect(url).toBe('/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod');
      return {
        content: [{
          id: 7,
          status: 'firing',
          groupKey: 'checkout-alerts',
          commonLabels: {
            alertname: 'HighErrorRate',
            'service.name': 'checkout',
            'service.namespace': 'payments',
            severity: 'critical'
          },
          commonAnnotations: {
            summary: 'Checkout error rate is high'
          },
          gmtUpdate: 1713200000000
        }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(executedUrls).toEqual([
      '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod',
      '/alerts/summary'
    ]);
    expect(summarizeSignalDashboardPanelRuntime(plan, result)).toEqual(expect.objectContaining({
      signal: 'alerts',
      kind: 'object',
      itemCount: 1,
      totalCount: 1
    }));
    expect(renderer).toEqual(expect.objectContaining({
      renderer: 'object-panel',
      signal: 'alerts',
      itemCount: 1
    }));
    expect(renderer.rows[0]).toEqual(expect.objectContaining({
      key: 'alerts-firing:summary:total',
      title: 'firing groups',
      copy: '4',
      meta: 'alerts',
      relatedSignal: 'alerts',
      relatedHandoffHref: '/alert?search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod'
    }));
    expect(renderer.rows[1]).toEqual(expect.objectContaining({
      key: 'alerts-firing:summary:critical',
      title: 'critical',
      copy: '3',
      meta: 'emergency 1',
      relatedSignal: 'alerts',
      relatedHandoffHref: '/alert?search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod&severity=critical'
    }));
    expect(renderer.rows[3]).toEqual(expect.objectContaining({
      title: 'Checkout error rate is high',
      copy: 'checkout · firing',
      meta: 'critical',
      relatedSignal: 'alerts',
      relatedHandoffHref: '/alert?search=checkout-alerts&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod&severity=critical'
    }));
  });

  it('renders backend-compatible alert payload variants', async () => {
    const [plan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'alerts',
      layout: '[]',
      widgets: JSON.stringify([
        {
          id: 'alerts-firing',
          signal: 'alerts',
          title: 'Firing alerts',
          visualization: 'list',
          route: '/alert?status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod'
        }
      ])
    });

    const result = await executeSignalDashboardPanelPlan(plan, async url => {
      if (url === '/alerts/summary') {
        return {
          total: 1,
          priorityWarningNum: 0,
          priorityCriticalNum: 1,
          priorityEmergencyNum: 0
        };
      }
      return {
        content: [{
          id: 12,
          status: 'firing',
          content: 'Checkout JVM memory high',
          labels: {
            alertname: 'JvmMemoryHigh',
            service: 'checkout',
            serviceNamespace: 'payments'
          },
          annotations: {
            summary: 'Checkout memory pressure'
          },
          severity: 'critical',
          gmtUpdate: 1713200000000
        }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      };
    });
    const renderer = buildSignalDashboardPanelRuntimeRenderDescriptor(plan, result);

    expect(renderer.rows[3]).toEqual(expect.objectContaining({
      title: 'Checkout memory pressure',
      copy: 'checkout · firing',
      meta: 'critical',
      relatedSignal: 'alerts',
      relatedHandoffHref: '/alert?status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod&search=JvmMemoryHigh&severity=critical'
    }));
  });

  it('extracts trace waterfall rows from span detail or trace list root rows', () => {
    const [traceDetailPlan, traceListPlan] = buildSignalDashboardExecutionPlans({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'traces',
      layout: '[]',
      widgets: JSON.stringify([
        { id: 'traces-detail', signal: 'traces', title: 'Trace detail', visualization: 'trace', route: '/trace/manage?traceId=trace-1&view=trace' },
        { id: 'traces-list', signal: 'traces', title: 'Trace list', visualization: 'table', route: '/trace/manage?serviceName=checkout&view=table' }
      ])
    });

    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(traceDetailPlan, {
      panelId: 'traces-detail',
      state: 'ready',
      primaryUrl: traceDetailPlan.primaryUrl,
      data: {
        content: [{ traceId: 'trace-1', rootSpanName: 'POST /checkout', durationNanos: 20_000_000 }],
        totalElements: 1,
        trace: {
          traceId: 'trace-1',
          startTime: 1000,
          durationNanos: 20_000_000,
          spans: [
            {
              traceId: 'trace-1',
              spanId: 'root',
              spanName: 'POST /checkout',
              serviceName: 'checkout',
              status: 'OK',
              startTime: 1000,
              durationNanos: 20_000_000
            },
            {
              traceId: 'trace-1',
              spanId: 'db',
              parentSpanId: 'root',
              spanName: 'SELECT cart',
              serviceName: 'postgres',
              status: 'ERROR',
              startTime: 1005,
              durationNanos: 5_000_000
            }
          ]
        }
      }
    }).traceWaterfallRows).toEqual([
      expect.objectContaining({
        key: 'traces-detail:waterfall:root',
        traceId: 'trace-1',
        spanId: 'root',
        service: 'checkout',
        name: 'POST /checkout',
        source: 'spans',
        depth: 0,
        leftPct: 0,
        widthPct: 100,
        tone: 'default'
      }),
      expect.objectContaining({
        key: 'traces-detail:waterfall:db',
        spanId: 'db',
        parentSpanId: 'root',
        service: 'postgres',
        name: 'SELECT cart',
        source: 'spans',
        depth: 1,
        tone: 'danger'
      })
    ]);
    expect(buildSignalDashboardPanelRuntimeRenderDescriptor(traceListPlan, {
      panelId: 'traces-list',
      state: 'ready',
      primaryUrl: traceListPlan.primaryUrl,
      data: {
        content: [{
          traceId: 'trace-2',
          rootSpanId: 'root-2',
          rootSpanName: 'GET /cart',
          serviceName: 'cart',
          status: 'OK',
          startTime: 2000,
          durationNanos: 15_000_000
        }],
        totalElements: 1
      }
    }).traceWaterfallRows).toEqual([
      expect.objectContaining({
        traceId: 'trace-2',
        spanId: 'root-2',
        service: 'cart',
        name: 'GET /cart',
        source: 'list-roots',
        depth: 0,
        leftPct: 0,
        widthPct: 100
      })
    ]);
  });

  it('parses saved dashboard widgets into layout-ordered preview panels', () => {
    const panels = parseSignalDashboardPreviewPanels({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,metrics',
      layout: JSON.stringify([
        { i: 'metrics-latency', x: 6, y: 0, w: 6, h: 4 },
        { i: 'logs-errors', x: 0, y: 0, w: 6, h: 4 }
      ]),
      widgets: JSON.stringify([
        { id: 'metrics-latency', signal: 'metrics', title: 'Latency', visualization: 'time-series', route: '/ingestion/otlp/metrics' },
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'table', route: '/log/manage' }
      ])
    });

    expect(panels).toEqual([
      expect.objectContaining({
        widget: expect.objectContaining({ id: 'logs-errors', signal: 'logs' }),
        layout: expect.objectContaining({ x: 0, y: 0, w: 6, h: 4 })
      }),
      expect.objectContaining({
        widget: expect.objectContaining({ id: 'metrics-latency', signal: 'metrics' }),
        layout: expect.objectContaining({ x: 6, y: 0, w: 6, h: 4 })
      })
    ]);
  });

  it('falls back to a default grid when saved dashboard layout is missing or invalid', () => {
    const panels = parseSignalDashboardPreviewPanels({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: '',
      layout: 'not-json',
      widgets: JSON.stringify([
        { id: 'traces-root', signal: 'traces', title: 'Root spans', visualization: 'trace', route: '/trace/manage' }
      ])
    });

    expect(panels).toEqual([
      expect.objectContaining({
        widget: expect.objectContaining({ id: 'traces-root' }),
        layout: { i: 'traces-root', x: 0, y: 0, w: 6, h: 4 }
      })
    ]);
  });

  it('returns no preview panels when saved widgets cannot be parsed', () => {
    expect(parseSignalDashboardPreviewPanels({
      dashboardKey: 'bad',
      title: 'Bad',
      description: '',
      tags: '',
      layout: '[]',
      widgets: '{bad-json'
    })).toEqual([]);
  });

  it('updates a saved panel layout and keeps the dashboard widgets unchanged', () => {
    const dashboard = {
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs',
      layout: JSON.stringify([{ i: 'logs-errors', x: 0, y: 0, w: 6, h: 4 }]),
      widgets: JSON.stringify([
        { id: 'logs-errors', signal: 'logs', title: 'Errors', visualization: 'table', route: '/log/manage' }
      ])
    };

    const updated = updateSignalDashboardPanelLayout(dashboard, 'logs-errors', { dx: 2, dy: 1, dw: 3, dh: 2 });

    expect(updated.widgets).toBe(dashboard.widgets);
    expect(JSON.parse(updated.layout)).toEqual([
      { i: 'logs-errors', x: 2, y: 1, w: 9, h: 6 }
    ]);
  });

  it('updates a saved dashboard panel widget from an edited source draft without changing layout', () => {
    const dashboard = {
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: JSON.stringify([{ i: 'metrics-latency', x: 0, y: 0, w: 6, h: 4 }]),
      widgets: JSON.stringify([
        {
          id: 'metrics-latency',
          draftKey: 'metrics-panel-old',
          signal: 'metrics',
          title: 'Old latency',
          visualization: 'time-series',
          route: '/ingestion/otlp/metrics?query=old'
        }
      ]),
      panelMap: JSON.stringify({ 'metrics-latency': 'metrics-panel-old' })
    };

    const updated = updateSignalDashboardPanelWidgetFromDraft(dashboard, 'metrics-latency', {
      signal: 'metrics',
      draftKey: 'metrics-panel-checkout',
      title: 'Checkout p95',
      description: 'Updated from source editor',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration',
      payload: JSON.stringify({ source: 'metrics-explorer' })
    });

    expect(updated.layout).toBe(dashboard.layout);
    expect(JSON.parse(updated.widgets)).toEqual([
      expect.objectContaining({
        id: 'metrics-latency',
        draftKey: 'metrics-panel-checkout',
        title: 'Checkout p95',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=http.server.duration',
        querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration'
      })
    ]);
    expect(JSON.parse(String(updated.panelMap))).toEqual({
      'metrics-latency': 'metrics-panel-checkout'
    });
  });

  it('reads dashboard panel edit metadata from saved widget payloads', () => {
    expect(readSignalDashboardWidgetPanelEditMetadata({
      payload: JSON.stringify({
        source: 'metrics-explorer',
        dashboardPanelEdit: {
          intent: 'edit-panel',
          dashboardKey: 'signals-overview',
          panelId: 'metrics-latency',
          draftKey: 'metrics-panel-checkout',
          returnTo: '/dashboard?start=10',
          returnLabel: 'Signals overview'
        }
      })
    })).toEqual({
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: 'metrics-latency',
      draftKey: 'metrics-panel-checkout',
      returnTo: '/dashboard?start=10',
      returnLabel: 'Signals overview'
    });
    expect(readSignalDashboardWidgetPanelEditMetadata({ payload: '{"source":"metrics-explorer"}' })).toBeNull();
    expect(readSignalDashboardWidgetPanelEditMetadata({ payload: '{bad-json' })).toBeNull();
  });

  it('saves edited panel drafts back into the source dashboard widget', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/signal/dashboard' && !init?.method) {
        return new Response(JSON.stringify({
          code: 0,
          data: [
            {
              dashboardKey: 'signals-overview',
              title: 'Signals overview',
              description: 'Signals',
              tags: 'metrics',
              layout: JSON.stringify([{ i: 'metrics-latency', x: 0, y: 0, w: 6, h: 4 }]),
              widgets: JSON.stringify([
                {
                  id: 'metrics-latency',
                  draftKey: 'metrics-panel-old',
                  signal: 'metrics',
                  title: 'Old latency',
                  visualization: 'time-series',
                  route: '/ingestion/otlp/metrics?query=old'
                }
              ]),
              panelMap: JSON.stringify({ 'metrics-latency': 'metrics-panel-old' })
            }
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        code: 0,
        data: JSON.parse(String(init?.body))
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(saveSignalDashboardPanelEditContext({
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: 'metrics-latency',
      draftKey: 'metrics-panel-checkout'
    }, {
      signal: 'metrics',
      draftKey: 'metrics-panel-checkout',
      title: 'Checkout p95',
      description: 'Updated source route',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration'
    })).resolves.toEqual(expect.objectContaining({
      dashboardKey: 'signals-overview'
    }));

    const saveCall = vi.mocked(globalThis.fetch).mock.calls.find(call => (
      String(call[0]) === '/api/signal/dashboard' && call[1]?.method === 'PUT'
    ));
    expect(saveCall).toBeTruthy();
    const savedDashboard = JSON.parse(String(saveCall?.[1]?.body));
    expect(JSON.parse(savedDashboard.widgets)).toEqual([
      expect.objectContaining({
        id: 'metrics-latency',
        draftKey: 'metrics-panel-checkout',
        title: 'Checkout p95',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=http.server.duration'
      })
    ]);
    expect(JSON.parse(savedDashboard.panelMap)).toEqual({
      'metrics-latency': 'metrics-panel-checkout'
    });
  });

  it('clamps layout updates to the 12-column dashboard grid', () => {
    const updated = updateSignalDashboardPanelLayout({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'metrics',
      layout: JSON.stringify([{ i: 'metrics-latency', x: 10, y: 0, w: 6, h: 4 }]),
      widgets: JSON.stringify([
        { id: 'metrics-latency', signal: 'metrics', title: 'Latency', visualization: 'time-series', route: '/ingestion/otlp/metrics' }
      ])
    }, 'metrics-latency', { dx: 10, dy: -2, dw: 10, dh: -12 });

    expect(JSON.parse(updated.layout)).toEqual([
      { i: 'metrics-latency', x: 0, y: 0, w: 12, h: 1 }
    ]);
  });

  it('loads dashboards through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: [
        {
          id: 7,
          dashboardKey: 'signals-overview',
          title: 'Signals overview',
          description: 'Signals',
          tags: 'logs,traces,metrics',
          layout: '[]',
          widgets: '[]',
          version: 'v1'
        }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(loadSignalDashboards()).resolves.toEqual([
      expect.objectContaining({ dashboardKey: 'signals-overview', version: 'v1' })
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('upserts dashboards through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: {
        id: 9,
        dashboardKey: 'signals-overview',
        title: 'Signals overview',
        description: 'Signals',
        tags: 'logs,traces,metrics',
        layout: '[]',
        widgets: '[]',
        version: 'v1'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(saveSignalDashboard({
      dashboardKey: 'signals-overview',
      title: 'Signals overview',
      description: 'Signals',
      tags: 'logs,traces,metrics',
      layout: '[]',
      widgets: '[]',
      version: 'v1'
    })).resolves.toEqual(expect.objectContaining({ id: 9 }));

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard', expect.objectContaining({
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('deletes dashboards by encoded dashboard key', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: null
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await deleteSignalDashboard('signals:key/with?reserved');

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard/signals%3Akey%2Fwith%3Freserved', expect.objectContaining({
      method: 'DELETE'
    }));
  });
});
