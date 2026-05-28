'use client';

import * as React from 'react';
import Link from 'next/link';
import type { EChartsOption } from 'echarts';
import { Activity, ArrowRight, BarChart3, CheckCircle2, Copy as CopyIcon, Database, FileCode2, FileText, GitBranch, HardDrive, HelpCircle, LogOut, MapPin, Megaphone, Minimize2, MoreHorizontal, Network, PauseCircle, Pencil, Play, PlayCircle, Plus, Power, RefreshCw, RotateCcw, Search, Server, SlidersHorizontal, Star, Timer, Trash2, Wrench, X } from 'lucide-react';
import {
  HzBarGauge,
  HzAttributeDiagnostics,
  HzActionGroup,
  HzActionWorkbench,
  HzAiChatModalSurface,
  HzAboutModalSurface,
  HzAssistiveMarker,
  HzBatchToolbar,
  HzButton,
  HzButtonIcon,
  HzButtonLink,
  HzCheckbox,
  HzChipGroup,
  HzCollapsibleSection,
  HzCommandPalette,
  HzConfigurableFieldEditor,
  HzContextHandoff,
  HzControlStack,
  HzDataCellStack,
  HzCodeEditor,
  HzDataCellText,
  HzDataMetaText,
  HzDataTable,
  HzDialogBodyLayout,
  HzDialogEventNotice,
  HzDialogEventText,
  HzDialogMetaItem,
  HzDisabledActionShell,
  HzDetailAside,
  HzDetailBodyStack,
  HzDetailRows,
  HzDangerConfirm,
  HzConfirmDialog,
  HzEmptyState,
  HzExplorerFrame,
  HzEChartsPanel,
  HzExportTypeDialog,
  HzFileInput,
  HzField,
  HzFieldInsights,
  HzFieldValueActions,
  HzFilterWorkbench,
  HzFoundationGuide,
  HzHeaderIconButton,
  HzHeaderMenuAction,
  HzHeaderRealtimeNotice,
  HzLocaleMenuOption,
  HzPassportLoginActionFrame,
  HzPassportLoginNotice,
  HzPassportLoginValidationNotice,
  HzPassportSessionClearFrame,
  HzUserMenuAction,
  HzIconButton,
  HzIconLink,
  HzPassportLockSurface,
  HzIncidentWorkbench,
  HzHeatmapChart,
  HzInspectorDrawer,
  HzInvestigationNotes,
  HzKeyValueEditor,
  HzInput,
  HzLabelTag,
  HzInlineContextMark,
  HzInlineFeedback,
  HzLoadingState,
  HzLogLevelDistribution,
  HzLogStreamLiveRow,
  HzLogStream,
  HzLogVolumeChart,
  HzMetricStrip,
  HzMonitorFavoritePane,
  HzMonitorFavoriteSurface,
  HzMonitorFilterBar,
  HzMonitorBasicCard,
  HzMonitorBasicSummary,
  HzMonitorBreadcrumb,
  HzMonitorDetailConsoleShell,
  HzMonitorDetailWorkbenchFrame,
  HzMonitorFullscreenFrame,
  HzMonitorDetailStage,
  HzMonitorDetailSignalList,
  HzMonitorDetailTabLabel,
  HzMonitorDetailTabPanel,
  HzMonitorDetailTabSequence,
  HzMonitorDetailTabs,
  HzMonitorEditorActionBar,
  HzMonitorEditorFieldGrid,
  HzMonitorEditorForm,
  HzMonitorEditorHeader,
  HzMonitorEditorSection,
  HzMonitorHistoryChartCard,
  HzMonitorHistoryChartGrid,
  HzMonitorControlBand,
  HzMonitorEvidenceFrame,
  HzMonitorSignalBars,
  HzMonitorStatGrid,
  HzMonitorIncrementalLoadFooter,
  HzMonitorMetricCard,
  HzMonitorMetricCardGrid,
  HzMonitorMetricFavoriteAction,
  HzMonitorRealtimeInspector,
  HzMonitorRowNavigator,
  HzMonitorRealtimeRowNavigator,
  HzMonitorRealtimeToolbar,
  HzMonitorRefreshToolbar,
  HzMutationBar,
  HzNumberStepper,
  HzPaginationBar,
  HzPanelHeader,
  HzPanelSection,
  HzPanelSurface,
  HzPanelTitleLabel,
  HzQueryBar,
  HzQueryActionGroup,
  HzQueryHistory,
  HzQueryStatusSelect,
  HzQueryTokenField,
  HzRadioButtonGroup,
  HzResultControls,
  HzSavedViewCompare,
  HzScrollViewport,
  HzSearchFieldFrame,
  HzSearchFieldIcon,
  HzSegmentedTabs,
  HzSignalTrendBars,
  HzSignalWorkbenchShell,
  HzSelectableRows,
  HzSelect,
  HzStateNotice,
  HzStatCell,
  HzStatStrip,
  HzStatusBadge,
  HzStatusIncidentHistory,
  HzStatusTimeline,
  HzSwitch,
  HzTableRowActionButton,
  HzTemplatePicker,
  HzThresholdRail,
  HzTimeDistributionChart,
  HzTimeRangePreviewHandoff,
  HzTimeRangeToolbar,
  HzTimeSeriesChart,
  HzTextarea,
  HzTrendBar,
  HzTrendFrame,
  HzTopologyActionLink,
  HzTopologyWorkbenchFrame,
  HzTopologyWorkbenchHeader,
  HzTopologyWorkbenchGrid,
  HzTopologyWorkbenchSlot,
  HzTopologyCanvas,
  HzTopologyCanvasAnnotation,
  HzTopologyGraphLayer,
  HzTopologyCompanionRail,
  HzTopologyCompanionSection,
  HzTopologyCompanionJumpList,
  HzTopologyToolbar,
  HzTopologyEmptyState,
  HzTopologyLoadingState,
  HzTopologyFilterStrip,
  HzTopologyFocusTrail,
  HzTopologyGroupPanel,
  HzTopologyPathSummary,
  HzTopologyScopeBar,
  HzTopologyMetricTable,
  HzTopologyNode,
  HzTopologyEdge,
  HzTopologyHoverTooltip,
  HzTopologySectionLabel,
  HzTopologyEvidenceList,
  HzTopologyLegend,
  HzTopologyDetailDrawer,
  type HzTopologyMetricRow,
  type HzTopologyMetricTableRenderWindowFilter,
  HzUnderlineToggle,
  HzWorkbenchHeaderCopy,
  HzWorkbenchLayout,
  HzServiceDependencyGraph,
  HzTraceDetailDrawer,
  HzTraceEventTimeline,
  HzTraceLatencyDistribution,
  HzTraceList,
  HzTraceSpanTable,
  HzTraceWaterfall,
  HzToastStack,
  HzTypePickerDialog,
  HzYamlWorkspace,
  type HzFilterBuilderLogic,
  type HzFilterClause,
  type HzFilterFacet,
  type HzFilterFacetGroup,
  type HzFilterFacetValue,
  type HzFilterGroup,
  type HzTimeRangeToolbarValue,
  type HzTemplateCategory,
  type HzToastItem
} from '@hertzbeat/ui';
import {
  HzTopologyG6Canvas,
  buildHzTopologyG6LargeGraphStrategy,
  buildHzTopologyG6RenderWindow,
  buildHzTopologyG6ScaleFixture,
  buildHzTopologyG6ScaleProfile,
  type HzTopologyG6GraphInput
} from '@hertzbeat/ui/topology-g6';
import { AlertNoticeRuleSwitch } from '../../components/pages/alert-notice-rule-fields';
import { ColdCodeEditor } from '@/components/ui/cold-code-editor';
import { LabelRecordInput } from '@/components/ui/label-record-input';
import { SearchRow } from '@/components/ui/search-row';
import { useI18n } from '@/components/providers/i18n-provider';
import { SettingsConsoleShell } from '@/components/settings/settings-console-shell';
import { SettingsDialogField, SettingsDialogForm, SettingsDialogInput, SettingsDialogSelect, SettingsDialogToggle } from '@/components/settings/settings-dialog-form';
import { SettingsForm, SettingsFormField, SettingsFormInput, SettingsFormSelect } from '@/components/settings/settings-form';
import { TimeRangeControl } from '@/components/observability/time-range-control';

const monitorTypeCategories: HzTemplateCategory[] = [
  {
    id: 'db',
    label: '数据库监控',
    items: [
      {
        id: 'mysql',
        label: 'MySQL',
        description: '连接、慢查询、可用性和复制状态',
        meta: 'JDBC',
        icon: <Database size={13} />
      },
      {
        id: 'postgresql',
        label: 'PostgreSQL',
        description: '连接池、事务、锁等待和复制延迟',
        meta: 'JDBC',
        icon: <Database size={13} />
      }
    ]
  },
  {
    id: 'os',
    label: '操作系统监控',
    items: [
      {
        id: 'linux',
        label: 'Linux',
        description: 'CPU、内存、磁盘、进程和端口',
        meta: 'SSH',
        icon: <Server size={13} />
      },
      {
        id: 'windows',
        label: 'Windows',
        description: 'WMI、服务状态和性能计数器',
        meta: 'WMI',
        icon: <HardDrive size={13} />
      }
    ]
  },
  {
    id: 'bigdata',
    label: '大数据监控',
    items: [
      {
        id: 'flink_on_yarn',
        label: 'Flink on Yarn',
        description: 'Job、TaskManager、Checkpoint 和队列资源',
        meta: 'REST',
        icon: <Activity size={13} />
      }
    ]
  },
  {
    id: 'network',
    label: '网络监控',
    items: [
      {
        id: 'snmp',
        label: 'SNMP Device',
        description: '接口、流量、错误包和设备状态',
        meta: 'SNMP',
        icon: <Network size={13} />
      }
    ]
  }
];

const yamlCategories: HzTemplateCategory[] = monitorTypeCategories.map(category => ({
  ...category,
  items: category.items.map(item => ({
    ...item,
    meta: 'app-' + item.id + '.yml',
    status:
      item.id === 'mysql' || item.id === 'linux' ? (
        <span className="font-mono text-[10px] text-[#9cc9aa]">shown</span>
      ) : (
        <span className="font-mono text-[10px] text-[#727b8c]">hidden</span>
      ),
    action: (
      <HzButton
        size="sm"
        intent="ghost"
        aria-label={`${item.id === 'mysql' || item.id === 'linux' ? 'Hide' : 'Show'} template ${item.label}`}
        title={`${item.id === 'mysql' || item.id === 'linux' ? 'Hide' : 'Show'} template ${item.label}`}
        data-hz-ui-lab-setting-define-visibility-action="angular-row-contextual"
        data-hz-ui-lab-setting-define-visibility-contract="angular-hide-true-or-undefined-contextual"
        data-setting-define-template-visibility-contract="angular-hide-true-or-undefined-contextual"
        data-setting-define-template-visibility-owner="hertzbeat-ui-button"
        data-setting-define-template-visibility-label={item.label}
        data-setting-define-template-visibility-action={item.id === 'mysql' || item.id === 'linux' ? 'hide' : 'show'}
        data-setting-define-template-visibility-next-hide={item.id === 'mysql' || item.id === 'linux' ? 'true' : 'false'}
        onClick={event => event.stopPropagation()}
      >
        {item.id === 'mysql' || item.id === 'linux' ? 'Hide' : 'Show'}
      </HzButton>
    )
  }))
}));

const topologyG6LabGraph: HzTopologyG6GraphInput = {
  nodes: [
    {
      id: 'svc-web',
      label: 'Web',
      entityType: 'service',
      health: 'healthy',
      tone: 'success',
      focus: 'related',
      source: 'otlp-trace-call',
      evidenceBadges: ['trace'],
      redMetrics: { requestRatePerSecond: 18.6, errorRate: 0.004, latencyP95Ms: 44 }
    },
    {
      id: 'svc-checkout',
      label: 'Checkout API',
      entityType: 'service',
      health: 'warning',
      tone: 'warning',
      focus: 'active',
      source: 'otlp-trace-call',
      evidenceBadges: ['trace', 'relation'],
      redMetrics: { requestRatePerSecond: 12.34, errorRate: 0.042, latencyP95Ms: 180 }
    },
    {
      id: 'svc-payment',
      label: 'Payment API',
      entityType: 'service',
      health: 'healthy',
      tone: 'success',
      focus: 'related',
      source: 'otlp-trace-call',
      evidenceBadges: ['trace'],
      redMetrics: { requestRatePerSecond: 7.1, errorRate: 0.012, latencyP95Ms: 92 }
    },
    {
      id: 'queue-events',
      label: 'Events Queue',
      entityType: 'middleware',
      health: 'healthy',
      tone: 'blue',
      focus: 'normal',
      source: 'template-dependency',
      evidenceBadges: ['queue'],
      redMetrics: { requestRatePerSecond: 5.8, errorRate: 0, latencyP95Ms: 28 }
    },
    {
      id: 'db-orders',
      label: 'Orders DB',
      entityType: 'database',
      health: 'critical',
      tone: 'danger',
      focus: 'related',
      source: 'database-middleware-connection',
      evidenceBadges: ['db', 'alert'],
      redMetrics: { requestRatePerSecond: 6.8, errorRate: 0.11, latencyP95Ms: 320 }
    },
    {
      id: 'cache-cart',
      label: 'Cart Cache',
      entityType: 'middleware',
      health: 'warning',
      tone: 'orange',
      focus: 'normal',
      source: 'database-middleware-connection',
      evidenceBadges: ['cache'],
      redMetrics: { requestRatePerSecond: 9.5, errorRate: 0.026, latencyP95Ms: 76 }
    },
    {
      id: 'monitor-http',
      label: 'HTTP Monitor',
      entityType: 'monitor',
      health: 'healthy',
      tone: 'purple',
      focus: 'normal',
      source: 'monitor-ownership',
      evidenceBadges: ['monitor'],
      redMetrics: { requestRatePerSecond: 1, errorRate: 0, latencyP95Ms: 18 }
    }
  ],
  edges: [
    {
      id: 'web-checkout',
      from: 'svc-web',
      to: 'svc-checkout',
      label: 'HTTP call',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      tone: 'orange',
      focus: 'active-path',
      selected: true,
      evidenceBadges: ['trace'],
      redMetrics: { requestRatePerSecond: 12.34, errorRate: 0.042, latencyP95Ms: 180 }
    },
    {
      id: 'checkout-payment',
      from: 'svc-checkout',
      to: 'svc-payment',
      label: 'HTTP call',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      tone: 'green',
      focus: 'active-path',
      evidenceBadges: ['trace'],
      redMetrics: { requestRatePerSecond: 7.1, errorRate: 0.012, latencyP95Ms: 92 }
    },
    {
      id: 'checkout-orders',
      from: 'svc-checkout',
      to: 'db-orders',
      label: 'database connection',
      relationshipType: 'database-connection',
      source: 'database-middleware-connection',
      tone: 'red',
      focus: 'active-path',
      evidenceBadges: ['db', 'alert'],
      redMetrics: { requestRatePerSecond: 6.8, errorRate: 0.11, latencyP95Ms: 320 }
    },
    {
      id: 'checkout-cache',
      from: 'svc-checkout',
      to: 'cache-cart',
      label: 'cache call',
      relationshipType: 'middleware-connection',
      source: 'database-middleware-connection',
      tone: 'orange',
      evidenceBadges: ['cache'],
      redMetrics: { requestRatePerSecond: 9.5, errorRate: 0.026, latencyP95Ms: 76 }
    },
    {
      id: 'checkout-events',
      from: 'svc-checkout',
      to: 'queue-events',
      label: 'publish',
      relationshipType: 'template-dependency',
      source: 'template-dependency',
      tone: 'blue',
      evidenceBadges: ['queue'],
      redMetrics: { requestRatePerSecond: 5.8, errorRate: 0, latencyP95Ms: 28 }
    },
    {
      id: 'monitor-checkout',
      from: 'monitor-http',
      to: 'svc-checkout',
      label: 'monitor ownership',
      relationshipType: 'monitors',
      source: 'monitor-ownership',
      tone: 'purple',
      focus: 'context-muted',
      evidenceBadges: ['monitor'],
      redMetrics: { requestRatePerSecond: 1, errorRate: 0, latencyP95Ms: 18 }
    }
  ]
};

const topologyG6ScaleLabGraph = buildHzTopologyG6ScaleFixture(50, {
  environment: 'prod',
  namespace: 'commerce',
  prefix: 'scale'
});
const topologyG6ScaleLabGraph500 = buildHzTopologyG6ScaleFixture(500, {
  environment: 'prod',
  namespace: 'commerce',
  prefix: 'scale'
});
const topologyG6ScaleLabProfile50 = buildHzTopologyG6ScaleProfile(topologyG6ScaleLabGraph);
const topologyG6ScaleLabProfile200 = buildHzTopologyG6ScaleProfile(buildHzTopologyG6ScaleFixture(200));
const topologyG6ScaleLabProfile500 = buildHzTopologyG6ScaleProfile(topologyG6ScaleLabGraph500);
const topologyG6LargeGraphStrategy200 = buildHzTopologyG6LargeGraphStrategy(buildHzTopologyG6ScaleFixture(200));
const topologyG6LargeGraphStrategy500 = buildHzTopologyG6LargeGraphStrategy(topologyG6ScaleLabGraph500);
const topologyG6ScaleLabRenderWindow500 = buildHzTopologyG6RenderWindow(topologyG6ScaleLabGraph500, topologyG6LargeGraphStrategy500, {
  priorityNodeIds: ['scale-svc-420']
});

const monitorRows = [
  { name: 'mysql-prod-01', app: 'MySQL', collector: 'collector-a', signal: 'metrics', status: '可用', latency: '38 ms', tone: 'success' as const },
  { name: 'linux-edge-03', app: 'Linux', collector: 'collector-b', signal: 'metrics/logs', status: '采集中', latency: '72 ms', tone: 'info' as const },
  { name: 'flink-yarn-main', app: 'Flink on Yarn', collector: 'collector-a', signal: 'metrics', status: '告警中', latency: '118 ms', tone: 'warning' as const },
  { name: 'snmp-core-sw-02', app: 'SNMP Device', collector: 'collector-c', signal: 'metrics', status: '可用', latency: '45 ms', tone: 'success' as const }
];

const filterGroups: HzFilterGroup[] = [
  {
    id: 'domain',
    label: 'Domain',
    options: [
      { id: 'all', label: 'All monitors', count: 128, active: true },
      { id: 'database', label: 'Database', count: 24 },
      { id: 'host', label: 'Host', count: 46 },
      { id: 'bigdata', label: 'Big data', count: 9 },
      { id: 'network', label: 'Network', count: 18 }
    ]
  },
  {
    id: 'status',
    label: 'Status',
    options: [
      { id: 'up', label: 'Available', count: 116 },
      { id: 'warn', label: 'Warning', count: 7 },
      { id: 'down', label: 'Down', count: 5 }
    ]
  },
  {
    id: 'collector',
    label: 'Collector',
    options: [
      { id: 'collector-a', label: 'collector-a', count: 58 },
      { id: 'collector-b', label: 'collector-b', count: 44 },
      { id: 'collector-c', label: 'collector-c', count: 26 }
    ]
  }
];

const filterFacetGroups: HzFilterFacetGroup[] = [
  {
    id: 'resource',
    label: 'Resource attributes',
    facets: [
      {
        id: 'resource.type',
        label: 'resource.type',
        type: 'keyword',
        values: [
          { id: 'mysql', label: 'mysql', count: 24, active: true },
          { id: 'linux', label: 'linux', count: 46, active: true },
          { id: 'flink', label: 'flink_on_yarn', count: 9 },
          { id: 'snmp', label: 'snmp', count: 18 }
        ]
      },
      {
        id: 'collector',
        label: 'collector',
        type: 'keyword',
        values: [
          { id: 'collector-a', label: 'collector-a', count: 58 },
          { id: 'collector-b', label: 'collector-b', count: 44 },
          { id: 'collector-c', label: 'collector-c', count: 26 }
        ]
      }
    ]
  },
  {
    id: 'signal',
    label: 'Signals',
    facets: [
      {
        id: 'signal',
        label: 'signal',
        type: 'keyword',
        values: [
          { id: 'metrics', label: 'metrics', count: 123, active: true },
          { id: 'logs', label: 'logs', count: 41 },
          { id: 'traces', label: 'traces', count: 32 }
        ]
      },
      {
        id: 'status',
        label: 'status',
        type: 'enum',
        values: [
          { id: 'available', label: 'available', count: 116 },
          { id: 'warning', label: 'warning', count: 7 },
          { id: 'down', label: 'down', count: 5 }
        ]
      }
    ]
  }
];

const initialFilterClauses: HzFilterClause[] = [
  { id: 'resource.type-IN-mysql-linux', field: 'resource.type', operator: 'IN', value: 'mysql, linux' },
  { id: 'status-neq-down', field: 'status', operator: '!=', value: 'down' }
];

const savedFilterViewPresets: Array<{
  id: string;
  label: string;
  description: string;
  clauses: HzFilterClause[];
}> = [
  {
    id: 'baseline',
    label: 'Baseline',
    description: '资源类型 + 非宕机基线',
    clauses: initialFilterClauses
  },
  {
    id: 'collector-latency',
    label: 'Collector latency',
    description: '聚焦 collector-a 延迟',
    clauses: [
      { id: 'collector-IN-collector-a', field: 'collector', operator: 'IN', value: 'collector-a' },
      { id: 'latency-gt-80ms', field: 'latency', operator: '>', value: '80ms' }
    ]
  },
  {
    id: 'open-alerts',
    label: 'Open alerts',
    description: '只看告警与采集中资源',
    clauses: [{ id: 'status-IN-warning-collecting', field: 'status', operator: 'IN', value: 'warning, collecting' }]
  }
];

const groupByFilters = [
  { id: 'resource.type', label: 'resource.type' },
  { id: 'collector', label: 'collector' }
];

const filterQueryPlan = {
  aggregate: 'count()',
  orderBy: 'latency desc',
  limit: 100
};

const filterBuilderFields = [
  { id: 'resource.type', label: 'resource.type' },
  { id: 'collector', label: 'collector' },
  { id: 'signal', label: 'signal' },
  { id: 'status', label: 'status' },
  { id: 'latency', label: 'latency' }
];

const filterBuilderOperators = [
  { id: 'IN', label: 'IN' },
  { id: 'NOT_IN', label: 'NOT_IN' },
  { id: '=', label: '=' },
  { id: '!=', label: '!=' },
  { id: 'CONTAINS', label: 'CONTAINS' },
  { id: 'EXISTS', label: 'EXISTS' },
  { id: '>', label: '>' },
  { id: '<', label: '<' }
];

const resultTimeRanges = [
  { id: '15m', label: 'Last 15 minutes' },
  { id: '1h', label: 'Last 1 hour' },
  { id: '6h', label: 'Last 6 hours' },
  { id: '24h', label: 'Last 24 hours' }
];

const resultRefreshIntervals = [
  { id: 'off', label: 'Off' },
  { id: '15s', label: '15s' },
  { id: '30s', label: '30s' },
  { id: '1m', label: '1m' }
];

const uiLabDefaultTimeFoundationValue: HzTimeRangeToolbarValue = {
  timeRange: 'last-15m',
  from: 'now-1h',
  to: 'now',
  start: '2026-05-17T10:32:38',
  end: '2026-05-17T10:57:54',
  refresh: '30',
  tz: 'Asia/Shanghai'
};

const uiLabChartZoomPreviewValue: HzTimeRangeToolbarValue = {
  timeRange: 'last-1h',
  from: '2026-05-17 15:30:00',
  to: '2026-05-17 16:30:00',
  refresh: '30',
  tz: 'Asia/Shanghai'
};

const uiLabTraceTimeRangeControlValue = {
  timeRange: 'last-30m',
  refresh: '',
  live: 'false',
  tz: 'Asia/Shanghai'
};

function uiLabRefreshIdToTimeContextValue(value: string) {
  if (value === 'off') return '';
  const seconds = /^(\d+)s$/.exec(value);
  if (seconds) return seconds[1];
  const minutes = /^(\d+)m$/.exec(value);
  if (minutes) return String(Number(minutes[1]) * 60);
  return value;
}

function uiLabTimeContextRefreshToRefreshId(value: string | undefined) {
  if (!value) return 'off';
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`;
  }
  return value;
}

type UiLabTranslator = (key: string) => string;

function buildUiLabTimeFoundationLabels(t: UiLabTranslator) {
  return {
    preset: t('time.range.preset'),
    start: t('time.range.start'),
    end: t('time.range.end'),
    from: t('time.range.from'),
    to: t('time.range.to'),
    absoluteTitle: t('time.range.absolute-title'),
    quickRanges: t('time.range.quick-ranges'),
    relativeTitle: t('time.range.relative'),
    recentRanges: t('time.range.recent-ranges'),
    customRange: t('time.range.custom-range'),
    customName: t('time.range.custom-name'),
    saveCustomRange: t('time.range.save-custom-range'),
    deleteCustomRange: t('time.range.delete-custom-range'),
    validationValid: t('time.range.validation-valid'),
    validationInvalid: t('time.range.validation-invalid'),
    year: t('time.range.year'),
    month: t('time.range.month'),
    weekdays: [
      t('common.week.1'),
      t('common.week.2'),
      t('common.week.3'),
      t('common.week.4'),
      t('common.week.5'),
      t('common.week.6'),
      t('common.week.7')
    ],
    months: [
      t('common.month.1'),
      t('common.month.2'),
      t('common.month.3'),
      t('common.month.4'),
      t('common.month.5'),
      t('common.month.6'),
      t('common.month.7'),
      t('common.month.8'),
      t('common.month.9'),
      t('common.month.10'),
      t('common.month.11'),
      t('common.month.12')
    ],
    date: t('time.range.date'),
    hour: t('time.range.hour'),
    minute: t('time.range.minute'),
    second: t('time.range.second'),
    previousMonth: t('time.range.previous-month'),
    nextMonth: t('time.range.next-month'),
    previousYears: t('time.range.previous-years'),
    nextYears: t('time.range.next-years'),
    decrease: t('time.range.decrease'),
    increase: t('time.range.increase'),
    clear: t('common.clear'),
    absolutePlaceholder: t('time.range.unset'),
    refresh: t('time.range.refresh'),
    timezone: t('time.range.timezone'),
    apply: t('time.range.apply'),
    applyAria: t('time.range.apply-aria'),
    refreshAction: t('time.range.refresh-action'),
    reset: t('time.range.reset'),
    resetAria: t('time.range.reset-aria')
  };
}

const resultViewModes = [
  { id: 'list', label: 'List' },
  { id: 'timeseries', label: 'Time series' },
  { id: 'table', label: 'Table' }
];

const monitorFilterTypeOptions = [
  { value: '', label: 'All types' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'website', label: 'Website' },
  { value: 'linux', label: 'Linux' }
];

const monitorFilterStatusOptions = [
  { value: '', label: 'All status' },
  { value: '1', label: '正常' },
  { value: '2', label: '宕机' },
  { value: '0', label: '暂停' }
];

const initialResultColumns = [
  { id: 'resource', label: 'Resource', visible: true, pinned: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'collector', label: 'Collector', visible: true },
  { id: 'signal', label: 'Signal', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'latency', label: 'Latency', visible: true }
];

const collectorFieldStats = [
  { id: 'collector-a', label: 'collector-a', count: 58, tone: 'success' as const },
  { id: 'collector-b', label: 'collector-b', count: 44, tone: 'info' as const },
  { id: 'collector-c', label: 'collector-c', count: 26, tone: 'neutral' as const }
];

const signalVolumeBuckets = [
  {
    id: '14:00',
    label: '14:00',
    segments: [
      { id: 'metrics', label: 'metrics', value: 82, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 31, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 2, tone: 'warning' as const }
    ]
  },
  {
    id: '14:05',
    label: '14:05',
    segments: [
      { id: 'metrics', label: 'metrics', value: 77, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 40, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 5, tone: 'warning' as const }
    ]
  },
  {
    id: '14:10',
    label: '14:10',
    segments: [
      { id: 'metrics', label: 'metrics', value: 91, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 37, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 3, tone: 'warning' as const }
    ]
  },
  {
    id: '14:15',
    label: '14:15',
    segments: [
      { id: 'metrics', label: 'metrics', value: 84, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 46, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 7, tone: 'warning' as const }
    ]
  },
  {
    id: '14:20',
    label: '14:20',
    segments: [
      { id: 'metrics', label: 'metrics', value: 88, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 42, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 4, tone: 'warning' as const }
    ]
  },
  {
    id: '14:25',
    label: '14:25',
    segments: [
      { id: 'metrics', label: 'metrics', value: 93, tone: 'success' as const },
      { id: 'logs', label: 'logs', value: 35, tone: 'info' as const },
      { id: 'alerts', label: 'alerts', value: 2, tone: 'warning' as const }
    ]
  }
];

const collectorLatencySeries = [
  {
    id: 'p50',
    label: 'p50',
    tone: 'info' as const,
    points: [
      { label: '14:00', value: 42 },
      { label: '14:05', value: 51 },
      { label: '14:10', value: 48 },
      { label: '14:15', value: 56 },
      { label: '14:20', value: 52 },
      { label: '14:25', value: 49 }
    ]
  },
  {
    id: 'p95',
    label: 'p95',
    tone: 'warning' as const,
    points: [
      { label: '14:00', value: 92 },
      { label: '14:05', value: 118 },
      { label: '14:10', value: 104 },
      { label: '14:15', value: 126 },
      { label: '14:20', value: 111 },
      { label: '14:25', value: 96 }
    ]
  }
];

const monitorHistoryEChartsOption: EChartsOption = {
  backgroundColor: 'transparent',
  grid: { top: 16, right: 14, bottom: 44, left: 44 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0d121b',
    borderColor: '#273044',
    textStyle: { color: '#dbe4f0' }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['14:00', '14:05', '14:10', '14:15', '14:20', '14:25'],
    axisLine: { lineStyle: { color: '#273044' } },
    axisTick: { show: false },
    axisLabel: { color: '#8f99ab', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#8f99ab', fontSize: 10 },
    splitLine: { lineStyle: { color: '#1c2434' } }
  },
  dataZoom: [
    {
      type: 'slider',
      height: 16,
      bottom: 12,
      borderColor: '#273044',
      backgroundColor: '#080c12',
      fillerColor: 'rgba(124, 147, 219, 0.18)',
      handleStyle: { color: '#7c93db' },
      textStyle: { color: '#727b8c' }
    }
  ],
  series: [
    {
      name: 'origin',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      data: [118, 126, 121, 134, 128, 139],
      lineStyle: { color: '#7c93db', width: 1.4 },
      itemStyle: { color: '#7c93db' },
      areaStyle: { color: 'rgba(124, 147, 219, 0.12)' }
    }
  ]
};

const availabilityTimelineRows = [
  {
    id: 'mysql-prod-01',
    label: 'mysql-prod-01',
    states: [
      { id: 'available', label: 'available', tone: 'success' as const, width: 76 },
      { id: 'warning', label: 'warn', tone: 'warning' as const, width: 24 }
    ]
  },
  {
    id: 'linux-edge-03',
    label: 'linux-edge-03',
    states: [
      { id: 'collecting', label: 'collecting', tone: 'info' as const, width: 68 },
      { id: 'available', label: 'available', tone: 'success' as const, width: 32 }
    ]
  },
  {
    id: 'flink-yarn-main',
    label: 'flink-yarn-main',
    states: [
      { id: 'available', label: 'available', tone: 'success' as const, width: 52 },
      { id: 'warning', label: 'warning', tone: 'warning' as const, width: 36 },
      { id: 'down', label: 'down', tone: 'critical' as const, width: 12 }
    ]
  }
];

const latencyHeatmapBuckets = [
  {
    id: '14:00',
    label: '14:00',
    cells: [
      { id: 'under-50', label: '<50ms', value: 24, tone: 'success' as const },
      { id: '50-100', label: '50-100', value: 18, tone: 'info' as const },
      { id: '100-250', label: '100-250', value: 7, tone: 'warning' as const },
      { id: 'over-250', label: '>250ms', value: 1, tone: 'critical' as const }
    ]
  },
  {
    id: '14:05',
    label: '14:05',
    cells: [
      { id: 'under-50', label: '<50ms', value: 21, tone: 'success' as const },
      { id: '50-100', label: '50-100', value: 22, tone: 'info' as const },
      { id: '100-250', label: '100-250', value: 9, tone: 'warning' as const },
      { id: 'over-250', label: '>250ms', value: 4, tone: 'critical' as const }
    ]
  },
  {
    id: '14:10',
    label: '14:10',
    cells: [
      { id: 'under-50', label: '<50ms', value: 19, tone: 'success' as const },
      { id: '50-100', label: '50-100', value: 25, tone: 'info' as const },
      { id: '100-250', label: '100-250', value: 11, tone: 'warning' as const },
      { id: 'over-250', label: '>250ms', value: 5, tone: 'critical' as const }
    ]
  },
  {
    id: '14:15',
    label: '14:15',
    cells: [
      { id: 'under-50', label: '<50ms', value: 16, tone: 'success' as const },
      { id: '50-100', label: '50-100', value: 27, tone: 'info' as const },
      { id: '100-250', label: '100-250', value: 14, tone: 'warning' as const },
      { id: 'over-250', label: '>250ms', value: 7, tone: 'critical' as const }
    ]
  },
  {
    id: '14:20',
    label: '14:20',
    cells: [
      { id: 'under-50', label: '<50ms', value: 22, tone: 'success' as const },
      { id: '50-100', label: '50-100', value: 20, tone: 'info' as const },
      { id: '100-250', label: '100-250', value: 10, tone: 'warning' as const },
      { id: 'over-250', label: '>250ms', value: 3, tone: 'critical' as const }
    ]
  }
];

const logStreamRows = [
  {
    id: 'log-warn-1',
    timestamp: '14:14:08',
    level: 'warn',
    source: 'collector-a',
    message: 'mysql-prod-01 response time above threshold',
    attributes: 'resource.type=mysql'
  },
  {
    id: 'log-info-1',
    timestamp: '14:14:12',
    level: 'info',
    source: 'collector-b',
    message: 'linux-edge-03 metrics batch accepted',
    attributes: 'signal=metrics'
  },
  {
    id: 'log-error-1',
    timestamp: '14:14:18',
    level: 'error',
    source: 'collector-a',
    message: 'flink-yarn-main scrape timeout',
    attributes: 'resource.type=flink'
  }
];

const logVolumeBuckets = [
  {
    id: '14:00',
    label: '14:00',
    segments: [
      { id: 'info', label: 'info', value: 42, tone: 'info' as const },
      { id: 'warn', label: 'warn', value: 6, tone: 'warning' as const },
      { id: 'error', label: 'error', value: 2, tone: 'critical' as const }
    ]
  },
  {
    id: '14:05',
    label: '14:05',
    segments: [
      { id: 'info', label: 'info', value: 36, tone: 'info' as const },
      { id: 'warn', label: 'warn', value: 11, tone: 'warning' as const },
      { id: 'error', label: 'error', value: 5, tone: 'critical' as const }
    ]
  },
  {
    id: '14:10',
    label: '14:10',
    segments: [
      { id: 'info', label: 'info', value: 45, tone: 'info' as const },
      { id: 'warn', label: 'warn', value: 8, tone: 'warning' as const },
      { id: 'error', label: 'error', value: 3, tone: 'critical' as const }
    ]
  },
  {
    id: '14:15',
    label: '14:15',
    segments: [
      { id: 'info', label: 'info', value: 33, tone: 'info' as const },
      { id: 'warn', label: 'warn', value: 15, tone: 'warning' as const },
      { id: 'error', label: 'error', value: 7, tone: 'critical' as const }
    ]
  }
];

const logLevelDistribution = [
  { id: 'debug', label: 'debug', value: 12, tone: 'neutral' as const },
  { id: 'info', label: 'info', value: 156, tone: 'info' as const },
  { id: 'warn', label: 'warn', value: 40, tone: 'warning' as const },
  { id: 'error', label: 'error', value: 17, tone: 'critical' as const }
];

const traceWaterfallSpans = [
  { id: 'api', service: 'hertzbeat-api', operation: 'POST /api/monitors/detect', startMs: 0, durationMs: 126, selfMs: 18, depth: 0, tone: 'info' as const },
  { id: 'scheduler', service: 'scheduler', operation: 'dispatch.collector-a', startMs: 18, durationMs: 22, selfMs: 9, depth: 1, parentId: 'api', tone: 'neutral' as const },
  { id: 'collector', service: 'collector-a', operation: 'mysql.collect', startMs: 42, durationMs: 68, selfMs: 52, depth: 1, parentId: 'api', status: 'retrying', tone: 'warning' as const },
  { id: 'warehouse', service: 'warehouse', operation: 'greptime.write', startMs: 104, durationMs: 18, selfMs: 12, depth: 2, parentId: 'collector', tone: 'success' as const }
];

const traceSpanEvents = [
  {
    id: 'retry',
    spanId: 'collector',
    timestampMs: 68,
    name: 'mysql.connection.retry',
    tone: 'warning' as const,
    attributes: [
      { label: 'attempt', value: '2' },
      { label: 'peer', value: '10.0.4.21:3306' }
    ]
  },
  {
    id: 'slow-query',
    spanId: 'collector',
    timestampMs: 96,
    name: 'db.statement.slow',
    tone: 'critical' as const,
    attributes: [
      { label: 'statement', value: 'select monitor_history' },
      { label: 'elapsed', value: '120ms', tone: 'critical' as const }
    ]
  },
  {
    id: 'write-ok',
    spanId: 'warehouse',
    timestampMs: 118,
    name: 'greptime.write.ack',
    tone: 'success' as const,
    attributes: [{ label: 'rows', value: '24' }]
  }
];

const traceServiceNodes = [
  { id: 'api', label: 'hertzbeat-api', role: 'entrypoint', value: '126ms', tone: 'info' as const },
  { id: 'scheduler', label: 'scheduler', role: 'dispatch', value: '22ms', tone: 'neutral' as const },
  { id: 'collector', label: 'collector-a', role: 'mysql collector', value: '68ms', tone: 'warning' as const },
  { id: 'warehouse', label: 'warehouse', role: 'greptime write', value: '18ms', tone: 'success' as const }
];

const traceServiceEdges = [
  { id: 'api-scheduler', from: 'api', to: 'scheduler', label: 'dispatch.collector-a', latencyMs: 22, calls: 128, errorRate: 0, tone: 'neutral' as const },
  { id: 'api-collector', from: 'api', to: 'collector', label: 'mysql.collect', latencyMs: 68, calls: 128, errorRate: 3.1, tone: 'warning' as const },
  { id: 'collector-warehouse', from: 'collector', to: 'warehouse', label: 'greptime.write', latencyMs: 18, calls: 124, errorRate: 0, tone: 'success' as const }
];

const topologyMetricRows = [
  {
    id: 'scale-edge-420-421',
    sourceNodeId: 'scale-svc-420',
    targetNodeId: 'scale-svc-421',
    source: 'hertzbeat-api',
    target: 'collector-a',
    relationType: 'trace-call',
    sourceKind: 'otlp-trace-call',
    requestRatePerSecond: 2.13,
    requestCount: 128,
    errorRate: 0.031,
    errorCount: 4,
    latencyP95Ms: 96,
    latencyAvgMs: 42,
    evidenceBadges: ['trace', 'alert'],
    tone: 'warning' as const
  },
  {
    id: 'scale-edge-421-422',
    sourceNodeId: 'scale-svc-421',
    targetNodeId: 'scale-svc-422',
    source: 'collector-a',
    target: 'warehouse',
    relationType: 'trace-call',
    sourceKind: 'otlp-trace-call',
    requestRatePerSecond: 2.06,
    requestCount: 124,
    errorRate: 0,
    errorCount: 0,
    latencyP95Ms: 22,
    latencyAvgMs: 13,
    evidenceBadges: ['trace'],
    tone: 'success' as const
  },
  {
    id: 'scale-edge-020-021',
    sourceNodeId: 'scale-svc-020',
    targetNodeId: 'scale-svc-021',
    source: 'hertzbeat-api',
    target: 'scheduler',
    relationType: 'monitor-ownership',
    sourceKind: 'monitor-ownership',
    requestRatePerSecond: 1.8,
    requestCount: 108,
    errorRate: 0,
    errorCount: 0,
    latencyP95Ms: 31,
    latencyAvgMs: 18,
    evidenceBadges: ['monitor'],
    tone: 'neutral' as const
  }
];

const traceListItems = [
  {
    id: 'trace-1428',
    service: 'hertzbeat-api',
    operation: 'POST /api/monitors/detect',
    startTime: '14:28:04',
    durationMs: 126,
    spanCount: 4,
    errorCount: 1,
    rootCause: 'collector retry · mysql connection',
    tone: 'warning' as const
  },
  {
    id: 'trace-1427',
    service: 'collector-a',
    operation: 'mysql.collect',
    startTime: '14:27:45',
    durationMs: 74,
    spanCount: 3,
    errorCount: 0,
    rootCause: 'slow query recovered',
    tone: 'success' as const
  },
  {
    id: 'trace-1426',
    service: 'warehouse',
    operation: 'greptime.write',
    startTime: '14:26:12',
    durationMs: 41,
    spanCount: 2,
    errorCount: 0,
    tone: 'info' as const
  }
];

const traceLatencyBuckets = [
  { id: 'under-50', label: '<50ms', value: 19, tone: 'success' as const },
  { id: '50-100', label: '50-100ms', value: 28, tone: 'info' as const },
  { id: '100-250', label: '100-250ms', value: 16, tone: 'warning' as const },
  { id: 'over-250', label: '>250ms', value: 5, tone: 'critical' as const }
];

const queryHistoryItems = [
  {
    id: 'run-1428',
    query: "collector IN 'collector-a' AND latency > '80ms'",
    time: '14:28',
    duration: '118ms',
    resultCount: 24,
    tone: 'warning' as const,
    active: true,
    meta: 'manual drilldown'
  },
  {
    id: 'run-1419',
    query: "resource.type IN 'mysql' AND status != 'down'",
    time: '14:19',
    duration: '72ms',
    resultCount: 128,
    tone: 'success' as const,
    meta: 'baseline'
  },
  {
    id: 'run-1406',
    query: "status IN 'warning, collecting'",
    time: '14:06',
    duration: '96ms',
    resultCount: 7,
    tone: 'critical' as const,
    meta: 'alert triage'
  }
];

const savedViewCompareDeltas = [
  { id: 'active-monitors', label: 'Active monitors', value: '-12', tone: 'warning' as const },
  { id: 'open-alerts', label: 'Open alerts', value: '+7', tone: 'critical' as const },
  { id: 'p95-latency', label: 'Collector p95', value: '+46ms', tone: 'warning' as const }
];

const investigationNotes = [
  {
    id: 'note-greptime-lag',
    author: 'SRE',
    time: '14:31',
    body: 'collector-a p95 spike aligns with Greptime write lag; keep metrics/logs in window before opening trace-only drilldown.',
    tone: 'warning' as const,
    tags: ['collector-a', 'greptime', 'p95']
  },
  {
    id: 'note-template-context',
    author: 'Monitor owner',
    time: '14:22',
    body: 'mysql-prod-01 template changed responseTime threshold from 120ms to 180ms yesterday.',
    tone: 'info' as const,
    tags: ['mysql-prod-01', 'threshold']
  }
];

const commandPaletteItems = [
  {
    id: 'open-entity',
    title: 'Open entity mysql-prod-01',
    description: 'Carry query, time range, and field context into entity detail.',
    shortcut: 'G E',
    tone: 'info' as const,
    active: true,
    meta: 'entity'
  },
  {
    id: 'open-alert-evidence',
    title: 'Open alert evidence',
    description: 'View active alerts with the same collector and resource filters.',
    shortcut: 'G A',
    tone: 'critical' as const,
    meta: '7 open'
  },
  {
    id: 'create-runbook-step',
    title: 'Create runbook step',
    description: 'Attach current query, notes, and YML template context.',
    shortcut: 'R N',
    tone: 'warning' as const,
    meta: 'safe action'
  }
];

const contextHandoffTargets = [
  {
    id: 'entity-detail',
    label: 'Entity detail',
    description: 'Metrics, logs, traces, alerts, owner, and topology context.',
    meta: '5 signals',
    tone: 'info' as const,
    current: true
  },
  {
    id: 'alert-evidence',
    label: 'Alert evidence',
    description: 'Open alerts constrained to the same entity and time window.',
    meta: '7 open',
    tone: 'critical' as const
  },
  {
    id: 'topology',
    label: 'Topology',
    description: 'Collector, database, and downstream dependency neighborhood.',
    meta: '3 hops',
    tone: 'neutral' as const
  },
  {
    id: 'yaml-template',
    label: 'YAML template',
    description: 'Open app-mysql.yml beside the current investigation evidence.',
    meta: 'schema valid',
    tone: 'success' as const
  }
];

const incidentWorkbenchRows = [
  {
    id: 'inc-204',
    title: 'Checkout latency spike',
    severity: 'critical' as const,
    stage: 'mitigating',
    service: 'checkout-api',
    owner: 'commerce-sre',
    openedAt: '2026-05-23 09:10',
    blastRadius: 'prod checkout'
  },
  {
    id: 'inc-203',
    title: 'Collector write lag',
    severity: 'warning' as const,
    stage: 'monitoring',
    service: 'collector-a',
    owner: 'observability',
    openedAt: '2026-05-23 08:42',
    blastRadius: 'metrics ingest'
  }
];

const incidentTimelineRows = [
  {
    id: 'incident-event-1',
    title: 'Mitigation started',
    copy: 'Status page update added and trace evidence attached.',
    meta: '09:14',
    tone: 'warning' as const
  },
  {
    id: 'incident-event-2',
    title: 'Owner acknowledged',
    copy: 'Commerce SRE took primary response ownership.',
    meta: '09:12',
    tone: 'info' as const
  }
];

const incidentOwnershipRows = [
  {
    id: 'incident-owner-commerce',
    owner: 'commerce-sre',
    queue: 'primary',
    copy: 'Owns customer checkout mitigation.',
    meta: 'on call',
    tone: 'info' as const
  },
  {
    id: 'incident-owner-observability',
    owner: 'observability',
    queue: 'support',
    copy: 'Keeps trace/log evidence pinned to the incident.',
    meta: 'handoff',
    tone: 'neutral' as const
  }
];

const inspectorSections = [
  {
    id: 'evidence',
    title: 'Evidence',
    description: 'Current selection keeps metrics, logs, traces, and template context together.',
    items: [
      { id: 'metric-p95', label: 'Metric threshold', value: 'responseTime p95 = 118ms', meta: 'last 15m', tone: 'warning' as const },
      { id: 'log-slow-query', label: 'Log signal', value: 'slow query detected on mysql-prod-01', meta: '14:31', tone: 'critical' as const },
      { id: 'trace-collector', label: 'Trace span', value: 'mysql.collect duration 72ms', meta: 'collector-a', tone: 'info' as const }
    ]
  },
  {
    id: 'safe-actions',
    title: 'Safe actions',
    description: 'Operator commands stay explicit and reviewable before execution.',
    items: [
      { id: 'open-runbook', label: 'Open runbook', value: 'Attach query, notes, and selected template.', meta: 'safe', tone: 'success' as const },
      { id: 'create-alert', label: 'Create alert draft', value: 'Use resource.type, collector, and current time range.', meta: 'draft', tone: 'warning' as const }
    ]
  }
];

function stringifyFilterValue(value: React.ReactNode) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function formatFilterQuery(clauses: HzFilterClause[], logic: HzFilterBuilderLogic = 'AND') {
  return clauses
    .map(clause => {
      const value = stringifyFilterValue(clause.value);
      return clause.operator === 'EXISTS' ? `${clause.field} EXISTS` : `${clause.field} ${clause.operator} '${value}'`;
    })
    .join(` ${logic} `);
}

function createFacetClause(facet: HzFilterFacet, value: HzFilterFacetValue, operator: 'IN' | 'NOT_IN'): HzFilterClause {
  const label = stringifyFilterValue(value.label) || value.id;
  return {
    id: `${facet.id}-${operator}-${value.id}`,
    field: String(facet.label),
    operator,
    value: label
  };
}

function createFieldClause(field: string, value: string, operator: 'IN' | 'NOT_IN'): HzFilterClause {
  return {
    id: `${field}-${operator}-${value}`,
    field,
    operator,
    value
  };
}

const defaultYaml = `app: mysql
name:
  zh-CN: MySQL数据库
  en-US: MySQL Database
params:
  - field: host
    type: host
    required: true
metrics:
  - name: basic
    priority: 0
    fields:
      - field: responseTime
        type: number
      - field: status
        type: string`;

function findTemplate(categories: HzTemplateCategory[], id: string) {
  return categories.flatMap(category => category.items).find(item => item.id === id) || categories[0]?.items[0];
}

export default function HertzBeatUiLabPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = React.useState('monitors');
  const [typePickerOpen, setTypePickerOpen] = React.useState(false);
  const [monitorExportDialogOpen, setMonitorExportDialogOpen] = React.useState(false);
  const [alertSettingExportDialogOpen, setAlertSettingExportDialogOpen] = React.useState(false);
  const [typeSearch, setTypeSearch] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('mysql');
  const [templateSearch, setTemplateSearch] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState('mysql');
  const [attributeSearch, setAttributeSearch] = React.useState('');
  const [savedViews, setSavedViews] = React.useState(savedFilterViewPresets);
  const [activeSavedViewId, setActiveSavedViewId] = React.useState('baseline');
  const [filterClauses, setFilterClauses] = React.useState<HzFilterClause[]>(initialFilterClauses);
  const [filterLogic, setFilterLogic] = React.useState<HzFilterBuilderLogic>('AND');
  const [query, setQuery] = React.useState(formatFilterQuery(initialFilterClauses));
  const [timeRangeId, setTimeRangeId] = React.useState('15m');
  const [refreshIntervalId, setRefreshIntervalId] = React.useState('30s');
  const [monitorDetailRefreshIntervalId, setMonitorDetailRefreshIntervalId] = React.useState('90s');
  const [timeFoundationValue, setTimeFoundationValue] = React.useState<HzTimeRangeToolbarValue>(uiLabDefaultTimeFoundationValue);
  const [timeFoundationPreviewSource, setTimeFoundationPreviewSource] = React.useState<string | undefined>('chart-datazoom');
  const [viewModeId, setViewModeId] = React.useState('list');
  const [resultColumns, setResultColumns] = React.useState(initialResultColumns);
  const [monitorFilterSearch, setMonitorFilterSearch] = React.useState('mysql');
  const [monitorFilterLabels, setMonitorFilterLabels] = React.useState('team=platform');
  const [monitorFilterType, setMonitorFilterType] = React.useState('mysql');
  const [monitorFilterStatus, setMonitorFilterStatus] = React.useState('');
  const [monitorDetailTabId, setMonitorDetailTabId] = React.useState('realtime');
  const [monitorEditorAdvancedOpen, setMonitorEditorAdvancedOpen] = React.useState(false);
  const [noticeRuleFilterAllDemo, setNoticeRuleFilterAllDemo] = React.useState(true);
  const [monitorRowActionMenuOpen, setMonitorRowActionMenuOpen] = React.useState(false);
  const [pluginToolbarActionMenuOpen, setPluginToolbarActionMenuOpen] = React.useState(false);
  const [pluginRowActionMenuOpen, setPluginRowActionMenuOpen] = React.useState(false);
  const [collectorRowActionMenuOpen, setCollectorRowActionMenuOpen] = React.useState(false);
  const [historyAggregationModeId, setHistoryAggregationModeId] = React.useState('raw');
  const [historyFullscreenOpen, setHistoryFullscreenOpen] = React.useState(false);
  const [favoriteMode, setFavoriteMode] = React.useState('realtime');
  const [selectedSignalBucketId, setSelectedSignalBucketId] = React.useState('14:15');
  const [selectedLatencyPointId, setSelectedLatencyPointId] = React.useState('p95:14:15');
  const [hiddenSignalSegmentIds, setHiddenSignalSegmentIds] = React.useState<string[]>([]);
  const [hiddenLatencySeriesIds, setHiddenLatencySeriesIds] = React.useState<string[]>([]);
  const [chartWindowSource, setChartWindowSource] = React.useState('signal-volume');
  const [contextMessage, setContextMessage] = React.useState('上下文窗口: collector-a · 最近 15 分钟 · metrics/logs');
  const [topologyCompanionCollapsedSections, setTopologyCompanionCollapsedSections] = React.useState<Record<string, boolean>>({
    timeline: true
  });
  const [topologyMetricWindowFilter, setTopologyMetricWindowFilter] = React.useState<HzTopologyMetricTableRenderWindowFilter>('all');
  const [topologyG6LabSelection, setTopologyG6LabSelection] = React.useState({
    nodeId: 'svc-checkout',
    edgeId: 'web-checkout',
    source: 'initial'
  });
  const [topologyG6ScaleLabSelection, setTopologyG6ScaleLabSelection] = React.useState<{
    nodeId?: string;
    edgeId?: string;
    source: string;
  }>({
    nodeId: 'scale-svc-420',
    source: 'initial'
  });
  const [selectedMonitorName, setSelectedMonitorName] = React.useState(monitorRows[0].name);
  const [selectedTraceSpanId, setSelectedTraceSpanId] = React.useState('collector');
  const [selectedTraceId, setSelectedTraceId] = React.useState('trace-1428');
  const [traceDetailOpen, setTraceDetailOpen] = React.useState(false);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [mutationStatus, setMutationStatus] = React.useState<'clean' | 'dirty' | 'saving' | 'saved' | 'failed'>('dirty');
  const [dangerConfirmOpen, setDangerConfirmOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const handleTopologyCompanionCollapsedChange = React.useCallback((sectionId: string, collapsed: boolean) => {
    setTopologyCompanionCollapsedSections(current => ({ ...current, [sectionId]: collapsed }));
    setContextMessage(`Topology companion ${sectionId}: ${collapsed ? 'collapsed' : 'expanded'}`);
  }, []);
  const handleTopologyG6LabNodeSelect = React.useCallback((nodeId: string) => {
    setTopologyG6LabSelection({ nodeId, edgeId: '', source: 'node-click' });
    setContextMessage(`Topology G6 node selected: ${nodeId}`);
  }, []);
  const handleTopologyG6LabEdgeSelect = React.useCallback((edgeId: string) => {
    setTopologyG6LabSelection({ nodeId: '', edgeId, source: 'edge-click' });
    setContextMessage(`Topology G6 edge selected: ${edgeId}`);
  }, []);
  const handleTopologyG6ScaleLabNodeSelect = React.useCallback((nodeId: string) => {
    setTopologyG6ScaleLabSelection({ nodeId, source: 'node-click' });
    setContextMessage(`Topology G6 scale node selected: ${nodeId}`);
  }, []);
  const handleTopologyG6ScaleLabEdgeSelect = React.useCallback((edgeId: string) => {
    setTopologyG6ScaleLabSelection({ edgeId, source: 'edge-click' });
    setContextMessage(`Topology G6 scale edge selected: ${edgeId}`);
  }, []);
  const handleTopologyG6ScaleLabTableRowSelect = React.useCallback((row: HzTopologyMetricRow) => {
    setTopologyG6ScaleLabSelection({ edgeId: row.id, source: 'table-row-click' });
    setContextMessage(`Topology G6 scale table edge selected: ${row.id}`);
  }, []);
  const timeFoundationPresets = React.useMemo(
    () => [
      { value: 'last-15m', label: t('time.range.preset.last-15m') },
      { value: 'last-1h', label: t('time.range.preset.last-1h') },
      { value: 'last-6h', label: t('time.range.preset.last-6h') },
      { value: 'last-24h', label: t('time.range.preset.last-24h') }
    ],
    [t]
  );
  const timeFoundationRefreshOptions = React.useMemo(
    () =>
      resultRefreshIntervals.map(option => ({
        value: uiLabRefreshIdToTimeContextValue(option.id),
        label: option.id === 'off' ? t('time.range.manual-refresh') : option.label
      })),
    [t]
  );
  const timeFoundationRecentRanges = React.useMemo(
    () => [
      {
        id: 'ui-lab-now-1h',
        label: t('ui-lab.time-range.previous-query'),
        from: 'now-1h',
        to: 'now',
        refresh: '30',
        tz: 'Asia/Shanghai'
      }
    ],
    [t]
  );
  const timeFoundationCustomRanges = React.useMemo(
    () => [
      {
        id: 'ui-lab-release-window',
        label: t('ui-lab.time-range.release-window'),
        from: 'now-2h',
        to: 'now',
        refresh: '30',
        tz: 'Asia/Shanghai'
      }
    ],
    [t]
  );
  const timeFoundationLabels = React.useMemo(() => buildUiLabTimeFoundationLabels(t), [t]);
  const [toastItems, setToastItems] = React.useState<HzToastItem[]>([
    { id: 'template-dirty', tone: 'warning' as const, title: 'Template draft changed', description: 'Review schema and save before applying.', meta: 'local' }
  ]);
  const [code, setCode] = React.useState(defaultYaml);
  const selectedTypeItem = findTemplate(monitorTypeCategories, selectedType);
  const selectedTemplateItem = findTemplate(yamlCategories, selectedTemplate);
  const selectedMonitor = monitorRows.find(row => row.name === selectedMonitorName) || monitorRows[0];
  const selectedTrace = traceListItems.find(trace => trace.id === selectedTraceId) || traceListItems[0];
  const selectedTraceSpan = traceWaterfallSpans.find(span => span.id === selectedTraceSpanId) || traceWaterfallSpans[0];
  const selectedTraceSpanEvents = traceSpanEvents.filter(event => event.spanId === selectedTraceSpan.id);
  const selectedSignalBucket = signalVolumeBuckets.find(bucket => bucket.id === selectedSignalBucketId) || signalVolumeBuckets[0];
  const selectedLatencyPoint = collectorLatencySeries.flatMap(series =>
    series.points.map(point => ({
      id: `${series.id}:${point.label}`,
      series,
      point
    }))
  ).find(item => item.id === selectedLatencyPointId);
  const selectedInspectorFacts = [
    { label: 'Latency p95', value: selectedMonitor.latency, meta: 'warn at 120ms', tone: selectedMonitor.tone },
    { label: 'Open alerts', value: selectedMonitor.tone === 'warning' ? '7' : '0', meta: selectedMonitor.tone === 'warning' ? '2 critical' : 'none', tone: selectedMonitor.tone },
    { label: 'Collector', value: selectedMonitor.collector, meta: '58 resources', tone: 'info' as const },
    { label: 'Template', value: `app-${selectedMonitor.app.toLowerCase().replaceAll(' ', '_')}.yml`, meta: 'schema valid', tone: 'success' as const }
  ];
  const selectedTraceFacts = [
    { label: 'Duration', value: `${selectedTrace.durationMs}ms`, meta: 'global scale', tone: selectedTrace.tone },
    { label: 'Spans', value: selectedTrace.spanCount, meta: 'current trace', tone: 'info' as const },
    { label: 'Errors', value: selectedTrace.errorCount || 0, meta: selectedTrace.errorCount ? 'needs review' : 'clean', tone: selectedTrace.errorCount ? 'warning' as const : 'success' as const },
    { label: 'Start', value: selectedTrace.startTime, meta: 'selected window', tone: 'neutral' as const }
  ];
  const yamlValidationIssues = code.includes('app:')
    ? [{ id: 'schema-valid', field: 'app-mysql.yml', message: 'Schema valid for local draft.', tone: 'success' as const }]
    : [{ id: 'schema-missing-app', field: 'app', message: 'Template app key is required before save.', tone: 'critical' as const }];
  const yamlFeedbackTone = mutationStatus === 'failed' ? 'critical' : mutationStatus === 'saved' ? 'success' : code.includes('app:') ? 'success' : 'critical';
  const yamlFeedbackTitle = mutationStatus === 'failed' ? 'Save failed' : mutationStatus === 'saved' ? 'Saved locally' : code.includes('app:') ? 'Schema valid' : 'Schema error';
  const yamlFeedbackDescription =
    mutationStatus === 'failed'
      ? 'Collector rejected the draft. Keep editing or discard changes.'
      : mutationStatus === 'saved'
        ? 'Template draft is ready for apply review.'
        : code.includes('app:')
          ? 'app-mysql.yml is locally valid and has unsaved changes.'
          : 'Add the app key before saving this template.';
  const addFilterClause = React.useCallback((clause: HzFilterClause) => {
    setFilterClauses(previous => {
      const next = [clause, ...previous.filter(item => item.id !== clause.id)];
      setQuery(formatFilterQuery(next, filterLogic));
      return next;
    });
    setActiveSavedViewId('custom');
  }, [filterLogic]);
  const removeFilterClause = React.useCallback((id: string) => {
    setFilterClauses(previous => {
      const next = previous.filter(item => item.id !== id);
      setQuery(formatFilterQuery(next, filterLogic));
      return next;
    });
  }, [filterLogic]);
  const clearFilterClauses = React.useCallback(() => {
    setFilterClauses([]);
    setQuery('');
    setActiveSavedViewId('custom');
  }, []);
  const changeFilterLogic = React.useCallback(
    (logic: HzFilterBuilderLogic) => {
      setFilterLogic(logic);
      setQuery(formatFilterQuery(filterClauses, logic));
      setActiveSavedViewId('custom');
    },
    [filterClauses]
  );
  const selectSavedView = React.useCallback(
    (id: string) => {
      const view = savedViews.find(item => item.id === id);
      if (!view) return;
      setActiveSavedViewId(id);
      setFilterClauses(view.clauses);
      setFilterLogic('AND');
      setQuery(formatFilterQuery(view.clauses));
    },
    [savedViews]
  );
  const saveCurrentView = React.useCallback(() => {
    const currentView = {
      id: 'custom',
      label: 'Current view',
      description: `${filterClauses.length} filters · ${groupByFilters.length} groups`,
      clauses: filterClauses
    };
    setSavedViews(previous => [currentView, ...previous.filter(item => item.id !== 'custom')]);
    setActiveSavedViewId('custom');
  }, [filterClauses]);
  const toggleResultColumn = React.useCallback((id: string) => {
    setResultColumns(previous =>
      previous.map(column =>
        column.id === id
          ? {
              ...column,
              visible: !column.visible,
              pinned: column.visible ? false : column.pinned
            }
          : column
      )
    );
  }, []);
  const pinResultColumn = React.useCallback((id: string) => {
    setResultColumns(previous =>
      previous.map(column =>
        column.id === id
          ? {
              ...column,
              visible: true,
              pinned: !column.pinned
            }
          : column
      )
    );
  }, []);
  const addBuilderClause = React.useCallback(
    ({ field, operator, value }: { field: string; operator: string; value: string }) => {
      const normalizedValue = value || (operator === 'EXISTS' ? 'present' : '');
      if (!normalizedValue && operator !== 'EXISTS') return;
      addFilterClause({
        id: `${field}-${operator}-${normalizedValue}`,
        field,
        operator,
        value: normalizedValue
      });
    },
    [addFilterClause]
  );
  const changeYamlCode = React.useCallback((value: string) => {
    setCode(value);
    setMutationStatus('dirty');
    setToastItems([{ id: 'template-dirty', tone: 'warning', title: 'Template draft changed', description: 'Review schema and save before applying.', meta: 'local' }]);
  }, []);
  const saveYamlDraft = React.useCallback(() => {
    if (!code.includes('app:')) {
      setMutationStatus('failed');
      setToastItems([{ id: 'template-save-failed', tone: 'critical', title: 'Save failed', description: 'Template app key is required.' }]);
      return;
    }
    setMutationStatus('saved');
    setToastItems([{ id: 'template-saved', tone: 'success', title: 'Template saved', description: 'app-mysql.yml updated locally.', meta: 'now' }]);
  }, [code]);
  const discardYamlDraft = React.useCallback(() => {
    setCode(defaultYaml);
    setMutationStatus('clean');
    setToastItems([{ id: 'template-discarded', tone: 'neutral', title: 'Draft discarded', description: 'YAML reverted to the last saved baseline.' }]);
  }, []);
  const resetYamlDraft = React.useCallback(() => {
    setCode(defaultYaml);
    setMutationStatus('clean');
    setDangerConfirmOpen(false);
    setToastItems([{ id: 'template-reset', tone: 'warning', title: 'YAML draft reset', description: 'Local edits were removed from the lab.' }]);
  }, []);
  const visibleResultColumnIds = new Set(resultColumns.filter(column => column.visible).map(column => column.id));
  const resultColumnDefinitions = [
    { key: 'resource', header: 'Resource', render: row => <span className="font-semibold">{row.name}</span> },
    { key: 'type', header: 'Type', render: row => row.app },
    {
      key: 'collector',
      header: 'Collector',
      render: row => (
        <HzFieldValueActions
          field="collector"
          value={row.collector}
          onInclude={() => addFilterClause(createFieldClause('collector', row.collector, 'IN'))}
          onExclude={() => addFilterClause(createFieldClause('collector', row.collector, 'NOT_IN'))}
        />
      )
    },
    {
      key: 'signal',
      header: 'Signal',
      render: row => (
        <HzFieldValueActions
          field="signal"
          value={<span className="font-mono text-[#9ca3af]">{row.signal}</span>}
          valueLabel={row.signal}
          onInclude={() => addFilterClause(createFieldClause('signal', row.signal, 'IN'))}
          onExclude={() => addFilterClause(createFieldClause('signal', row.signal, 'NOT_IN'))}
        />
      )
    },
    { key: 'status', header: 'Status', render: row => <HzStatusBadge tone={row.tone}>{row.status}</HzStatusBadge> },
    { key: 'latency', header: 'Latency', render: row => <span className="font-mono text-[#cbd5e1]">{row.latency}</span> }
  ].filter(column => visibleResultColumnIds.has(column.key));

  return (
    <HzExplorerFrame
      eyebrow="@hertzbeat/ui explorer"
      title="HertzBeat UI Lab"
      description="统一查看监控资源、模板目录、采集状态与 YAML 定义。"
      mainId="hz-ui-lab-main"
      mainLabel="HertzBeat UI Lab workbench"
      filterRailLabel="UI lab filters"
      actions={
        <>
          <HzIconButton
            label="Refresh monitor list"
            intent="ghost"
            onClick={() => setContextMessage('Monitor list refresh')}
            data-hz-ui-lab-monitor-manual-refresh="shared"
            data-monitor-manual-refresh-owner="hertzbeat-ui-icon-button"
            data-monitor-manual-refresh-action="sync"
          >
            <RefreshCw size={13} />
          </HzIconButton>
          <HzButton
            intent="secondary"
            onClick={() => setTypePickerOpen(true)}
            data-hz-ui-lab-monitor-app-picker-trigger="shared"
            data-monitor-app-picker-trigger-owner="hertzbeat-ui-button"
          >
            <Plus size={14} />
            新增监控
          </HzButton>
          <HzButton intent="primary">
            <CheckCircle2 size={14} />
            UI 基线
          </HzButton>
        </>
      }
      tabs={
        <HzSegmentedTabs
          activeId={activeTab}
          onSelect={setActiveTab}
          items={[
            { id: 'monitors', label: 'Monitors', count: 128 },
            { id: 'templates', label: 'Templates', count: 42 },
            { id: 'signals', label: 'Signals', count: 3 }
          ]}
        />
      }
      filterRail={
        <HzFilterWorkbench
          activeClauses={filterClauses}
          builderFields={filterBuilderFields}
          builderOperators={filterBuilderOperators}
          builderLogic={filterLogic}
          groupBy={groupByFilters}
          savedViews={savedViews.map(view => ({
            id: view.id,
            label: view.label,
            description: view.description,
            active: view.id === activeSavedViewId
          }))}
          queryPlan={filterQueryPlan}
          quickGroups={filterGroups}
          facetGroups={filterFacetGroups}
          attributeSearch={attributeSearch}
          onAttributeSearchChange={setAttributeSearch}
          onIncludeValue={(facet, value) => addFilterClause(createFacetClause(facet, value, 'IN'))}
          onExcludeValue={(facet, value) => addFilterClause(createFacetClause(facet, value, 'NOT_IN'))}
          onBuilderLogicChange={changeFilterLogic}
          onAddBuilderClause={addBuilderClause}
          onSelectSavedView={selectSavedView}
          onSaveCurrentView={saveCurrentView}
          onClearClause={removeFilterClause}
          onClearAll={clearFilterClauses}
        />
      }
      queryBar={
        <div className="grid min-w-0" data-hz-ui-lab-monitor-filter-bar="shared">
          <section
            className="grid min-w-0 gap-2 border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-2"
            data-hz-ui-lab-control-baseline="28-button-32-field-tiers"
            data-hz-control-baseline-kind="primitive-form-action"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#727b8c]">
                28px buttons · 32px fields
              </span>
              <HzButton size="sm" data-hz-control-baseline-component="HzButton">
                Secondary
              </HzButton>
              <HzButton size="sm" intent="ghost" data-hz-control-baseline-component="HzButton">
                Ghost
              </HzButton>
              <HzButtonLink
                href="#ui-lab-history-download"
                size="xs"
                data-hz-ui-lab-button-link="shared"
                data-hz-ui-lab-button-link-component="component-ready"
                data-monitor-history-download-owner="hertzbeat-ui-button-link"
              >
                Download SVG
              </HzButtonLink>
              <HzButtonLink
                href="#ui-lab-trace-handoff"
                size="md"
                data-hz-ui-lab-trace-handoff-action="collector"
                data-trace-handoff-action-icon-owner="hertzbeat-ui-button-icon"
              >
                <HzButtonIcon
                  icon={Server}
                  data-hz-ui-lab-trace-handoff-action-icon="collector"
                  data-trace-handoff-action-icon-owner="hertzbeat-ui-button-icon"
                />
                Collector
              </HzButtonLink>
              <HzUnderlineToggle
                selected
                selectionAttrName="data-control-underline-selected"
                data-hz-control-baseline-component="HzUnderlineToggle"
                onClick={() => setContextMessage('Baseline underline')}
              >Templates</HzUnderlineToggle>
              <Link
                href="/monitors?app=mysql"
                className="inline-flex max-w-full"
                data-hz-ui-lab-monitor-row-app-filter="angular-app-tag-link"
                data-monitor-row-app-filter-link="angular-app-tag-link"
                data-monitor-row-app-filter-target="/monitors?app=mysql"
              >
                <HzDataCellText
                  variant="type"
                  tone="muted"
                  data-monitor-row-type-owner="hertzbeat-ui-data-cell-text"
                  data-monitor-row-type="mysql"
              >
                MySQL
              </HzDataCellText>
              </Link>
              <div
                className="inline-flex min-w-0 items-center gap-1"
                data-hz-ui-lab-monitor-row-instance-copy="angular-host-copy"
                data-monitor-row-instance-copy-layout="angular-host-copy"
              >
                <HzDataCellText
                  variant="copy"
                  data-monitor-row-copy-owner="hertzbeat-ui-data-cell-text"
                  data-monitor-row-copy="127.0.0.1:80"
                >
                  127.0.0.1:80
                </HzDataCellText>
                <HzIconButton
                  label="Click to copy"
                  intent="ghost"
                  data-monitor-row-instance-copy="angular-host-copy"
                  data-monitor-row-instance-copy-owner="hertzbeat-ui-icon-button"
                  data-monitor-row-instance-copy-target="127.0.0.1:80"
                >
                  <CopyIcon size={13} />
                </HzIconButton>
              </div>
              <div
                className="inline-flex min-w-0 items-center gap-1"
                data-hz-ui-lab-monitor-row-scrape-display="angular-service-discovery"
              >
                <HzDataCellText
                  variant="copy"
                  data-monitor-row-copy-owner="hertzbeat-ui-data-cell-text"
                  data-monitor-row-copy="Http Service Discovery"
                  data-monitor-row-scrape-display="angular-service-discovery"
                  data-monitor-row-scrape-display-owner="hertzbeat-ui-data-cell-text"
                  data-monitor-row-scrape-value="http_sd"
                >
                  <GitBranch size={12} aria-hidden="true" data-monitor-row-scrape-icon="partition" />
                  Http Service Discovery
                </HzDataCellText>
              </div>
              <HzLabelTag
                colorToken="geekblue"
                data-hz-ui-lab-monitor-row-label-color="angular-render-label-color"
                data-monitor-row-label-color="angular-render-label-color"
                data-monitor-row-labels-owner="hertzbeat-ui-label-tag"
              >
                team:platform
              </HzLabelTag>
              <HzDataCellText
                variant="meta"
                display="block"
                spacing="stack"
                casing="plain"
                data-hz-ui-lab-monitor-row-entity-triage="angular-entity-reason"
                data-monitor-row-entity-triage="angular-entity-reason"
                data-monitor-row-entity-triage-owner="hertzbeat-ui-data-cell-text"
                data-monitor-row-entity-triage-status="down"
              >
                This monitor is unhealthy. Check it first.
              </HzDataCellText>
              <HzButton
                size="xs"
                intent="secondary"
                data-hz-ui-lab-monitor-row-entity-response-action="angular-inline-host-action"
                data-monitor-row-entity-response-action="angular-inline-host-action"
                data-monitor-row-entity-response-owner="hertzbeat-ui-button"
                data-monitor-row-response-action="pause"
              >
                <PauseCircle size={13} />
                Pause
              </HzButton>
              <div
                className="flex flex-wrap gap-1.5"
                data-hz-ui-lab-monitor-row-entity-support-actions="angular-platform-support-action-bar"
                data-monitor-row-entity-support-actions="angular-platform-support-action-bar"
                data-monitor-row-entity-support-actions-owner="hertzbeat-ui-button-link"
              >
                <HzButtonLink
                  href="#ui-lab-monitor-row-related-logs"
                  size="xs"
                  intent="secondary"
                  data-monitor-row-entity-support-action="related-logs"
                  data-monitor-row-entity-support-target="/log/manage?entityId=42&search=checkout-api&returnTo=%2Fmonitors"
                >
                  <FileText size={13} />
                  Open related logs
                </HzButtonLink>
                <HzButtonLink
                  href="#ui-lab-monitor-row-related-traces"
                  size="xs"
                  intent="secondary"
                  data-monitor-row-entity-support-action="related-traces"
                  data-monitor-row-entity-support-target="/trace/manage?entityId=42&serviceName=checkout-api&returnTo=%2Fmonitors"
                >
                  <Network size={13} />
                  Open related traces
                </HzButtonLink>
                <HzButton
                  size="xs"
                  intent="secondary"
                  disabled
                  data-monitor-row-entity-support-action="code"
                  data-monitor-row-entity-support-disabled="missing-code-navigation"
                >
                  <FileCode2 size={13} />
                  Open code
                </HzButton>
              </div>
              <HzActionGroup
                density="compact-icons"
                layout="full-end"
                data-hz-ui-lab-action-group="shared"
                data-hz-ui-lab-action-group-layout="full-end"
              >
                <div
                  className="relative flex justify-end"
                  data-hz-ui-lab-monitor-row-action-menu="angular-ellipsis-dropdown"
                  data-monitor-row-actions="angular-ellipsis-dropdown"
                  data-monitor-row-actions-owner="hertzbeat-ui-table-row-action-button"
                  data-monitor-row-action-menu="angular-ellipsis-dropdown"
                  data-monitor-row-action-menu-open={monitorRowActionMenuOpen ? 'true' : 'false'}
                  data-monitor-row-action-menu-layer="overlay-visible-above-table"
                  data-monitor-row-action-menu-clearance="floating-overlay-no-table-crop"
                >
                  <HzIconButton
                    label="Open monitor row actions"
                    intent="ghost"
                    aria-expanded={monitorRowActionMenuOpen}
                    onClick={() => setMonitorRowActionMenuOpen(open => !open)}
                    data-monitor-row-action-menu-trigger="angular-ellipsis-dropdown"
                    data-monitor-row-action-menu-trigger-owner="hertzbeat-ui-icon-button"
                    data-monitor-row-action-menu-open={monitorRowActionMenuOpen ? 'true' : 'false'}
                  >
                    <MoreHorizontal size={14} />
                  </HzIconButton>
                  <div
                    hidden={!monitorRowActionMenuOpen}
                    className="absolute right-0 top-7 z-30 grid min-w-[176px] gap-1 border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-raised)] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
                    data-monitor-row-action-menu-panel="angular-nz-dropdown-menu"
                    data-monitor-row-action-menu-panel-open={monitorRowActionMenuOpen ? 'true' : 'false'}
                    data-monitor-row-action-menu-layer-panel="overlay-visible-above-table"
                    data-monitor-row-action-menu-clearance-panel="floating-overlay-no-table-crop"
                  >
                  <HzButtonLink
                    href="#ui-lab-monitor-detail"
                    size="xs"
                    intent="ghost"
                    layout="full"
                    data-hz-ui-lab-monitor-row-detail-action="shared"
                    data-monitor-row-detail-action-owner="hertzbeat-ui-button-link"
                    data-monitor-row-action-owner="hertzbeat-ui-button-link"
                    data-monitor-row-action="detail"
                  >
                    <BarChart3 size={13} />
                    Open monitor detail
                  </HzButtonLink>
                  <HzButtonLink
                    href="#ui-lab-monitor-edit"
                    size="xs"
                    intent="ghost"
                    layout="full"
                    data-monitor-row-action-owner="hertzbeat-ui-button-link"
                    data-monitor-row-action="edit"
                  >
                    <Pencil size={13} />
                    Edit monitor
                  </HzButtonLink>
                  <HzTableRowActionButton
                    width="root-span"
                    data-hz-ui-lab-monitor-row-copy-lifecycle="angular-copy-success-refresh-unavailable-refresh"
                    data-monitor-row-copy-lifecycle="angular-copy-success-refresh-unavailable-refresh"
                    data-monitor-row-copy-lifecycle-owner="hertzbeat-ui-table-row-action-button"
                    data-monitor-row-action-owner="hertzbeat-ui-table-row-action-button"
                    data-monitor-row-action="copy"
                  >
                    <CopyIcon size={13} />
                    Copy monitor
                  </HzTableRowActionButton>
                  <HzTableRowActionButton
                    width="root-span"
                    data-hz-ui-lab-monitor-row-response-action="pause"
                    data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"
                    data-monitor-row-response-action="pause"
                  >
                    <PauseCircle size={13} />
                    Pause monitor
                  </HzTableRowActionButton>
                  <HzTableRowActionButton
                    width="root-span"
                    data-hz-ui-lab-monitor-row-response-action="enable"
                    data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"
                    data-monitor-row-response-action="enable"
                  >
                    <PlayCircle size={13} />
                    Enable monitor
                  </HzTableRowActionButton>
                  <HzTableRowActionButton
                    width="root-span"
                    intent="danger"
                    data-hz-ui-lab-monitor-row-delete-action="shared"
                    data-monitor-row-delete-action-owner="hertzbeat-ui-table-row-action-button"
                    data-monitor-row-delete-action="single"
                  >
                    <Trash2 size={13} />
                    Delete monitor
                  </HzTableRowActionButton>
                  </div>
                </div>
              </HzActionGroup>
              <HzConfirmDialog
                open
                tone="critical"
                kicker="Monitor center"
                title="Please confirm whether to cancel monitor!"
                bodyRhythm="stack"
                cancelLabel="Cancel"
                confirmLabel="OK"
                onClose={() => undefined}
                onConfirm={() => undefined}
                data-hz-ui-lab-monitor-row-response-confirm="angular-modal-confirm"
                data-hz-ui-lab-monitor-response-confirm-closable="angular-nz-closable-false"
                data-hz-ui-lab-monitor-response-confirm-ok="angular-nz-ok-danger-primary"
                data-monitor-row-response-confirm="angular-modal-confirm"
                data-monitor-row-response-confirm-owner="hertzbeat-ui-confirm-dialog"
                data-monitor-row-response-confirm-action="pause"
                data-monitor-row-response-confirm-target="checkout-api"
                data-monitor-row-response-confirm-closable="angular-nz-closable-false"
                data-monitor-row-response-confirm-ok="angular-nz-ok-danger-primary"
              >
                <div data-monitor-row-response-confirm-body="angular-single-row-confirm">
                  <HzInlineFeedback
                    tone="critical"
                    title="checkout-api"
                    data-monitor-row-response-confirm-selected-owner="hertzbeat-ui-inline-feedback"
                  />
                </div>
              </HzConfirmDialog>
              <HzHeaderIconButton
                label="Unmute notifications"
                state="active"
                data-hz-control-baseline-component="HzHeaderIconButton"
                data-hz-ui-lab-header-mute="shared"
                data-hz-ui-lab-header-mute-save-lifecycle="angular-success-only-state-update"
                data-app-frame-mute-save-lifecycle="angular-success-only-state-update"
                data-app-frame-mute-save-lifecycle-owner="route-action-state-contract"
                data-app-frame-icon-trigger="mute"
                data-app-frame-mute-state="muted"
              >
                <Megaphone size={16} data-hz-ui-lab-header-mute-icon="shared" />
              </HzHeaderIconButton>
              <HzHeaderRealtimeNotice
                status="live"
                title="New Alert"
                description="checkout-service latency breach"
                meta="ALERT_EVENT"
                data-hz-control-baseline-component="HzHeaderRealtimeNotice"
                data-hz-ui-lab-header-realtime-notice="shared"
                data-hz-ui-lab-header-realtime-sse="angular-alert-and-manager-sse"
                data-app-frame-header-realtime-sse-contract="angular-alert-and-manager-sse"
                data-app-frame-header-realtime-sse-owner="route-realtime-sse-contract"
                data-app-frame-header-realtime-alert-source="/api/alert/sse/subscribe"
                data-app-frame-header-realtime-manager-source="/api/manager/sse/subscribe"
                data-app-frame-header-realtime-notice-owner="hertzbeat-ui-header-realtime-notice"
              />
              <div className="w-[220px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
                <HzHeaderMenuAction
                  label="Exit fullscreen"
                  state="active"
                  data-hz-control-baseline-component="HzHeaderMenuAction"
                  data-hz-ui-lab-header-fullscreen-action="shared"
                  data-app-frame-settings-fullscreen-action="angular-toggle"
                >
                  <Minimize2 size={14} data-hz-ui-lab-header-fullscreen-icon="exit" />
                </HzHeaderMenuAction>
                <HzLocaleMenuOption
                  abbr="CN"
                  label="Simplified Chinese"
                  selected
                  data-hz-control-baseline-component="HzLocaleMenuOption"
                  data-hz-ui-lab-locale-menu-option="shared"
                  data-hz-ui-lab-locale-reload="angular-load-use-layout-reload"
                  data-app-frame-locale-option="zh-CN"
                  data-app-frame-locale-reload-contract="angular-load-use-layout-reload"
                  data-app-frame-locale-reload-owner="route-locale-reload-contract"
                />
              </div>
              <div className="w-[180px] rounded-[4px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
                <div
                  data-hz-ui-lab-user-logout-lifecycle-contract="angular-clear-then-passport-login"
                  data-app-frame-user-logout-lifecycle-contract="angular-clear-then-passport-login"
                  data-app-frame-user-logout-lifecycle-owner="route-session-contract"
                />
                <HzUserMenuAction
                  item="setting"
                  label="System settings"
                  data-hz-control-baseline-component="HzUserMenuAction"
                  data-hz-ui-lab-user-menu-action="setting"
                  data-app-frame-user-action="setting"
                >
                  <Wrench size={14} data-hz-ui-lab-user-menu-icon="tool" />
                </HzUserMenuAction>
                <HzUserMenuAction
                  item="logout"
                  label="Logout"
                  data-hz-control-baseline-component="HzUserMenuAction"
                  data-hz-ui-lab-user-menu-action="logout"
                  data-hz-ui-lab-user-logout-lifecycle="angular-clear-then-passport-login"
                  data-app-frame-user-action="logout"
                  data-app-frame-user-logout-lifecycle="angular-clear-then-passport-login"
                  data-app-frame-user-logout-lifecycle-owner="route-session-contract"
                >
                  <LogOut size={14} data-hz-ui-lab-user-menu-icon="logout" />
                </HzUserMenuAction>
              <HzUserMenuAction
                item="about"
                label="About"
                data-hz-control-baseline-component="HzUserMenuAction"
                data-hz-ui-lab-user-menu-action="about"
                  data-app-frame-user-action="about"
              >
                <MapPin size={14} data-hz-ui-lab-user-menu-icon="environment" />
              </HzUserMenuAction>
            </div>
              <div
                data-hz-ui-lab-settings-shell="angular-settings-shell"
                data-settings-console-shell-owner="shared-settings-console-shell"
                className="min-w-0"
              >
                <SettingsConsoleShell
                  activeHref="/setting/settings/config"
                  contentLabel="Settings content"
                  kicker="Settings"
                  navigationLabel="Settings sections"
                  title="Settings console"
                  subtitle="Angular-compatible settings navigation with config, server, object store, and token sections."
                  items={[
                    { href: '/setting/settings/config', label: 'System config' },
                    { href: '/setting/settings/server', label: 'Message server' },
                    { href: '/setting/settings/object-store', label: 'Object store' },
                    { href: '/setting/settings/token', label: 'Token management' }
                  ]}
                >
                  <div
                    data-hz-ui-lab-settings-active-title="angular-active-child-title"
                    data-settings-console-active-title-owner="shared-settings-console-shell"
                    className="text-[13px] font-semibold text-[#eef2f7]"
                  >
                    System config
                  </div>
                </SettingsConsoleShell>
              </div>
              <HzInlineFeedback
                tone="success"
                title="Applied successfully"
                description="System config save reloads language, theme, and workbench state after the Angular /config/system apply contract."
                meta="zh_CN -> zh-CN"
                variant="embedded"
                data-hz-control-baseline-component="HzInlineFeedback"
                data-hz-ui-lab-setting-config-apply="angular-apply-notify-reload"
                data-setting-config-apply-feedback-owner="hertzbeat-ui-inline-feedback"
                data-setting-config-runtime-locale="underscore-to-hyphen"
              />
              <SettingsForm
                data-hz-ui-lab-setting-config-selects="angular-400px-centered-bold"
                data-setting-config-form="cold-settings-form"
                data-setting-config-select-contract="angular-400px-centered-bold"
                data-setting-config-timezone-search-contract="angular-nz-show-search"
                data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"
              >
                <SettingsFormField label="System language">
                  <SettingsFormSelect value="zh_CN" data-setting-config-select-kind="locale" onChange={() => undefined}>
                    <option value="en_US">English(en_US)</option>
                    <option value="zh_CN">Simplified Chinese(zh_CN)</option>
                  </SettingsFormSelect>
                </SettingsFormField>
                <SettingsFormField label="System timezone">
                  <SettingsFormSelect
                    value="Asia/Shanghai"
                    searchable
                    searchPlaceholder="System timezone"
                    data-setting-config-select-kind="timezone"
                    data-hz-ui-lab-setting-config-timezone-search="angular-nz-show-search"
                    onChange={() => undefined}
                  >
                    <option value="Asia/Shanghai">Asia/Shanghai (+08:00) Shanghai</option>
                    <option value="UTC">UTC (+00:00) UTC</option>
                  </SettingsFormSelect>
                </SettingsFormField>
                <SettingsFormField label="System theme">
                  <SettingsFormSelect value="dark-ops" data-setting-config-select-kind="theme" onChange={() => undefined}>
                    <option value="light-ops">Default theme</option>
                    <option value="dark-ops">Dark theme</option>
                    <option value="compact">Compact theme</option>
                  </SettingsFormSelect>
                </SettingsFormField>
              </SettingsForm>
              <HzInlineFeedback
                tone="success"
                title="Applied successfully"
                description="Object store saves /config/oss with the Angular apply notification contract."
                meta="OBS / hertzbeat"
                variant="embedded"
                data-hz-control-baseline-component="HzInlineFeedback"
                data-hz-ui-lab-object-store-apply="angular-apply-notify"
                data-setting-object-store-apply-feedback-owner="hertzbeat-ui-inline-feedback"
              />
              <SettingsForm
                data-hz-ui-lab-object-store-provider-reset="angular-reset-config-on-type-change"
                data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"
                data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"
              >
                <SettingsFormField label="File service provider">
                  <SettingsFormSelect
                    value="OBS"
                    data-setting-object-store-provider-select="angular-centered-bold-dropdown"
                    data-setting-object-store-type-change="angular-reset-config-on-type-change"
                    onChange={() => undefined}
                  >
                    <option value="DATABASE">Database</option>
                    <option value="FILE">Local file</option>
                    <option value="OBS">Huawei OBS</option>
                  </SettingsFormSelect>
                </SettingsFormField>
                <div data-hz-ui-lab-object-store-obs-fields="angular-obs-fields-required">
                  <SettingsFormField label="AccessKey">
                    <SettingsFormInput value="ak" readOnly />
                  </SettingsFormField>
                </div>
              </SettingsForm>
              <HzInlineFeedback
                tone="success"
                title="Applied successfully"
                description="Message server saves /config/email and /config/sms with the Angular apply notification contract."
                meta="email + sms"
                variant="embedded"
                data-hz-control-baseline-component="HzInlineFeedback"
                data-hz-ui-lab-setting-server-apply="angular-apply-notify"
                data-settings-server-apply-feedback-owner="hertzbeat-ui-inline-feedback"
              />
              <div
                className="w-[min(92vw,520px)] rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 md:w-[40vw]"
                data-hz-ui-lab-setting-server-dialog-layout="angular-width-40-percent"
                data-settings-server-dialog-width-contract="angular-width-40-percent"
                data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"
                data-settings-server-dialog-mask-contract="angular-mask-closable-false"
              >
                <SettingsDialogForm data-hz-ui-lab-setting-server-dialog-form="angular-label-7-control-12">
                  <SettingsDialogField label="Email server address" required>
                    <SettingsDialogInput value="smtp.example.com" readOnly />
                  </SettingsDialogField>
                  <SettingsDialogField label="Email port" required>
                    <SettingsDialogInput value="587" readOnly />
                  </SettingsDialogField>
                  <SettingsDialogField label="SMS type" required>
                    <SettingsDialogSelect value="tencent" onChange={() => undefined}>
                      <option value="tencent">Tencent SMS</option>
                      <option value="twilio">Twilio Sms</option>
                    </SettingsDialogSelect>
                  </SettingsDialogField>
                  <SettingsDialogField label="Enable" required>
                    <SettingsDialogToggle checked onCheckedChange={() => undefined} />
                  </SettingsDialogField>
                </SettingsDialogForm>
              </div>
              <div
                className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3"
                data-hz-ui-lab-setting-token-generate="angular-generate-token-modal"
                data-setting-token-generate-owner="hertzbeat-ui-inline-feedback"
                data-setting-token-generate-dialog-layout-contract="angular-vertical-form"
                data-setting-token-generated-dialog-width-contract="angular-width-50-percent"
                data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"
              >
                <SettingsDialogForm
                  data-hz-ui-lab-setting-token-generate-form="angular-vertical-form"
                  data-setting-token-generate-form-layout="angular-vertical-form"
                >
                  <SettingsDialogField label="Token name" required layout="vertical">
                    <SettingsDialogInput value="codex-preview-token" readOnly />
                  </SettingsDialogField>
                  <SettingsDialogField label="Expire time" layout="vertical">
                    <SettingsDialogSelect value="-1" onChange={() => undefined}>
                      <option value="-1">Never expire</option>
                      <option value="604800">7 days</option>
                    </SettingsDialogSelect>
                  </SettingsDialogField>
                </SettingsDialogForm>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-semibold text-[#f5f7fb]">Generated token</div>
                    <div className="text-[11px] text-[#98a2b3]">Visible once after /account/token/generate succeeds.</div>
                  </div>
                  <HzButton size="sm" variant="secondary" data-hz-ui-lab-setting-token-copy-action="shared">
                    Copy
                  </HzButton>
                </div>
                <code className="block rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1.5 text-[12px] text-[#dbe4f0]">
                  hb_generated_token_xxx
                </code>
                <HzInlineFeedback
                  tone="success"
                  title="Copy Success!"
                  variant="embedded"
                  data-hz-control-baseline-component="HzInlineFeedback"
                  data-hz-ui-lab-setting-token-copy-feedback="angular-copy-notify"
                  data-setting-token-copy-feedback-owner="hertzbeat-ui-inline-feedback"
                />
                <HzInlineFeedback
                  tone="critical"
                  title="Delete token requires confirmation"
                  description="Token deletion keeps Angular modal.confirm semantics before DELETE /account/token/{id}."
                  variant="embedded"
                  data-hz-control-baseline-component="HzInlineFeedback"
                  data-hz-ui-lab-setting-token-delete-confirm="angular-modal-confirm"
                  data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                />
                <HzInlineFeedback
                  tone="warning"
                  title="Token list is temporarily unavailable"
                  description="The token route keeps Angular loadFailed + retry behavior instead of falling into a generic workbench error shell."
                  variant="embedded"
                  data-hz-control-baseline-component="HzInlineFeedback"
                  data-hz-ui-lab-setting-token-load-failure="angular-load-failed-retry"
                  data-setting-token-load-failure-owner="hertzbeat-ui-inline-feedback"
                />
              </div>
              <HzPassportLockSurface
                title="Unlock"
                passwordLabel="Password"
                passwordPlaceholder="Input password"
                buttonLabel="Unlock"
                password=""
                avatarSrc="./assets/img/avatar.svg"
                avatarAlt="ops-admin"
                disabled
                data-hz-control-baseline-component="HzPassportLockSurface"
                data-hz-ui-lab-passport-lock="shared"
                data-hz-ui-lab-passport-lock-avatar="angular-settings-user-avatar"
                data-hz-ui-lab-passport-lock-session="angular-lock-preserve-session"
                data-passport-lock-panel-owner="hertzbeat-ui-passport-lock"
                data-passport-lock-session-contract="angular-lock-preserve-session"
                data-hz-ui-lab-passport-lock-submit-lifecycle="angular-mark-dirty-required-then-dashboard"
                data-passport-lock-submit-lifecycle-contract="angular-mark-dirty-required-then-dashboard"
                data-passport-lock-submit-lifecycle-owner="hertzbeat-ui-passport-lock"
                data-passport-lock-redirect-contract="angular-dashboard-next-overview"
                data-hz-ui-lab-passport-lock-required-mode="angular-required-no-trim"
                data-passport-lock-required-mode-contract="angular-required-no-trim"
                data-passport-lock-required-mode-owner="hertzbeat-ui-passport-lock"
              />
              <HzPassportLoginActionFrame
                className="grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"
                data-hz-control-baseline-component="HzPassportLoginActionFrame"
                data-hz-ui-lab-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"
                data-hz-ui-lab-passport-login-required-mode="angular-required-no-trim"
                data-hz-ui-lab-passport-login-session-user-name="angular-raw-identifier"
                data-hz-ui-lab-passport-login-default-password-lifecycle="angular-sticky-until-submit"
                data-hz-ui-lab-passport-login-startup-failure="angular-exception-500"
                data-hz-ui-lab-passport-login-redirect-fallback="angular-root-fallback"
                data-passport-login-submit-lifecycle-contract="angular-required-default-warning-session-bootstrap-redirect"
                data-passport-login-required-mode-contract="angular-required-no-trim"
                data-passport-login-required-mode-owner="hertzbeat-ui-passport-login-action"
                data-passport-login-session-user-name-contract="angular-raw-identifier"
                data-passport-login-session-user-name-owner="hertzbeat-ui-passport-login-action"
                data-passport-login-default-password-lifecycle-contract="angular-sticky-until-submit"
                data-passport-login-startup-failure-contract="angular-exception-500"
                data-passport-login-redirect-fallback-contract="angular-root-fallback"
                data-passport-login-submit-lifecycle-owner="hertzbeat-ui-passport-login-action"
              >
                <input
                  readOnly
                  value="ops-admin"
                  className="h-9 rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#dbe4f0]"
                  data-hz-ui-lab-passport-login-identifier="required"
                />
                <input
                  readOnly
                  value="custom-secret"
                  type="password"
                  className="h-9 rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#dbe4f0]"
                  data-hz-ui-lab-passport-login-credential="required"
                />
                <div className="flex items-center justify-between gap-3">
                  <HzCheckbox checked readOnly label="Remember me" data-hz-ui-lab-passport-login-remember="true" />
                  <HzButton size="sm" variant="primary" data-hz-ui-lab-passport-login-submit="shared">
                    Login
                  </HzButton>
                </div>
              </HzPassportLoginActionFrame>
              <HzPassportSessionClearFrame
                className="rounded-[4px] border border-[#2b3039] bg-[#101217] p-3 text-[12px] text-[#dbe4f0]"
                data-hz-control-baseline-component="HzPassportSessionClearFrame"
                data-hz-ui-lab-passport-session-clear="angular-token-service-clear-on-passport-entry"
                data-passport-session-clear-contract="angular-token-service-clear-on-passport-entry"
                data-passport-session-clear-owner="hertzbeat-ui-passport-session-clear"
              >
                Passport entry clears the client session marker and cached user snapshot before credential login.
              </HzPassportSessionClearFrame>
              <HzPassportLoginNotice
                copy="Please update the initial default password in time!"
                href="https://hertzbeat.apache.org/docs/start/account-modify"
                data-hz-control-baseline-component="HzPassportLoginNotice"
                data-hz-ui-lab-passport-login-notice="shared"
                data-passport-login-notice-owner="hertzbeat-ui-passport-login-notice"
              />
              <HzPassportLoginValidationNotice
                title="attention"
                copy="Please enter your username"
                data-hz-control-baseline-component="HzPassportLoginValidationNotice"
                data-hz-ui-lab-passport-login-validation="shared"
                data-passport-login-validation-owner="hertzbeat-ui-passport-login-validation"
              />
              <HzAboutModalSurface
                open
                className="relative inset-auto z-auto min-w-[620px] bg-transparent p-0"
                data-hz-control-baseline-component="HzAboutModalSurface"
                data-hz-ui-lab-about-modal="shared"
                data-hz-ui-lab-about-closable="angular-nz-closable-false"
                data-app-frame-about-closable-contract="angular-nz-closable-false"
                data-app-frame-about-cancel-contract="angular-on-cancel"
                title="HertzBeat is an open source observability platform"
                points={[
                  'Collect metrics from applications, databases, operating systems, middleware, and network devices.',
                  'Receive OTLP logs with resource, entity, trace, and alert context.',
                  'Handle threshold and external alerts in one place.',
                  'Notify the channels your operations team uses.',
                  'Use monitoring templates to define collection protocols and thresholds.',
                  'Scale collector clusters across private network zones.'
                ]}
                help="Thanks for using HertzBeat."
                version="v1.8.0"
                releaseHref="https://github.com/apache/hertzbeat/releases/tag/v1.8.0"
                copyright="Copyright © 2026 | Apache HertzBeat™"
                notShowLabel="Do not show next login"
                notShowChecked
                onNotShowChange={() => undefined}
                closeLabel="Close dialog"
                communityLinks={[
                  { href: 'https://github.com/apache/hertzbeat', label: 'GitHub' },
                  { href: 'https://github.com/apache/hertzbeat/issues', label: 'Issue' },
                  { href: 'https://hertzbeat.apache.org/docs/', label: 'Doc' },
                  { href: 'https://hertzbeat.apache.org/docs/start/upgrade', label: 'Upgrade' }
                ]}
              />
              <HzPanelSurface
                data-hz-control-baseline-component="HzPanelSurface"
                data-hz-ui-lab-panel-surface="shared"
                data-hz-ui-lab-panel-surface-padding="query"
                className="min-w-[132px]"
                padding="query"
              >
                <span className="block truncate text-[11px] font-semibold text-[#98a2b3]">Panel</span>
              </HzPanelSurface>
              <HzPanelSurface
                data-hz-control-baseline-component="HzPanelSurface"
                data-hz-ui-lab-panel-surface="shared"
                data-hz-ui-lab-panel-surface-padding="header"
                data-hz-ui-lab-log-header-panel-surface="shared"
                data-log-header-panel-surface-owner="hertzbeat-ui-panel-surface"
                className="min-w-[148px]"
                padding="header"
              >
                <span className="block truncate text-[11px] font-semibold text-[#98a2b3]">Header panel</span>
              </HzPanelSurface>
              <HzPanelSurface
                data-hz-control-baseline-component="HzPanelSurface"
                data-hz-ui-lab-panel-surface="shared"
                data-hz-ui-lab-panel-surface-padding="chart"
                data-hz-ui-lab-log-chart-panel-surface="shared"
                data-log-chart-panel-surface-owner="hertzbeat-ui-panel-surface"
                className="min-w-[142px]"
                padding="chart"
              >
                <span className="block truncate text-[11px] font-semibold text-[#98a2b3]">Chart panel</span>
              </HzPanelSurface>
              <HzAiChatModalSurface
                data-hz-control-baseline-component="HzAiChatModalSurface"
                data-hz-ui-lab-ai-chat-modal="shared"
                data-hz-ui-lab-ai-chat-initial-message="angular-open-modal-initial-message"
                data-hz-ui-lab-ai-chat-config-save-lifecycle="angular-validate-save-close-refresh"
                data-hz-ui-lab-ai-chat-conversation-action-lifecycle="angular-create-select-delete-fallback"
                data-hz-ui-lab-ai-chat-schedule-action-lifecycle="angular-load-create-toggle-revert-confirm-update-delete"
                data-hz-ui-lab-ai-chat-stream-history-lifecycle="angular-push-user-placeholder-sse-skill-report-refresh"
                data-app-frame-ai-chat-owner="hertzbeat-ui-ai-chat-modal"
                data-app-frame-ai-chat-initial-message-contract="angular-open-modal-initial-message"
                data-app-frame-ai-chat-initial-message-owner="route-ai-chat-modal-contract"
                data-app-frame-ai-chat-config-save-lifecycle-contract="angular-validate-save-close-refresh"
                data-app-frame-ai-chat-config-save-lifecycle-owner="route-ai-chat-config-contract"
                data-app-frame-ai-chat-conversation-action-lifecycle-contract="angular-create-select-delete-fallback"
                data-app-frame-ai-chat-conversation-action-lifecycle-owner="route-ai-chat-conversation-contract"
                data-app-frame-ai-chat-schedule-action-lifecycle-contract="angular-load-create-toggle-revert-confirm-update-delete"
                data-app-frame-ai-chat-schedule-action-lifecycle-owner="route-ai-chat-schedule-contract"
                data-app-frame-ai-chat-stream-history-lifecycle-contract="angular-push-user-placeholder-sse-skill-report-refresh"
                data-app-frame-ai-chat-stream-history-lifecycle-owner="route-ai-chat-stream-contract"
                className="relative inset-auto z-auto h-[520px] min-w-[680px] bg-transparent p-0"
                title="AI assistant"
                subtitle="Angular shell modal parity"
                conversationsTitle="Conversations"
                newChatLabel="New chat"
                newChatStatus="idle"
                deleteLabel="Delete conversation"
                deleteConfirmLabel="Delete"
                deleteCancelLabel="Cancel"
                deleteStatus="confirming"
                deleteConversationId="collector-review"
                welcomeTitle="Ask HertzBeat"
                welcomeDescription="Use the shared shell for conversation list, message flow, and prompt entry before wiring route-specific streaming behavior."
                inputPlaceholder="Ask assistant"
                inputValue="Summarize checkout errors"
                inputHint="Shared modal surface, route wiring supplies the live stream."
                closeLabel="Close dialog"
                sendLabel="Send prompt"
                sendStatus="sending"
                streamingLabel="Typing..."
                configOpen
                configTitle="AI Provider Configuration"
                configDescription="Configure the provider used by the AI assistant."
                configStatus="ready"
                configStatusLabel="Provider configuration loaded from /config/provider"
                configTriggerLabel="Modify API key"
                configProviderLabel="AI Provider"
                configProviderHelp="Choose your AI provider (OpenAI, ZhiPu, or ZAI)"
                configApiKeyLabel="API Key"
                configApiKeyHelp="Your Provider API key. The key will be validated when saved."
                configBaseUrlLabel="Base URL"
                configBaseUrlHelp="Custom API endpoint URL. Leave empty to use default for selected provider."
                configModelLabel="Model"
                configModelHelp="Model name to use. Leave empty to use default for selected provider."
                configResetLabel="Reset to default values"
                configSaveLabel="Save"
                configCancelLabel="Cancel"
                configProviderOptions={[
                  { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
                  { value: 'zai', label: 'ZAI', defaultBaseUrl: 'https://api.z.ai/api/paas/v4', defaultModel: 'glm-4.6' },
                  { value: 'zhipu', label: 'ZhiPu', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4.6' }
                ]}
                configValue={{
                  code: 'openai',
                  apiKey: 'sk-lab',
                  baseUrl: 'https://api.openai.com/v1',
                  model: 'gpt-4'
                }}
                scheduleOpen
                scheduleStatus="ready"
                scheduleStatusLabel="Schedules loaded from /ai/schedule/conversation/7"
                scheduleTriggerLabel="Schedule"
                scheduleTitle="Schedule Configuration"
                scheduleConfiguredTitle="Configured Schedules"
                scheduleCreateTitle="Create Schedule"
                scheduleAddTitle="Add New Task"
                scheduleSkillLabel="Skill"
                scheduleSkillSelectLabel="Select Skill"
                scheduleSkillPlaceholder="Select skill to execute"
                scheduleCronLabel="Execution Time (Cron Expression)"
                scheduleCronHelp="Format: seconds minutes hours day month week"
                scheduleCronCommonLabel="Common: daily 9am"
                scheduleCronMondayLabel="Monday 9am"
                scheduleStatusColumnLabel="Status"
                scheduleActionLabel="Action"
                scheduleEditLabel="Edit"
                scheduleDeleteLabel="Delete"
                scheduleDeleteConfirmLabel="Delete"
                scheduleDeleteCancelLabel="Cancel"
                scheduleDeleteStatus="confirming"
                scheduleDeleteScheduleId="daily-health"
                scheduleSaveLabel="Save"
                scheduleCancelLabel="Cancel"
                scheduleCreateLabel="Create Schedule"
                scheduleRows={[
                  { id: 'daily-health', sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true },
                  { id: 'weekly-report', sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }
                ]}
                scheduleSkills={[
                  { value: 'daily-health', label: 'daily-health - Daily health report' },
                  { value: 'weekly-report', label: 'weekly-report - Weekly report' }
                ]}
                scheduleDraft={{ sopName: 'daily-health', cronExpression: '0 0 9 * * ?', enabled: true }}
                scheduleEditDraft={{ id: 'weekly-report', sopName: 'weekly-report', cronExpression: '0 0 9 ? * MON', enabled: false }}
                initialMessageLabel="Initial request"
                initialMessage="Show unhealthy monitors"
                previewMessages={[
                  { role: 'assistant', label: 'Assistant', content: 'I can inspect monitors, alerts, logs, traces, and settings.' }
                ]}
                conversationMessages={[
                  { role: 'user', label: 'User', content: 'Why did checkout latency spike?' },
                  { role: 'assistant', label: 'Assistant', content: 'The selected history loads into the shared message flow before streaming proof.' },
                  { role: 'assistant', label: 'Assistant', content: '' }
                ]}
                messageStatus="ready"
                messageStatusLabel="Selected conversation history loaded from /api/chat/conversations/{id}"
                conversationStatus="ready"
                conversationStatusLabel="2 conversations loaded from /api/chat/conversations"
                conversations={[
                  { id: 'checkout-errors', title: 'Investigate checkout errors', subtitle: 'Updated just now', active: true },
                  { id: 'collector-review', title: 'Collector health review', subtitle: '2 hours ago' }
                ]}
                onConversationDeleteRequest={() => {}}
                onConversationDeleteCancel={() => {}}
                onConversationDeleteConfirm={() => {}}
                onInputChange={() => {}}
                onSendMessage={() => {}}
                onConfigOpen={() => {}}
                onConfigClose={() => {}}
                onConfigSave={() => {}}
                onConfigResetDefaults={() => {}}
                onConfigChange={() => {}}
                onScheduleOpen={() => {}}
                onScheduleClose={() => {}}
                onScheduleDraftChange={() => {}}
                onScheduleCreate={() => {}}
                onScheduleToggle={() => {}}
                onScheduleEditStart={() => {}}
                onScheduleEditCancel={() => {}}
                onScheduleEditChange={() => {}}
                onScheduleUpdate={() => {}}
                onScheduleDeleteRequest={() => {}}
                onScheduleDeleteCancel={() => {}}
                onScheduleDeleteConfirm={() => {}}
              />
              <HzStateNotice
                data-hz-control-baseline-component="HzStateNotice"
                data-hz-ui-lab-handoff-hint-surface="shared"
                tone="info"
                title="Handoff context follows the selected signal."
                variant="hint"
                className="min-w-[220px] max-w-[260px]"
              />
              <HzStatusBadge
                data-hz-control-baseline-component="HzStatusBadge"
                data-hz-ui-lab-attribution-diagnostic-badge="shared"
                tone="success"
                size="xs"
              >
                Present
              </HzStatusBadge>
              <HzStatusBadge
                data-hz-control-baseline-component="HzStatusBadge"
                data-hz-ui-lab-trace-table-count-badge="shared"
                tone="neutral"
                size="xs"
              >
                12 traces
              </HzStatusBadge>
              <HzStatusBadge
                data-hz-control-baseline-component="HzStatusBadge"
                data-hz-ui-lab-stream-status-badge="shared"
                tone="warning"
                size="md"
              >
                Connecting
              </HzStatusBadge>
              <div className="min-w-[132px]" data-hz-control-baseline-component="HzSelect">
                <HzSelect
                  aria-label="Baseline select"
                  value="manual"
                  options={[
                    { value: 'manual', label: 'Manual' },
                    { value: 'auto', label: 'Auto' }
                  ]}
                  onChange={() => setContextMessage('Baseline select')}
                />
              </div>
              <HzInput
                className="w-[150px]"
                value="collector-a"
                readOnly
                data-hz-control-baseline-component="HzInput"
                aria-label="Baseline input"
              />
              <div
                className="hb-scrollbar h-7 w-[148px] overflow-x-auto border border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-control)] px-2"
                data-hz-ui-lab-scrollbar-baseline="thin-dark-platform"
                data-hz-ui-lab-scrollbar-owner="hertzbeat-ui-scrollbar"
              >
                <span className="whitespace-nowrap font-mono text-[10px] leading-7 text-[#8f99ab]">Thin dark scrollbar baseline</span>
              </div>
              <HzScrollViewport
                variant="log-stream"
                data-hz-ui-lab-log-stream-viewport="shared"
                data-log-stream-viewport-owner="hertzbeat-ui-scroll-viewport"
                className="h-24 w-[150px]"
              >
                <div className="divide-y divide-[var(--hz-ui-line-soft)]">
                  {['checkout timeout', 'trace linked', 'collector ok', 'service ready'].map(item => (
                    <div key={item} className="px-2 py-2 font-mono text-[11px] text-[var(--hz-ui-text-muted)]">
                      {item}
                    </div>
                  ))}
                </div>
              </HzScrollViewport>
              <HzControlStack
                className="w-[150px]"
                data-hz-ui-lab-control-stack="shared"
                data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack"
              >
                <HzInput
                  value="basic"
                  readOnly
                  data-hz-control-baseline-component="HzInput"
                  aria-label="Realtime row search"
                />
                <HzDataMetaText
                  display="block"
                  casing="plain"
                  data-monitor-realtime-search-count-owner="hertzbeat-ui-data-meta-text"
                >
                  3 / 8 rows
                </HzDataMetaText>
              </HzControlStack>
              <HzPanelSurface
                padding="query"
                data-hz-ui-lab-metrics-query-panel-surface="shared"
                data-metrics-query-panel-surface-owner="hertzbeat-ui-panel-surface"
                className="w-full max-w-[720px]"
              >
                <HzControlStack
                  layout="inline-wrap"
                  data-hz-ui-lab-metrics-query-panel-control-stack="shared"
                  data-metrics-query-panel-control-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzSearchFieldFrame
                    width="metrics-query"
                    icon={(
                      <HzSearchFieldIcon
                        icon={Search}
                        data-hz-ui-lab-metrics-query-panel-search-icon="shared"
                        data-metrics-query-panel-search-icon-owner="hertzbeat-ui-search-field-icon"
                      />
                    )}
                    data-hz-ui-lab-metrics-query-panel-search-frame="shared"
                    data-metrics-query-panel-search-frame-owner="hertzbeat-ui-search-field-frame"
                  >
                    <HzInput
                      value="http.server.duration"
                      readOnly
                      inset="search-icon"
                      width="metrics-query-expression"
                      data-hz-ui-lab-metrics-query-panel-input="shared"
                      data-metrics-query-panel-input-owner="hertzbeat-ui-input"
                      aria-label="Metrics panel query expression"
                    />
                  </HzSearchFieldFrame>
                  <HzSelect
                    aria-label="Metrics panel aggregation"
                    value="avg"
                    width="metrics-aggregation"
                    data-hz-ui-lab-metrics-query-panel-aggregation-select="shared"
                    data-metrics-query-panel-aggregation-select-owner="hertzbeat-ui-select"
                    options={[
                      { value: 'avg', label: 'Avg' },
                      { value: 'sum', label: 'Sum' },
                      { value: 'max', label: 'Max' }
                    ]}
                  />
                  <HzQueryActionGroup
                    data-hz-ui-lab-metrics-query-panel-action-group="shared"
                    data-metrics-query-panel-action-group-owner="hertzbeat-ui-query-action-group"
                  >
                    <HzButton size="md" intent="primary" onClick={clearFilterClauses}>
                      <HzButtonIcon
                        icon={Play}
                        data-hz-ui-lab-metrics-query-panel-action-icon="run"
                        data-metrics-query-panel-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      Run
                    </HzButton>
                    <HzButtonLink href="#" size="md">
                      <HzButtonIcon
                        icon={RotateCcw}
                        data-hz-ui-lab-metrics-query-panel-action-icon="reset"
                        data-metrics-query-panel-action-icon-owner="hertzbeat-ui-button-icon"
                      />
                      Reset
                    </HzButtonLink>
                  </HzQueryActionGroup>
                </HzControlStack>
                <HzControlStack
                  layout="inline-wrap"
                  spacing="top-2"
                  data-hz-ui-lab-metrics-query-panel-context-stack="shared"
                  data-metrics-query-panel-context-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzInput
                    value="checkout-service"
                    readOnly
                    width="metrics-context"
                    data-hz-ui-lab-metrics-query-panel-context-input="service-name"
                    data-metrics-query-panel-context-input-owner="hertzbeat-ui-input"
                    aria-label="Metrics panel service filter"
                  />
                  <HzInput
                    value="storefront"
                    readOnly
                    width="metrics-context"
                    data-hz-ui-lab-metrics-query-panel-context-input="namespace"
                    data-metrics-query-panel-context-input-owner="hertzbeat-ui-input"
                    aria-label="Metrics panel namespace filter"
                  />
                  <HzInput
                    value="dev"
                    readOnly
                    width="metrics-context-compact"
                    data-hz-ui-lab-metrics-query-panel-context-input="environment"
                    data-metrics-query-panel-context-input-owner="hertzbeat-ui-input"
                    aria-label="Metrics panel environment filter"
                  />
                  <HzInput
                    value="trace-20260524"
                    readOnly
                    width="metrics-trace-id"
                    data-hz-ui-lab-metrics-query-panel-context-input="trace-id"
                    data-metrics-query-panel-context-input-owner="hertzbeat-ui-input"
                    aria-label="Metrics panel trace filter"
                  />
                </HzControlStack>
              </HzPanelSurface>
              <HzPanelSurface
                padding="query"
                data-hz-ui-lab-log-query-panel-surface="shared"
                data-log-query-panel-surface-owner="hertzbeat-ui-panel-surface"
                className="w-full max-w-[760px]"
              >
                <HzControlStack
                  layout="inline-wrap"
                  data-hz-ui-lab-log-query-panel-control-stack="shared"
                  data-log-query-panel-control-stack-owner="hertzbeat-ui-control-stack"
                >
                  <HzSearchFieldFrame
                    width="log-query"
                    icon={(
                      <HzSearchFieldIcon
                        icon={Search}
                        data-hz-ui-lab-log-query-panel-search-icon="shared"
                        data-log-query-panel-search-icon-owner="hertzbeat-ui-search-field-icon"
                      />
                    )}
                    data-hz-ui-lab-log-query-panel-search-frame="shared"
                    data-log-query-panel-search-frame-owner="hertzbeat-ui-search-field-frame"
                  >
                    <HzInput
                      value="service.name = checkout"
                      readOnly
                      inset="search-icon"
                      width="log-query-expression"
                      data-hz-ui-lab-log-query-panel-search-input="shared"
                      data-log-query-panel-search-input-owner="hertzbeat-ui-input"
                      aria-label="Log query panel search"
                    />
                  </HzSearchFieldFrame>
                  <HzSelect
                    aria-label="Log query panel severity"
                    value="ERROR"
                    width="log-severity"
                    triggerTone="signal-query"
                    data-hz-ui-lab-log-query-panel-severity-select="shared"
                    data-log-query-panel-severity-select-owner="hertzbeat-ui-select"
                    options={[
                      { value: 'all', label: 'All levels' },
                      { value: 'ERROR', label: 'ERROR' },
                      { value: 'WARN', label: 'WARN' },
                      { value: 'INFO', label: 'INFO' }
                    ]}
                  />
                  <HzInput
                    value="trace-heartbeat-waterfall-live"
                    readOnly
                    width="log-query-token"
                    data-hz-ui-lab-log-query-panel-token-input="trace-id"
                    data-log-query-panel-token-input-owner="hertzbeat-ui-input"
                    aria-label="Log query panel trace id"
                  />
                  <HzInput
                    value="checkout timeout"
                    readOnly
                    width="log-query-body"
                    data-hz-ui-lab-log-query-panel-body-input="shared"
                    data-log-query-panel-body-input-owner="hertzbeat-ui-input"
                    aria-label="Log query panel body"
                  />
                </HzControlStack>
              </HzPanelSurface>
              <HzControlStack
                layout="inline-wrap"
                data-hz-ui-lab-inline-control-stack="shared"
                data-signal-query-control-stack-owner="hertzbeat-ui-control-stack"
              >
                <HzSearchFieldFrame
                  className="min-w-[180px] max-w-[220px]"
                  icon={(
                    <HzSearchFieldIcon
                      icon={Search}
                      data-hz-ui-lab-trace-search-field-icon="shared"
                      data-trace-search-field-icon-owner="hertzbeat-ui-search-field-icon"
                    />
                  )}
                  data-hz-ui-lab-trace-search-field-frame="shared"
                  data-trace-search-field-frame-owner="hertzbeat-ui-search-field-frame"
                >
                  <HzInput
                    value="checkout"
                    readOnly
                    inset="search-icon"
                    data-hz-control-baseline-component="HzInput"
                    data-hz-ui-lab-trace-search-input-inset="search-icon"
                    aria-label="Trace query service"
                  />
                </HzSearchFieldFrame>
                <HzSearchFieldFrame
                  width="log-query"
                  icon={(
                    <HzSearchFieldIcon
                      icon={Search}
                      data-hz-ui-lab-log-search-field-icon="shared"
                      data-log-search-field-icon-owner="hertzbeat-ui-search-field-icon"
                    />
                  )}
                  data-hz-ui-lab-log-search-field-frame="shared"
                  data-log-search-field-frame-owner="hertzbeat-ui-search-field-frame"
                >
                  <HzInput
                    value="service.name = checkout"
                    readOnly
                    inset="search-icon"
                    width="log-query-expression"
                    data-hz-control-baseline-component="HzInput"
                    data-hz-ui-lab-log-search-input="shared"
                    data-log-search-input-owner="hertzbeat-ui-input"
                    aria-label="Log query search"
                  />
                </HzSearchFieldFrame>
                <HzSelect
                  aria-label="Log severity filter"
                  value="WARN"
                  width="log-severity"
                  triggerTone="signal-query"
                  data-hz-ui-lab-log-severity-select="shared"
                  data-log-severity-select-owner="hertzbeat-ui-select"
                  options={[
                    { value: 'all', label: 'All levels' },
                    { value: 'ERROR', label: 'ERROR' },
                    { value: 'WARN', label: 'WARN' },
                    { value: 'INFO', label: 'INFO' }
                  ]}
                />
                <HzInput
                  value="trace-heartbeat-waterfall-live"
                  readOnly
                  width="log-query-token"
                  data-hz-control-baseline-component="HzInput"
                  data-hz-ui-lab-log-query-token-input="trace-id"
                  data-log-query-token-input-owner="hertzbeat-ui-input"
                  aria-label="Log query trace id"
                />
                <HzInput
                  value="span-db-live"
                  readOnly
                  width="log-query-token"
                  data-hz-control-baseline-component="HzInput"
                  data-hz-ui-lab-log-query-token-input="span-id"
                  data-log-query-token-input-owner="hertzbeat-ui-input"
                  aria-label="Log query span id"
                />
                <HzInput
                  value="checkout timeout"
                  readOnly
                  width="log-query-body"
                  data-hz-control-baseline-component="HzInput"
                  data-hz-ui-lab-log-query-body-input="shared"
                  data-log-query-body-input-owner="hertzbeat-ui-input"
                  aria-label="Log query body"
                />
                <HzSearchFieldFrame
                  className="min-w-[180px] max-w-[240px]"
                  icon={(
                    <HzSearchFieldIcon
                      icon={Search}
                      data-hz-ui-lab-metrics-search-field-icon="shared"
                      data-metrics-search-field-icon-owner="hertzbeat-ui-search-field-icon"
                    />
                  )}
                  data-hz-ui-lab-metrics-search-field-frame="shared"
                  data-metrics-search-field-frame-owner="hertzbeat-ui-search-field-frame"
                >
                  <HzInput
                    value="http.server.duration"
                    readOnly
                    inset="search-icon"
                    data-hz-control-baseline-component="HzInput"
                    data-hz-ui-lab-metrics-search-input="shared"
                    data-metrics-search-input-owner="hertzbeat-ui-input"
                    aria-label="Metrics query expression"
                  />
                </HzSearchFieldFrame>
                <HzInput
                  value="checkout-service"
                  readOnly
                  className="w-[180px]"
                  data-hz-control-baseline-component="HzInput"
                  data-hz-ui-lab-metrics-context-input="service-name"
                  data-metrics-context-input-owner="hertzbeat-ui-input"
                  aria-label="Metrics service filter"
                />
                <HzInput
                  value="storefront"
                  readOnly
                  className="w-[160px]"
                  data-hz-ui-lab-metrics-context-input="namespace"
                  data-metrics-context-input-owner="hertzbeat-ui-input"
                  aria-label="Metrics namespace filter"
                />
                <HzInput
                  value="trace-20260524"
                  readOnly
                  className="min-w-[180px] max-w-[240px] flex-1 font-mono"
                  data-hz-ui-lab-metrics-context-input="trace-id"
                  data-metrics-context-input-owner="hertzbeat-ui-input"
                  aria-label="Metrics trace filter"
                />
                <HzSelect
                  aria-label="Metrics aggregation"
                  value="sum"
                  width="metrics-aggregation"
                  data-hz-ui-lab-metrics-aggregation-select="shared"
                  data-metrics-aggregation-select-owner="hertzbeat-ui-select"
                  options={[
                    { value: 'avg', label: 'Avg' },
                    { value: 'sum', label: 'Sum' },
                    { value: 'max', label: 'Max' }
                  ]}
                />
                <HzSelect
                  aria-label="Metrics group by"
                  value="service_name"
                  width="metrics-group-by"
                  data-hz-ui-lab-metrics-group-by-select="shared"
                  data-metrics-group-by-select-owner="hertzbeat-ui-select"
                  options={[
                    { value: 'service_name', label: 'Service' },
                    { value: 'service_namespace', label: 'Namespace' }
                  ]}
                />
                <HzQueryActionGroup
                  data-hz-ui-lab-metrics-query-action-group="shared"
                  data-metrics-query-action-group-owner="hertzbeat-ui-query-action-group"
                >
                  <HzButton size="md" intent="primary" onClick={clearFilterClauses}>
                    <HzButtonIcon
                      icon={Play}
                      data-hz-ui-lab-metrics-query-action-icon="run"
                      data-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    Run
                  </HzButton>
                  <HzButtonLink href="#" size="md">
                    <HzButtonIcon
                      icon={RotateCcw}
                      data-hz-ui-lab-metrics-query-action-icon="reset"
                      data-metrics-query-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    Reset
                  </HzButtonLink>
                </HzQueryActionGroup>
                <HzActionGroup
                  data-hz-ui-lab-metrics-handoff-actions="shared"
                  data-metrics-handoff-actions-owner="hertzbeat-ui-action-group"
                  layout="grid-2"
                >
                  <HzButtonLink href="#" size="md" layout="full" data-hz-ui-lab-metrics-handoff-action="entity">
                    Entity
                  </HzButtonLink>
                  <HzButtonLink href="#" size="md" layout="full" data-hz-ui-lab-metrics-handoff-action="alerts">
                    Alerts
                  </HzButtonLink>
                  <HzDisabledActionShell
                    title="Missing entity id"
                    data-hz-ui-lab-metrics-disabled-handoff-owner="hertzbeat-ui-disabled-action-shell"
                    layout="full"
                  >
                    <HzButton size="md" layout="full" disabled>
                      Entity
                    </HzButton>
                  </HzDisabledActionShell>
                </HzActionGroup>
                <div
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] px-0 py-2"
                  data-hz-ui-lab-metrics-series-summary="shared"
                  data-metrics-series-summary-owner="hertzbeat-ui-stat-strip"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <span className="text-[12px] font-semibold text-[#8792a5]">Metrics series</span>
                    <HzStatusBadge
                      tone="neutral"
                      size="xs"
                      data-hz-ui-lab-metrics-series-count-badge="shared"
                      data-metrics-series-count-badge-owner="hertzbeat-ui-status-badge"
                    >
                      2 rows
                    </HzStatusBadge>
                  </div>
                  <HzStatStrip
                    columns={4}
                    data-hz-ui-lab-metrics-series-summary-strip="shared"
                    data-metrics-series-summary-strip-owner="hertzbeat-ui-stat-strip"
                    frame="panel-solid"
                  >
                    {[
                      { id: 'service', label: 'Service', value: 'checkout-api' },
                      { id: 'namespace', label: 'Namespace', value: 'storefront' },
                      { id: 'environment', label: 'Environment', value: 'prod' },
                      { id: 'group', label: 'Group by', value: 'service' },
                      { id: 'series', label: 'Series', value: '2 series' }
                    ].map(item => (
                      <HzStatCell
                        key={item.id}
                        data-hz-ui-lab-metrics-series-summary-cell={item.id}
                        data-metrics-series-summary-cell-owner="hertzbeat-ui-stat-cell"
                        label={item.label}
                        value={item.value}
                        variant="tile"
                        density="compact"
                        frame="flush"
                      />
                    ))}
                  </HzStatStrip>
                </div>
                <HzPanelSurface
                  clip
                  className="w-[520px]"
                  data-hz-ui-lab-metrics-series-data-table="shared"
                  data-metrics-series-data-table-owner="hertzbeat-ui-data-table"
                  data-hz-ui-lab-metrics-series-table-panel-surface="shared"
                  data-metrics-series-table-panel-surface-owner="hertzbeat-ui-panel-surface"
                >
                  <HzPanelHeader
                    data-hz-ui-lab-metrics-series-table-header="shared"
                    data-metrics-series-table-header-owner="hertzbeat-ui-panel-header"
                    chrome="transparent-topless"
                    title="Metrics series"
                    meta={
                      <HzStatusBadge
                        tone="neutral"
                        size="xs"
                        data-hz-ui-lab-metrics-series-table-count-badge="shared"
                        data-metrics-series-table-count-badge-owner="hertzbeat-ui-status-badge"
                      >
                        2 rows
                      </HzStatusBadge>
                    }
                  />
                  <HzPanelSection
                    data-hz-ui-lab-metrics-series-summary-section="shared"
                    data-metrics-series-summary-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzStatStrip
                      columns={4}
                      frame="panel-inset"
                      spacing="compact"
                      data-hz-ui-lab-metrics-series-summary-strip="shared"
                      data-metrics-series-summary-strip-owner="hertzbeat-ui-stat-strip"
                    >
                      {[
                        { label: 'Service', value: 'checkout-api' },
                        { label: 'Namespace', value: 'storefront' },
                        { label: 'Entity', value: 'Checkout API' },
                        { label: 'Metric', value: 'latency' }
                      ].map(item => (
                        <HzStatCell
                          key={item.label}
                          label={item.label}
                          value={item.value}
                          variant="tile"
                          density="compact"
                          data-hz-ui-lab-metrics-series-summary-cell={item.label}
                          data-metrics-series-summary-cell-owner="hertzbeat-ui-stat-cell"
                          frame="inset"
                        />
                      ))}
                    </HzStatStrip>
                  </HzPanelSection>
                  <HzPanelSection
                    divider="none"
                    data-hz-ui-lab-metrics-detail-body-section="shared"
                    data-metrics-detail-body-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzDetailRows
                      offset="top"
                      heading="Selected series"
                      data-hz-ui-lab-metrics-selected-series-context-rows="shared"
                      data-metrics-selected-series-context-rows-owner="hertzbeat-ui-detail-rows"
                      rows={[
                        { label: 'Metric', value: 'checkout.latency', meta: 'real sample evidence' },
                        { label: 'Entity', value: 'Checkout API', meta: 'entityId=7' }
                      ]}
                    />
                    <HzDetailRows
                      boundary="top"
                      heading="Metrics evidence"
                      data-hz-ui-lab-metrics-selected-series-evidence-rows="shared"
                      data-metrics-selected-series-evidence-rows-owner="hertzbeat-ui-detail-rows"
                      rows={[
                        { key: 'sample-window', title: 'Sample window', copy: '2026-05-24 02:20', meta: 'real samples' },
                        { key: 'trace', title: 'Trace', copy: 'trace-20260524', meta: 'selected series' }
                      ]}
                    />
                  </HzPanelSection>
                  <HzPanelSection
                    divider="top"
                    data-hz-ui-lab-metrics-handoff-action-section="shared"
                    data-metrics-handoff-action-section-owner="hertzbeat-ui-panel-section"
                  >
                    <HzActionGroup
                      layout="grid-2"
                      data-hz-ui-lab-metrics-detail-handoff-actions="shared"
                      data-metrics-detail-handoff-actions-owner="hertzbeat-ui-action-group"
                    >
                      <HzButtonLink href="#" size="md" layout="full">
                        Entity
                      </HzButtonLink>
                      <HzButtonLink href="#" size="md" layout="full">
                        Alerts
                      </HzButtonLink>
                      <HzButtonLink href="#" size="md" layout="full">
                        Logs
                      </HzButtonLink>
                      <HzButtonLink href="#" size="md" layout="full">
                        Traces
                      </HzButtonLink>
                    </HzActionGroup>
                  </HzPanelSection>
                  <HzDataTable
                    variant="embedded"
                    rows={[
                      { id: 'checkout-latency', name: 'checkout.latency', service: 'checkout-api', entity: 'Checkout API', entityMeta: 'entityId=7', latest: '128ms', points: 42, time: '02:55:00' },
                      { id: 'payment-errors', name: 'payment.errors', service: 'payment-api', entity: 'Payment API', entityMeta: 'entityId=9', latest: '2', points: 16, time: '02:54:30' }
                    ]}
                    getRowKey={row => row.id}
                    selectedRowKey="checkout-latency"
                    onRowClick={row => setContextMessage(`Metrics series · ${row.name} · ${row.service}`)}
                    getRowProps={row => ({
                      'data-hz-ui-lab-metrics-series-row': row.id,
                      'data-metrics-series-row-owner': 'hertzbeat-ui-data-table'
                    })}
                    columns={[
                      {
                        key: 'metric',
                        header: 'Metric',
                        render: row => <HzDataCellText variant="title" display="block">{row.name}</HzDataCellText>
                      },
                      {
                        key: 'service',
                        header: 'Service',
                        render: row => <HzDataCellText variant="value">{row.service}</HzDataCellText>
                      },
                      {
                        key: 'entity',
                        header: 'Entity',
                        render: row => (
                          <HzDataCellStack
                            display="block"
                            width="metrics-entity"
                            data-hz-ui-lab-metrics-series-entity="shared"
                            data-hz-ui-lab-metrics-series-entity-owner="hertzbeat-ui-data-cell-stack"
                          >
                            <HzDataCellText
                              variant="value"
                              display="block"
                              tone="strong"
                              weight="semibold"
                              data-hz-ui-lab-metrics-series-entity-label-owner="hertzbeat-ui-data-cell-text"
                            >
                              {row.entity}
                            </HzDataCellText>
                            <HzDataCellText
                              variant="meta"
                              display="block"
                              spacing="stack-tight"
                              casing="plain"
                              tone="success"
                              data-hz-ui-lab-metrics-series-entity-meta-owner="hertzbeat-ui-data-cell-text"
                            >
                              {row.entityMeta}
                            </HzDataCellText>
                          </HzDataCellStack>
                        )
                      },
                      {
                        key: 'latest',
                        header: 'Latest',
                        render: row => <HzDataCellText variant="value" font="mono" tone="bright" data-hz-ui-lab-metrics-series-latest-owner="hertzbeat-ui-data-cell-text">{row.latest}</HzDataCellText>
                      },
                      {
                        key: 'points',
                        header: 'Points',
                        render: row => <HzDataCellText variant="value">{row.points}</HzDataCellText>
                      },
                      {
                        key: 'time',
                        header: 'Last seen',
                        render: row => <HzDataCellText variant="timestamp">{row.time}</HzDataCellText>
                      }
                    ]}
                  />
                </HzPanelSurface>
                <HzWorkbenchLayout
                  as="div"
                  variant="metrics-series-detail"
                  data-hz-ui-lab-metrics-series-detail-layout="shared"
                  data-metrics-series-detail-layout-owner="hertzbeat-ui-workbench-layout"
                  className="w-[860px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  <HzPanelSurface
                    data-hz-ui-lab-metrics-series-detail-layout-series="shared"
                    data-metrics-series-detail-layout-series-owner="hertzbeat-ui-panel-surface"
                    padding="chart-inner"
                  >
                    <HzDataCellText variant="title" display="block">Metrics series</HzDataCellText>
                    <HzDataCellText variant="meta" display="block" spacing="stack-tight">Shared split grid primary column</HzDataCellText>
                  </HzPanelSurface>
                  <HzPanelSurface
                    data-hz-ui-lab-metrics-series-detail-layout-detail="shared"
                    data-metrics-series-detail-layout-detail-owner="hertzbeat-ui-panel-surface"
                    padding="chart-inner"
                  >
                    <HzDataCellText variant="title" display="block">Selected series</HzDataCellText>
                    <HzDataCellText variant="meta" display="block" spacing="stack-tight">320px secondary inspector</HzDataCellText>
                  </HzPanelSurface>
                </HzWorkbenchLayout>
                <HzEmptyState
                  data-hz-ui-lab-metrics-series-empty-state="shared"
                  data-metrics-series-empty-state-owner="hertzbeat-ui-empty-state"
                  title="No metrics series"
                  description="Confirm time range, entity attribution, collector, and monitor template before inspecting metrics."
                  layout="table-panel"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)]"
                />
                <HzTrendFrame
                  data-hz-ui-lab-metrics-trend-frame="shared"
                  data-metrics-trend-frame-owner="hertzbeat-ui-trend-frame"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  <HzStateNotice
                    data-hz-ui-lab-metrics-trend-empty-state="shared"
                    data-metrics-trend-empty-state-owner="hertzbeat-ui-state-notice"
                    tone="info"
                    variant="hint"
                    frame="trend-empty"
                    title="No metrics trend"
                    description="Run a query to show real sample points."
                  />
                </HzTrendFrame>
                <HzTrendFrame
                  data-hz-ui-lab-metrics-trend-bars-frame="shared"
                  data-metrics-trend-bars-frame-owner="hertzbeat-ui-trend-frame"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  {[
                    { id: 'p95', label: 'p95 latency · 128ms', heightPct: 68 },
                    { id: 'errors', label: 'errors · 2', heightPct: 34 },
                    { id: 'throughput', label: 'throughput · 320/s', heightPct: 82 }
                  ].map(item => (
                    <HzTrendBar
                      key={item.id}
                      heightPct={item.heightPct}
                      title={item.label}
                      data-hz-ui-lab-metrics-trend-bar="shared"
                      data-metrics-trend-bar-owner="hertzbeat-ui-trend-bar"
                    />
                  ))}
                </HzTrendFrame>
                <HzDataMetaText
                  data-hz-ui-lab-metrics-trend-sample-helper="shared"
                  data-metrics-trend-sample-helper-owner="hertzbeat-ui-data-meta-text"
                  display="block"
                  casing="plain"
                  spacing="trend-helper"
                >
                  3 sample points
                </HzDataMetaText>
                <HzWorkbenchLayout
                  as="div"
                  variant="metrics-chart-toolbar"
                  data-hz-ui-lab-metrics-chart-header-layout="shared"
                  data-metrics-chart-header-layout-owner="hertzbeat-ui-workbench-layout"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  <HzPanelTitleLabel
                    icon={BarChart3}
                    data-hz-ui-lab-metrics-chart-title-label="shared"
                    data-metrics-chart-title-label-owner="hertzbeat-ui-panel-title-label"
                  >
                    Trend band
                  </HzPanelTitleLabel>
                  <HzActionGroup
                    layout="end-wrap"
                    data-hz-ui-lab-metrics-chart-toolbar-actions="shared"
                    data-metrics-chart-toolbar-actions-owner="hertzbeat-ui-action-group"
                  >
                    <HzStatusBadge tone="neutral" size="xs">0 series</HzStatusBadge>
                  </HzActionGroup>
                </HzWorkbenchLayout>
                <HzPanelSurface
                  data-hz-ui-lab-metrics-chart-panel-surface="shared"
                  data-metrics-chart-panel-surface-owner="hertzbeat-ui-panel-surface"
                  data-hz-ui-lab-metrics-chart-panel-variant="chart-inner"
                  data-metrics-chart-panel-variant-owner="hertzbeat-ui-panel-surface"
                  padding="chart-inner"
                  variant="chart-inner"
                  className="w-[520px]"
                >
                  <div className="h-16 border-y border-[#252b35]" />
                </HzPanelSurface>
                <HzEChartsPanel
                  data-hz-ui-lab-metrics-echarts-panel="shared"
                  data-metrics-echarts-panel-owner="hertzbeat-ui-echarts-panel"
                  data-hz-ui-lab-metrics-echarts-edge="shared"
                  option={monitorHistoryEChartsOption}
                  edge="metrics-chart"
                  height={96}
                  tone="operator"
                  className="w-[520px]"
                />
                <HzPanelSurface
                  data-hz-ui-lab-metrics-chart-band-surface="shared"
                  data-metrics-chart-band-surface-owner="hertzbeat-ui-panel-surface"
                  padding="chart"
                  className="w-[520px]"
                >
                  <HzWorkbenchLayout
                    as="div"
                    variant="chart-stack"
                    data-hz-ui-lab-metrics-chart-stack-layout="shared"
                    data-metrics-chart-stack-layout-owner="hertzbeat-ui-workbench-layout"
                  >
                    <div className="h-10 rounded-[3px] border border-[#252b35] bg-[#10141b]" />
                  </HzWorkbenchLayout>
                </HzPanelSurface>
                <HzChipGroup
                  data-hz-ui-lab-metrics-chart-fact-chips="shared"
                  data-metrics-chart-fact-chips-owner="hertzbeat-ui-toolbar-chips"
                  align="end"
                  density="compact"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  {[
                    ['points', '24'],
                    ['latest', '128ms'],
                    ['range', '30m']
                  ].map(([label, value]) => (
                    <HzStatusBadge
                      key={label}
                      tone="neutral"
                      size="sm"
                      layout="metric-fact"
                      label={label}
                      value={value}
                      data-hz-ui-lab-metrics-chart-fact-chip="shared"
                      data-metrics-chart-fact-chip-owner="hertzbeat-ui-status-badge"
                    />
                  ))}
                </HzChipGroup>
                <HzActionGroup
                  layout="end-wrap"
                  data-hz-ui-lab-metrics-chart-toolbar-count="shared"
                  data-metrics-chart-toolbar-count-owner="hertzbeat-ui-action-group"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  <HzStatusBadge
                    tone="neutral"
                    size="xs"
                    data-hz-ui-lab-metrics-chart-series-count-badge="shared"
                  >
                    0 series
                  </HzStatusBadge>
                </HzActionGroup>
                <HzActionGroup
                  layout="end-wrap"
                  data-hz-ui-lab-metrics-chart-zoom-actions="shared"
                  data-metrics-chart-zoom-actions-owner="hertzbeat-ui-action-group"
                  className="w-[520px] border-t border-[var(--hz-ui-line-soft)] py-2"
                >
                  <HzStatusBadge
                    tone="info"
                    size="sm"
                    layout="zoom-draft"
                    label="Zoom draft"
                    value="2026-05-24 03:41:00 - 03:42:00"
                    valueFont="mono"
                    data-hz-ui-lab-metrics-chart-zoom-draft="shared"
                    data-metrics-chart-zoom-draft-owner="hertzbeat-ui-status-badge"
                  />
                  <HzButton
                    intent="ghost"
                    size="sm"
                    data-hz-ui-lab-metrics-chart-zoom-apply="shared"
                  >
                    Apply zoom
                  </HzButton>
                </HzActionGroup>
                <HzPanelSection
                  divider="top"
                  spacing="stack-2"
                  className="w-[320px]"
                  data-hz-ui-lab-metrics-secondary-context-section="shared"
                  data-metrics-secondary-context-section-owner="hertzbeat-ui-panel-section"
                  data-hz-ui-lab-metrics-collapsible-section="shared"
                  data-metrics-collapsible-section-owner="hertzbeat-ui-collapsible-section"
                >
                  <HzCollapsibleSection
                    title="Metrics evidence"
                    meta="logs / traces / alerts"
                    surface="inset"
                    data-hz-ui-lab-metrics-collapsible-shell="shared"
                  >
                    <HzDetailRows
                      heading="Collapsible body"
                      rows={[
                        { key: 'logs', title: 'Logs', copy: '12 records', meta: 'linked span' },
                        { key: 'traces', title: 'Trace', copy: 'trace-20260524', meta: 'waterfall' }
                      ]}
                    />
                  </HzCollapsibleSection>
                </HzPanelSection>
                <div
                  className="w-[320px] border-t border-[var(--hz-ui-line-soft)] px-0 py-2"
                  data-hz-ui-lab-metrics-linked-record-handoff="shared"
                  data-metrics-linked-record-handoff-owner="hertzbeat-ui-context-handoff"
                >
                  <HzContextHandoff
                    title="Metrics linked records"
                    context="logs / traces / alerts"
                    frame="flush"
                    targets={[
                      {
                        id: 'logs',
                        label: <span data-hz-ui-lab-metrics-linked-record-action="logs">Historical logs</span>,
                        description: 'Locate logs at the selected span and time window.',
                        meta: '12 rows',
                        href: '#metrics-logs',
                        tone: 'neutral'
                      },
                      {
                        id: 'traces',
                        label: <span data-hz-ui-lab-metrics-linked-record-action="traces">Trace waterfall</span>,
                        description: 'Open the full trace while preserving the span.',
                        meta: 'trace-20260524',
                        href: '#metrics-traces',
                        tone: 'info'
                      },
                      {
                        id: 'alerts',
                        label: <span data-hz-ui-lab-metrics-linked-record-action="alerts">Alert handling</span>,
                        description: 'Carry entity, service, and metric evidence into alerts.',
                        meta: '2 open',
                        href: '#metrics-alerts',
                        tone: 'critical'
                      }
                    ]}
                  />
                </div>
                <HzPanelSurface
                  clip
                  data-hz-ui-lab-metrics-detail-panel-surface="shared"
                  data-metrics-detail-panel-surface-owner="hertzbeat-ui-panel-surface"
                  data-hz-ui-lab-metrics-detail-panel-stickiness="top-4"
                  data-metrics-detail-panel-stickiness-owner="hertzbeat-ui-panel-surface"
                  stickiness="top-4"
                  className="w-[320px]"
                >
                  <HzPanelHeader
                    data-hz-ui-lab-metrics-detail-panel-header="shared"
                    data-metrics-detail-panel-header-owner="hertzbeat-ui-panel-header"
                    chrome="transparent-framed"
                    eyebrow="Metrics detail"
                    title="checkout.latency"
                    subtitle="checkout-api · Checkout API · selected series"
                    meta={<HzStatusBadge tone="success" size="xs">selected</HzStatusBadge>}
                  />
                  <div
                    className="border-t border-[var(--hz-ui-line-soft)] px-0 py-2"
                    data-hz-ui-lab-metrics-detail-rows="shared"
                  >
                    <HzDetailRows
                      heading="Metrics evidence"
                      rows={[
                        { key: 'entity', title: 'Entity', copy: 'Checkout API', meta: 'hertzbeat.entity_id=7' },
                        { key: 'sample-window', title: 'Sample window', copy: '2026-05-24 02:20', meta: 'real samples' },
                        { key: 'trace', title: 'Trace', copy: 'trace-20260524', meta: 'selected series' }
                      ]}
                      data-metrics-detail-rows-owner="hertzbeat-ui-detail-rows"
                    />
                  </div>
                </HzPanelSurface>
                <HzAssistiveMarker
                  data-hz-ui-lab-metrics-detail-panel-empty="shared"
                  data-metrics-detail-panel-empty-owner="hertzbeat-ui-assistive-marker"
                />
                <HzStatStrip
                  columns={3}
                  className="w-[320px] rounded-[3px] border border-[var(--hz-ui-line-soft)] p-1"
                  data-hz-ui-lab-metrics-detail-stats="shared"
                  data-metrics-detail-stats-owner="hertzbeat-ui-stat-strip"
                >
                  {[
                    { id: 'non-empty', label: 'Non-empty', value: '2', tone: 'success' as const },
                    { id: 'total', label: 'Series', value: '3', tone: 'info' as const },
                    { id: 'state', label: 'State', value: 'Ready', tone: 'neutral' as const }
                  ].map(item => (
                    <HzStatCell
                      key={item.id}
                      data-hz-ui-lab-metrics-detail-stat={item.id}
                      data-metrics-detail-stat-owner="hertzbeat-ui-stat-cell"
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                      variant="tile"
                      density="compact"
                      className="border-0"
                    />
                  ))}
                </HzStatStrip>
                <HzAttributeDiagnostics
                  data-hz-ui-lab-metrics-attribution-diagnostics="shared"
                  data-metrics-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
                  title="Metrics attribution"
                  namespaceLabel="hertzbeat.*"
                  frame="embedded"
                  rows={[
                    {
                      key: 'metrics-entity',
                      label: 'hertzbeat.entity_id',
                      value: '7',
                      meta: 'present',
                      state: 'present',
                      stateLabel: 'Present',
                      tone: 'success'
                    },
                    {
                      key: 'metrics-workspace',
                      label: 'hertzbeat.workspace_id',
                      value: '-',
                      meta: 'missing',
                      state: 'missing',
                      stateLabel: 'Missing',
                      tone: 'critical'
                    }
                  ]}
                  className="w-[320px]"
                />
                <div
                  className="w-[320px] border-t border-[var(--hz-ui-line-soft)] px-0"
                  data-hz-ui-lab-metrics-entity-context-rows="shared"
                >
                  <HzDetailRows
                    heading="Entity context"
                    padding="compact-y"
                    rows={[
                      { key: 'entity', title: 'Entity', copy: 'Checkout API', meta: 'entityId 7' },
                      { key: 'service', title: 'Service', copy: 'checkout-service', meta: 'storefront' },
                      { key: 'source', title: 'Source', copy: 'OTLP', meta: 'metrics route' }
                    ]}
                    data-metrics-entity-context-rows-owner="hertzbeat-ui-detail-rows"
                  />
                </div>
                <HzQueryTokenField
                  width="compact"
                  value="trace-20260523"
                  readOnly
                  aria-label="Trace query token"
                  fieldProps={{
                    'data-hz-ui-lab-trace-query-token-field': 'shared',
                    'data-trace-query-token-field-owner': 'hertzbeat-ui-query-token-field'
                  }}
                />
                <HzQueryStatusSelect
                  width="compact"
                  value="error"
                  aria-label="Trace query status"
                  data-hz-ui-lab-trace-query-status-select="shared"
                  data-trace-query-status-select-owner="hertzbeat-ui-query-status-select"
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'error', label: 'Errors' }
                  ]}
                />
                <HzQueryActionGroup
                  data-hz-ui-lab-trace-query-action-group="shared"
                  data-trace-query-action-group-owner="hertzbeat-ui-query-action-group"
                >
                  <HzButton size="sm" intent="primary" onClick={clearFilterClauses}>
                    <HzButtonIcon
                      icon={Play}
                      data-hz-ui-lab-trace-query-action-icon="run"
                      data-trace-query-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    Run
                  </HzButton>
                  <HzButton size="sm" intent="secondary" onClick={() => setContextMessage('Trace query reset')}>
                    <HzButtonIcon
                      icon={RotateCcw}
                      data-hz-ui-lab-trace-query-action-icon="reset"
                      data-trace-query-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    Reset
                  </HzButton>
                </HzQueryActionGroup>
              </HzControlStack>
              <HzControlStack
                layout="end-inline"
                data-hz-ui-lab-time-control-stack="shared"
                data-signal-time-control-stack-owner="hertzbeat-ui-control-stack"
                data-hz-ui-lab-metrics-time-control-stack="shared"
                data-metrics-time-control-stack-owner="hertzbeat-ui-control-stack"
              >
                <HzDataMetaText data-hz-ui-lab-time-control-stack-copy="shared" display="block" casing="plain">
                  Right-aligned time rail
                </HzDataMetaText>
                <TimeRangeControl
                  value={uiLabTraceTimeRangeControlValue}
                  onApply={() => undefined}
                  onRefresh={() => undefined}
                  showAbsoluteFields
                  variant="narrow-rail"
                  data-hz-ui-lab-time-range-control="narrow-rail"
                  data-signal-time-range-control-owner="hertzbeat-shared-time-range-control"
                  data-metrics-time-range-control-owner="hertzbeat-shared-time-range-control"
                />
              </HzControlStack>
              <HzWorkbenchHeaderCopy
                className="w-[220px]"
                eyebrow="Observability"
                title="Trace workbench"
                copy="Compact route heading for signal workbenches."
                data-hz-ui-lab-trace-header-copy="shared"
                data-trace-header-copy-owner="hertzbeat-ui-workbench-header-copy"
              />
              <HzSignalWorkbenchShell
                as="section"
                className="min-h-0 w-[220px]"
                contentClassName="px-3 py-3"
                data-hz-ui-lab-signal-workbench-shell="shared"
                data-signal-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"
              >
                <HzPanelSurface className="px-3 py-3">
                  <HzDataMetaText display="block" casing="plain">Shared signal shell</HzDataMetaText>
                </HzPanelSurface>
              </HzSignalWorkbenchShell>
              <HzSignalWorkbenchShell
                as="section"
                className="min-h-0 w-[240px]"
                layout="metrics-workbench"
                data-hz-ui-lab-metrics-workbench-shell="shared"
                data-metrics-workbench-shell-owner="hertzbeat-ui-signal-workbench-shell"
              >
                <HzPanelSurface
                  padding="query"
                  data-hz-ui-lab-metrics-workbench-shell-panel="shared"
                  data-metrics-workbench-shell-panel-owner="hertzbeat-ui-panel-surface"
                >
                  <HzDataMetaText display="block" casing="plain">Shared metrics shell</HzDataMetaText>
                </HzPanelSurface>
              </HzSignalWorkbenchShell>
              <HzControlStack
                className="w-[150px]"
                data-hz-ui-lab-log-detail-action-stack="shared"
                data-log-detail-action-stack-owner="hertzbeat-ui-control-stack"
              >
                <HzButton size="sm" intent="secondary">
                  Open log
                </HzButton>
                <HzButton size="sm" intent="secondary">
                  Open trace
                </HzButton>
              </HzControlStack>
              <HzDetailAside
                className="w-[150px]"
                data-hz-ui-lab-log-detail-aside="shared"
                data-log-detail-aside-owner="hertzbeat-ui-detail-aside"
              >
                <HzPanelHeader
                  data-hz-ui-lab-log-detail-aside-header="shared"
                  eyebrow="Selected"
                  title="checkout"
                  className="-mx-4 -mt-4 border-x-0 border-t-0 bg-transparent"
                />
                <HzDetailBodyStack
                  data-hz-ui-lab-log-detail-body-stack="shared"
                  data-log-detail-body-stack-owner="hertzbeat-ui-detail-body-stack"
                >
                  <HzDetailRows rows={[{ key: 'trace', title: 'traceId', copy: 'trace-20260523' }]} />
                </HzDetailBodyStack>
              </HzDetailAside>
              <div className="w-[112px]" data-hz-control-baseline-component="HzNumberStepper">
                <HzNumberStepper value="60" onValueChange={() => setContextMessage('Baseline stepper')} />
              </div>
              <span data-hz-control-baseline-component="HzCheckbox">
                <HzCheckbox defaultChecked label="Enabled" />
              </span>
              <span data-hz-control-baseline-component="HzSwitch">
                <HzSwitch checked label="Running" />
              </span>
              <span
                data-hz-control-baseline-component="HzFileInput"
                data-hz-ui-lab-monitor-import-file-input="shared"
              >
                <HzFileInput aria-label="Baseline import file input" />
              </span>
            </div>
          </section>
          <HzMonitorFilterBar
            searchLabel="Search"
            searchPlaceholder="Search monitor name / instance"
            searchValue={monitorFilterSearch}
            onSearchChange={setMonitorFilterSearch}
            searchClearLabel="Clear search"
            onSearchClear={() => {
              setMonitorFilterSearch('');
              setContextMessage('Monitor search cleared');
            }}
            searchClearButtonProps={
              {
                'data-hz-ui-lab-monitor-search-clear': 'shared',
                'data-monitor-search-clear-owner': 'hertzbeat-ui-icon-button'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['searchClearButtonProps']
            }
            searchInputProps={
              {
                'data-hz-ui-lab-monitor-search-enter-submit': 'shared',
                'data-monitor-search-enter-submit-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['searchInputProps']
            }
            labelFilterLabel="Labels"
            labelFilterPlaceholder="Filter by labels"
            labelFilterValue={monitorFilterLabels}
            onLabelFilterChange={value => {
              setMonitorFilterLabels(value);
              setContextMessage('Monitor labels filter changed');
            }}
            labelFilterClearLabel="Clear labels"
            onLabelFilterClear={() => {
              setMonitorFilterLabels('');
              setContextMessage('Monitor labels cleared');
            }}
            labelFilterClearButtonProps={
              {
                'data-hz-ui-lab-monitor-label-clear': 'shared',
                'data-monitor-label-clear-owner': 'hertzbeat-ui-icon-button'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['labelFilterClearButtonProps']
            }
            labelFilterInputProps={
              {
                'data-hz-ui-lab-monitor-label-filter': 'shared',
                'data-monitor-label-filter-owner': 'hertzbeat-ui-input',
                'data-hz-ui-lab-monitor-label-enter-submit': 'shared',
                'data-monitor-label-enter-submit-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['labelFilterInputProps']
            }
            typeLabel="Monitor type"
            typeValue={monitorFilterType}
            typeOptions={monitorFilterTypeOptions}
            onTypeChange={setMonitorFilterType}
            typeSelectProps={
              {
                'data-hz-ui-lab-monitor-app-autosubmit': 'shared',
                'data-monitor-app-filter-autosubmit-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['typeSelectProps']
            }
            typePickerLabel="Browse monitor apps"
            onTypePickerOpen={() => setContextMessage('Monitor app picker opened')}
            typePickerButtonProps={
              {
                'data-hz-ui-lab-monitor-filter-picker': 'shared',
                'data-monitor-filter-picker-owner': 'hertzbeat-ui-button'
              } as React.ButtonHTMLAttributes<HTMLButtonElement>
            }
            statusLabel="Status"
            statusValue={monitorFilterStatus}
            statusOptions={monitorFilterStatusOptions}
            onStatusChange={setMonitorFilterStatus}
            statusSelectProps={
              {
                'data-hz-ui-lab-monitor-status-autosubmit': 'shared',
                'data-monitor-status-filter-autosubmit-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzMonitorFilterBar>['statusSelectProps']
            }
            applyLabel="Apply"
            clearLabel="Clear"
            onApply={() => setContextMessage(`Monitor filter · ${monitorFilterType || 'all'} · ${monitorFilterStatus || 'all'}`)}
            onClear={() => {
              setMonitorFilterSearch('');
              setMonitorFilterLabels('');
              setMonitorFilterType('');
              setMonitorFilterStatus('');
            }}
          />
          <HzInlineFeedback
            tone="info"
            title="Monitor auto refresh"
            description="Refreshes the current monitor query every 120 seconds."
            meta="120s"
            variant="embedded"
            data-hz-ui-lab-monitor-auto-refresh="shared"
            data-monitor-auto-refresh-owner="hertzbeat-ui-inline-feedback"
            data-monitor-auto-refresh-interval-ms="120000"
          />
          <HzQueryBar
            query={query}
            onQueryChange={setQuery}
            actions={
              <>
                <HzButton size="sm">
                  <Search size={13} />
                  Run
                </HzButton>
                <HzButton size="sm" intent="ghost">
                  <SlidersHorizontal size={13} />
                  Options
                </HzButton>
              </>
            }
          />
        </div>
      }
      metricStrip={
        <HzMetricStrip
          items={[
            { label: 'Active monitors', value: '123', hint: '+8 today' },
            { label: 'Templates', value: '42', hint: '6 hidden' },
            { label: 'Collector p95', value: '118ms', hint: 'stable' },
            { label: 'Open alerts', value: '7', hint: '2 critical' }
          ]}
        />
      }
    >
      <div
        className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_500px] 2xl:grid-cols-[minmax(0,1fr)_520px]"
        data-ui-lab-surface="signoz-inspired-explorer"
      >
        <section className="min-w-0 border-r border-[var(--hz-ui-line-soft)]">
          <HzResultControls
            timeRanges={resultTimeRanges}
            selectedTimeRangeId={timeRangeId}
            onTimeRangeChange={setTimeRangeId}
            refreshIntervals={resultRefreshIntervals}
            selectedRefreshIntervalId={refreshIntervalId}
            onRefreshIntervalChange={setRefreshIntervalId}
            viewModes={resultViewModes}
            selectedViewModeId={viewModeId}
            onViewModeChange={setViewModeId}
            columns={resultColumns}
            onToggleColumn={toggleResultColumn}
            onPinColumn={pinResultColumn}
          />
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] lg:grid-cols-3">
            <HzStatCell
              data-hz-ui-lab-signal-summary-stat="shared"
              label="Collection success"
              value="99.2"
              unit="%"
              detail="last 15m · 128 monitors"
              trend="+0.4"
              tone="success"
              variant="tile"
              className="border-x-0 border-y-0 lg:border-r lg:border-[var(--hz-ui-line-soft)]"
            />
            <HzStatStrip
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] p-2 lg:col-span-2 lg:border-r lg:border-t-0"
              data-hz-ui-lab-dialog-stage-stats="shared"
              data-signal-dialog-stage-stats-owner="hertzbeat-ui-stat-strip"
            >
              {[
                { id: 'span', label: 'Current span', value: 'db.query', tone: 'info' as const },
                { id: 'errors', label: 'Error spans', value: '1', tone: 'critical' as const },
                { id: 'events', label: 'Events', value: '3', tone: 'neutral' as const },
                { id: 'links', label: 'Links', value: '2', tone: 'neutral' as const }
              ].map(item => (
                <HzStatCell
                  key={item.id}
                  data-signal-dialog-stage-stat-owner="hertzbeat-ui-stat-cell"
                  data-signal-dialog-stage-stat={item.id}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                  variant="tile"
                  density="compact"
                />
              ))}
            </HzStatStrip>
            <HzChipGroup
              boundary="top"
              className="lg:border-r"
              data-hz-ui-lab-dialog-toolbar-chips="shared"
              data-signal-dialog-toolbar-chips-owner="hertzbeat-ui-toolbar-chips"
            >
              <HzDialogMetaItem
                width="service"
                data-hz-ui-lab-dialog-subtitle-meta="shared"
                data-signal-dialog-subtitle-owner="hertzbeat-ui-dialog-meta-item"
              >
                checkout-api
              </HzDialogMetaItem>
              <HzStatusBadge
                data-signal-dialog-toolbar-badge-owner="hertzbeat-ui-status-badge"
                tone="neutral"
                size="xs"
              >
                JSON
              </HzStatusBadge>
              <HzStatusBadge
                data-signal-dialog-toolbar-badge-owner="hertzbeat-ui-status-badge"
                tone="info"
                size="xs"
              >
                SPAN
              </HzStatusBadge>
              <HzDialogMetaItem
                width="trace-id"
                data-hz-ui-lab-trace-drawer-meta-item="shared"
                data-signal-dialog-toolbar-meta-owner="hertzbeat-ui-dialog-meta-item"
              >
                traceId · trace-20260523
              </HzDialogMetaItem>
              <HzDialogMetaItem
                width="duration"
                data-signal-dialog-stage-meta-owner="hertzbeat-ui-dialog-meta-item"
              >
                checkout · 120ms
              </HzDialogMetaItem>
            </HzChipGroup>
            <HzActionGroup
              data-hz-ui-lab-dialog-action-group="shared"
              data-signal-dialog-action-group-owner="hertzbeat-ui-action-group"
              density="inline"
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] p-2 lg:border-r lg:border-t-0"
            >
              <HzButton size="sm" intent="ghost" onClick={clearFilterClauses}>
                View log
              </HzButton>
              <HzButton size="sm" intent="ghost" onClick={clearFilterClauses}>
                Open trace
              </HzButton>
            </HzActionGroup>
            <HzDialogBodyLayout
              data-hz-ui-lab-dialog-body-layout="shared"
              data-signal-dialog-body-layout-owner="hertzbeat-ui-dialog-body-layout"
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] p-2 lg:border-r lg:border-t-0"
            >
              <HzDialogBodyLayout
                variant="split-detail"
                data-hz-ui-lab-dialog-split-layout="shared"
                data-signal-dialog-split-layout-owner="hertzbeat-ui-dialog-body-layout"
              >
                <div className="min-w-0 text-[12px] font-semibold text-[var(--hz-ui-text)]">Trace timeline</div>
                <HzDialogBodyLayout
                  variant="side-stack"
                  data-hz-ui-lab-dialog-side-stack="shared"
                  data-signal-dialog-side-stack-owner="hertzbeat-ui-dialog-body-layout"
                >
                  <HzDataMetaText display="block" casing="plain">
                    Selected span facts
                  </HzDataMetaText>
                </HzDialogBodyLayout>
              </HzDialogBodyLayout>
              <HzDialogBodyLayout
                variant="waterfall-detail"
                data-hz-ui-lab-dialog-waterfall-layout="shared"
                data-signal-dialog-waterfall-layout-owner="hertzbeat-ui-dialog-body-layout"
              >
                <div className="min-w-0 text-[12px] font-semibold text-[var(--hz-ui-text)]">Waterfall lanes</div>
                <HzDialogBodyLayout
                  variant="side-stack"
                  data-hz-ui-lab-dialog-waterfall-side-stack="shared"
                  data-signal-dialog-waterfall-side-stack-owner="hertzbeat-ui-dialog-body-layout"
                >
                  <HzDataMetaText display="block" casing="plain">
                    Waterfall selected span
                  </HzDataMetaText>
                </HzDialogBodyLayout>
              </HzDialogBodyLayout>
            </HzDialogBodyLayout>
            <HzDialogEventNotice
              layout="grid-cell"
              data-hz-ui-lab-dialog-event-detail="shared"
              data-signal-dialog-event-detail-owner="hertzbeat-ui-dialog-event-notice"
              title="exception"
              description={(
                <HzDialogEventText
                  data-signal-dialog-event-detail-copy="span-event-not-span"
                  data-hz-ui-lab-dialog-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                >
                  Event marker belongs to the selected span timeline.
                </HzDialogEventText>
              )}
              meta={(
                <HzDialogEventText
                  variant="meta"
                  data-signal-dialog-event-detail-meta="span-event-label"
                  data-hz-ui-lab-dialog-event-detail-text-owner="hertzbeat-ui-dialog-event-text"
                >
                  Span event
                </HzDialogEventText>
              )}
              actions={(
                <HzButton
                  data-signal-dialog-event-detail-action="view-span"
                  size="sm"
                  intent="ghost"
                  onClick={clearFilterClauses}
                >
                  View span
                </HzButton>
              )}
              tone="info"
              variant="hint"
            />
            <HzPanelHeader
              data-hz-ui-lab-signal-panel-header="shared"
              data-signal-panel-header-owner="hertzbeat-ui-panel-header"
              title={(
                <>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Recent signals
                </>
              )}
              subtitle="Dense table header with shared meta/action slot."
              meta={<HzStatusBadge tone="neutral" size="xs">8 rows</HzStatusBadge>}
              className="border-x-0 border-b border-t-0 bg-transparent lg:border-r"
            />
            <HzPanelHeader
              data-hz-ui-lab-signal-detail-panel-header="shared"
              data-signal-detail-panel-header-owner="hertzbeat-ui-panel-header"
              eyebrow="Detail panel"
              title="Checkout API"
              subtitle="trace-20260523 · span-root"
              meta={<HzStatusBadge tone="success" size="xs">selected</HzStatusBadge>}
              className="border-x-0 border-b border-t-0 bg-transparent lg:border-r"
            />
            <HzPanelSurface
              padding="query"
              data-hz-ui-lab-metrics-header-panel-surface="shared"
              data-metrics-header-panel-surface-owner="hertzbeat-ui-panel-surface"
              className="w-full max-w-[1120px]"
            >
              <HzWorkbenchLayout
                as="div"
                variant="metrics-header"
                data-hz-ui-lab-metrics-header-layout="shared"
                data-metrics-header-layout-owner="hertzbeat-ui-workbench-layout"
              >
                <HzWorkbenchHeaderCopy
                  density="compact"
                  eyebrow="Metrics workbench"
                  title="OTLP metrics"
                  data-hz-ui-lab-metrics-header-copy="shared"
                  data-metrics-header-copy-owner="hertzbeat-ui-workbench-header-copy"
                >
                  <HzChipGroup
                    density="compact"
                    spacing="top-3"
                    data-hz-ui-lab-metrics-header-context-strip="shared"
                    data-metrics-header-context-strip-owner="hertzbeat-ui-toolbar-chips"
                  >
                    <HzStatusBadge
                      tone="neutral"
                      size="sm"
                      layout="context-pill"
                      label="service"
                      value="checkout-api"
                      data-hz-ui-lab-metrics-header-context-pill="shared"
                      data-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"
                    />
                    <HzStatusBadge
                      tone="info"
                      size="sm"
                      layout="context-pill"
                      label="namespace"
                      value="storefront"
                      data-hz-ui-lab-metrics-header-context-pill="shared"
                      data-metrics-header-context-pill-owner="hertzbeat-ui-status-badge"
                    />
                  </HzChipGroup>
                </HzWorkbenchHeaderCopy>
                <HzActionGroup
                  data-hz-ui-lab-metrics-header-panel-return-action-group="shared"
                  data-metrics-header-panel-return-action-group-owner="hertzbeat-ui-action-group"
                  layout="full-end"
                >
                  <HzButtonLink
                    data-hz-ui-lab-metrics-header-panel-return-action="shared"
                    data-metrics-header-panel-return-action-owner="hertzbeat-ui-button-link"
                    href="#"
                    size="md"
                  >
                    <HzButtonIcon
                      icon={GitBranch}
                      data-hz-ui-lab-metrics-header-panel-return-action-icon="shared"
                      data-metrics-header-panel-return-action-icon-owner="hertzbeat-ui-button-icon"
                    />
                    Metrics return
                  </HzButtonLink>
                </HzActionGroup>
              </HzWorkbenchLayout>
            </HzPanelSurface>
            <HzWorkbenchLayout
              as="div"
              variant="header-actions"
              data-hz-ui-lab-signal-header-actions-layout="shared"
              data-signal-header-actions-layout-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b border-t-0 p-2 lg:border-r"
            >
              <div className="min-w-0">
                <HzDataMetaText display="block" casing="upper">
                  Trace workbench
                </HzDataMetaText>
                <div className="mt-1 text-[13px] font-semibold text-[var(--hz-ui-text)]">Header title and copy</div>
              </div>
              <HzActionGroup
                data-hz-ui-lab-log-header-return-action-group="shared"
                data-log-header-return-action-group-owner="hertzbeat-ui-action-group"
                layout="full-end"
              >
                <HzButtonLink
                  data-hz-ui-lab-log-header-return-action="shared"
                  data-log-header-return-action-owner="hertzbeat-ui-button-link"
                  href="#"
                  size="md"
                >
                  <HzButtonIcon
                    icon={GitBranch}
                    data-hz-ui-lab-log-header-return-action-icon="shared"
                    data-log-header-return-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  Return
                </HzButtonLink>
                <HzButtonLink
                  data-hz-ui-lab-metrics-header-return-action="shared"
                  data-metrics-header-return-action-owner="hertzbeat-ui-button-link"
                  href="#"
                  size="md"
                >
                  <HzButtonIcon
                    icon={GitBranch}
                    data-hz-ui-lab-metrics-header-return-action-icon="shared"
                    data-metrics-header-return-action-icon-owner="hertzbeat-ui-button-icon"
                  />
                  Metrics return
                </HzButtonLink>
                <HzButton size="sm" intent="ghost">Collector</HzButton>
                <HzButton size="sm" intent="secondary">Template</HzButton>
              </HzActionGroup>
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              as="div"
              variant="header-toolbar-slot"
              data-hz-ui-lab-metrics-header-toolbar-slot="shared"
              data-metrics-header-toolbar-slot-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b border-t-0 px-3 py-2 lg:border-r"
            >
              <HzWorkbenchLayout
                as="div"
                variant="time-toolbar"
                data-hz-ui-lab-signal-time-toolbar-layout="shared"
                data-signal-time-toolbar-layout-owner="hertzbeat-ui-workbench-layout"
                data-hz-ui-lab-metrics-time-toolbar-layout="shared"
                data-metrics-time-toolbar-layout-owner="hertzbeat-ui-workbench-layout"
              >
                <HzDataMetaText data-hz-ui-lab-time-toolbar-copy="shared" display="block" casing="plain">
                  Last 30 minutes / Asia/Shanghai / manual refresh
                </HzDataMetaText>
                <HzActionGroup
                  data-hz-ui-lab-time-toolbar-actions="shared"
                  data-hz-ui-lab-metrics-time-toolbar-actions="shared"
                  data-metrics-time-toolbar-actions-owner="hertzbeat-ui-action-group"
                  className="justify-end"
                >
                  <HzButtonLink href="#" size="md">
                    Refresh
                  </HzButtonLink>
                </HzActionGroup>
              </HzWorkbenchLayout>
            </HzWorkbenchLayout>
            <HzPanelSurface
              data-hz-ui-lab-panel-surface="shared"
              data-hz-ui-lab-panel-surface-padding="view-switch"
              data-hz-ui-lab-log-view-switch-panel-surface="shared"
              data-log-view-switch-panel-surface-owner="hertzbeat-ui-panel-surface"
              padding="view-switch"
            >
              <HzWorkbenchLayout
                as="div"
                variant="view-switch"
                data-hz-ui-lab-log-view-switch-layout="shared"
                data-log-view-switch-layout-owner="hertzbeat-ui-workbench-layout"
              >
                <HzDataMetaText data-hz-ui-lab-log-view-switch-title="shared" display="block" casing="plain">
                  Stream / history
                </HzDataMetaText>
                <HzActionGroup
                  layout="end-wrap"
                  data-hz-ui-lab-log-view-switch-actions="shared"
                  data-log-view-switch-actions-owner="hertzbeat-ui-action-group"
                >
                  <HzButton size="sm" intent="primary">Stream</HzButton>
                  <HzButton size="sm" intent="secondary">History</HzButton>
                </HzActionGroup>
              </HzWorkbenchLayout>
            </HzPanelSurface>
            <HzPanelSurface
              data-hz-ui-lab-log-stream-stage-panel-surface="shared"
              data-log-stream-stage-panel-surface-owner="hertzbeat-ui-panel-surface"
              data-hz-ui-lab-panel-surface-clip="stream-stage"
              clip
            >
              <HzWorkbenchLayout
                as="div"
                variant="stream-stage"
                data-hz-ui-lab-log-stream-stage-layout="shared"
                data-log-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"
                className="border-x-0 border-b border-t-0 lg:border-r"
              >
                <div data-hz-ui-lab-log-stream-stage-viewport="shared" className="hb-scrollbar max-h-[620px] overflow-auto">
                  <div className="divide-y divide-[var(--hz-ui-line-soft)]">
                    {['ERROR', 'WARN', 'INFO'].map((severity, index) => (
                      <HzLogStreamLiveRow
                        key={severity}
                        selected={index === 0}
                        className="h-10 text-[12px]"
                        data-hz-ui-lab-log-stream-row="shared"
                        data-log-stream-row-owner="hertzbeat-ui-log-stream-row"
                        data-hz-ui-lab-log-stream-stage-row={severity.toLowerCase()}
                      >
                        <HzStatusBadge tone={index === 0 ? 'critical' : index === 1 ? 'warning' : 'info'}>
                          {severity}
                        </HzStatusBadge>
                        <span className="truncate font-mono text-[11px] text-[#7f8a9d]">21:24:{16 + index}</span>
                        <span className="min-w-0 truncate font-mono text-[var(--hz-ui-text)]">checkout event {index + 1}</span>
                        <span className="hidden min-w-0 items-center gap-2 text-[11px] text-[#7f8a9d] sm:flex">
                          checkout-api
                        </span>
                      </HzLogStreamLiveRow>
                    ))}
                  </div>
                </div>
                <HzDetailAside
                  data-hz-ui-lab-log-stream-stage-detail="shared"
                  data-log-stream-stage-detail-owner="hertzbeat-ui-detail-aside"
                >
                  <HzPanelHeader
                    data-hz-ui-lab-log-stream-stage-detail-header="shared"
                    eyebrow="Selected log"
                    title="checkout timeout"
                    className="-mx-4 -mt-4 border-x-0 border-t-0 bg-transparent"
                  />
                  <HzDetailBodyStack
                    data-hz-ui-lab-log-stream-stage-detail-body="shared"
                    data-log-stream-stage-detail-body-owner="hertzbeat-ui-detail-body-stack"
                  >
                    <HzDetailRows rows={[{ key: 'trace', title: 'traceId', copy: 'trace-20260523' }]} />
                  </HzDetailBodyStack>
                </HzDetailAside>
              </HzWorkbenchLayout>
            </HzPanelSurface>
            <HzWorkbenchLayout
              as="div"
              variant="summary-trend"
              data-hz-ui-lab-signal-summary-trend-layout="shared"
              data-signal-summary-trend-layout-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b border-t-0 p-2 lg:border-r"
            >
              {[
                { id: 'total', label: 'Traces', value: 42, tone: 'info' as const },
                { id: 'errors', label: 'Errors', value: 3, tone: 'warning' as const },
                { id: 'rows', label: 'Rows', value: 8, tone: 'neutral' as const },
                { id: 'latest', label: 'Latest', value: 'now', tone: 'success' as const }
              ].map(item => (
                <HzStatCell
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                  variant="tile"
                  data-hz-ui-lab-summary-trend-stat={item.id}
                />
              ))}
              <HzSignalTrendBars
                data-hz-ui-lab-summary-trend-bars="shared"
                title="Trace trend"
                meta="4 points"
                bars={[
                  { id: '00:00', label: '00:00', value: 1, tone: 'info' },
                  { id: '00:05', label: '00:05', value: 4, tone: 'success' },
                  { id: '00:10', label: '00:10', value: 2, tone: 'warning' },
                  { id: '00:15', label: '00:15', value: 6, tone: 'critical' }
                ]}
              />
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              variant="table-detail"
              data-hz-ui-lab-signal-table-detail-layout="shared"
              data-signal-table-detail-layout-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b border-t-0 p-2 lg:border-r"
            >
              <HzPanelSurface
                className="min-h-20 px-3 py-2 shadow-none"
                clip
                data-hz-ui-lab-table-detail-panel="table"
                data-hz-ui-lab-panel-surface-clip="shared"
              >
                <HzDataMetaText display="block" casing="plain">
                  Recent traces table
                </HzDataMetaText>
              </HzPanelSurface>
              <HzPanelSurface
                className="min-h-20 px-3 py-2 shadow-none"
                clip
                data-hz-ui-lab-table-detail-panel="detail"
                data-hz-ui-lab-panel-surface-clip="shared"
              >
                <HzDataMetaText display="block" casing="plain">
                  Selected trace detail
                </HzDataMetaText>
              </HzPanelSurface>
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              as="div"
              variant="detail-stack"
              data-hz-ui-lab-signal-detail-stack-layout="shared"
              data-signal-detail-stack-layout-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b border-t-0 lg:border-r"
            >
              <HzDetailRows
                data-hz-ui-lab-detail-stack-rows="shared"
                rows={[
                  { key: 'service', title: 'Service', copy: 'checkout-api' },
                  { key: 'duration', title: 'Duration', copy: '120ms' }
                ]}
              />
              <HzAttributeDiagnostics
                data-hz-ui-lab-detail-stack-diagnostics="shared"
                title="Attribution diagnostics"
                rows={[
                  {
                    key: 'entity-id',
                    label: 'hertzbeat.entity_id',
                    value: 'entity-checkout',
                    meta: 'Resolved from resource',
                    state: 'present',
                    stateLabel: 'Present',
                    tone: 'success'
                  }
                ]}
              />
            </HzWorkbenchLayout>
            <HzWorkbenchLayout
              as="div"
              variant="detail-footer"
              data-hz-ui-lab-signal-detail-footer-layout="shared"
              data-signal-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"
              className="border-x-0 border-b lg:border-r"
            >
              <HzStateNotice
                data-hz-ui-lab-detail-footer-alert-hint="shared"
                title="Alert context remains attached to this trace."
                variant="hint"
              />
              <HzStateNotice
                data-hz-ui-lab-detail-footer-signal-hint="shared"
                title="Trace, log, and metric handoffs use the same context."
                variant="hint"
              />
              <HzButtonLink data-hz-ui-lab-detail-footer-action="shared" href="#" size="md">
                <HzButtonIcon
                  icon={Timer}
                  data-hz-ui-lab-detail-footer-action-icon="logs"
                  data-trace-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"
                />
                Open logs
              </HzButtonLink>
            </HzWorkbenchLayout>
            <HzPanelHeader
              data-hz-ui-lab-signal-stream-stage-header="shared"
              data-signal-stream-stage-header-owner="hertzbeat-ui-panel-header"
              eyebrow="Log stream"
              title="Live log stream"
              meta={(
                <>
                  <HzStatusBadge tone="success" size="xs">connected</HzStatusBadge>
                  <HzStatusBadge tone="neutral" size="xs">128 rows</HzStatusBadge>
                </>
              )}
              actions={(
                <>
                  <HzButton size="sm" intent="secondary">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Reconnect
                  </HzButton>
                  <HzButton size="sm" intent="ghost">
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Pause
                  </HzButton>
                </>
              )}
              className="border-x-0 border-b border-t-0 bg-transparent lg:border-r"
            />
            <HzStateNotice
              data-hz-ui-lab-signal-stream-notice="shared"
              data-signal-stream-notice-owner="hertzbeat-ui-state-notice"
              data-signal-stream-notice-kind="paused"
              tone="warning"
              title="Stream is paused; buffered entries stay visible until you resume."
              variant="embedded"
              className="border-x-0 border-b border-t-0 bg-[#17140b] lg:border-r"
            />
            <HzStateNotice
              data-hz-ui-lab-signal-stream-helper="shared"
              data-signal-stream-helper-owner="hertzbeat-ui-state-notice"
              data-signal-stream-helper-kind="selected-empty"
              tone="info"
              title="Select any log to inspect full content, trace context, and entity context."
              variant="hint"
              className="border-x-0 border-b border-t-0 bg-transparent lg:border-r"
            />
            <HzSignalTrendBars
              data-hz-ui-lab-signal-trend-bars="shared"
              title="Signal trend"
              meta="4 points"
              bars={[
                { id: '00:00', label: '00:00', value: 2, tone: 'info' },
                { id: '00:05', label: '00:05', value: 5, tone: 'success' },
                { id: '00:10', label: '00:10', value: 3, tone: 'warning' },
                { id: '00:15', label: '00:15', value: 7, tone: 'critical' }
              ]}
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-r lg:border-t-0"
            />
            <div
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] px-0 py-2 lg:border-r lg:border-t-0"
              data-hz-ui-lab-signal-detail-rows="shared"
            >
              <HzDetailRows
                heading="Signal evidence"
                rows={[
                  { key: 'service', title: 'Service', copy: 'checkout-api', meta: 'resource.service.name' },
                  { key: 'trace', title: 'Trace ID', copy: 'trace-20260523', meta: 'current selection' }
                ]}
                data-signal-detail-rows-owner="hertzbeat-ui-detail-rows"
              />
            </div>
            <div
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] px-0 py-2 lg:border-r lg:border-t-0"
              data-hz-ui-lab-signal-dialog-detail-rows="shared"
            >
              <HzDetailRows
                heading="Dialog selection"
                rows={[
                  { key: 'span', title: 'Selected span', copy: 'payment.validate', meta: 'side drawer' },
                  { key: 'event', title: 'Selected event', copy: 'exception', meta: '+72 ms' }
                ]}
                data-signal-dialog-detail-rows-owner="hertzbeat-ui-detail-rows"
              />
            </div>
            <HzStateNotice
              data-hz-ui-lab-signal-dialog-warning="shared"
              data-signal-dialog-warning-owner="hertzbeat-ui-state-notice"
              data-signal-dialog-warning-kind="attached-state"
              tone="warning"
              title="This log was detached from the live stream; inspect the preserved payload before handoff."
              variant="embedded"
              className="rounded-[6px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)]"
            />
            <HzAttributeDiagnostics
              data-hz-ui-lab-attribute-diagnostics="shared"
              data-signal-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
              title="Attribution diagnostics"
              namespaceLabel="hertzbeat.*"
              rows={[
                {
                  key: 'entity',
                  label: 'hertzbeat.entity_id',
                  value: 'entity-1',
                  meta: 'present',
                  state: 'present',
                  stateLabel: 'Present',
                  tone: 'success'
                },
                {
                  key: 'collector',
                  label: 'hertzbeat.collector',
                  value: '-',
                  meta: 'missing',
                  state: 'missing',
                  stateLabel: 'Missing',
                  tone: 'critical'
                }
              ]}
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-r lg:border-t-0"
            />
            <HzAttributeDiagnostics
              data-hz-ui-lab-dialog-attribute-diagnostics="shared"
              data-signal-dialog-attribute-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
              title="Dialog attribution"
              namespaceLabel="hertzbeat.*"
              rows={[
                {
                  key: 'dialog-entity',
                  label: 'hertzbeat.entity_id',
                  value: 'entity-dialog',
                  meta: 'selected log',
                  state: 'present',
                  stateLabel: 'Present',
                  tone: 'success'
                },
                {
                  key: 'dialog-template',
                  label: 'hertzbeat.template',
                  value: '-',
                  meta: 'disabled handoff',
                  state: 'missing',
                  stateLabel: 'Missing',
                  tone: 'critical'
                }
              ]}
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-r lg:border-t-0"
            />
            <HzEmptyState
              data-hz-ui-lab-signal-empty-state="shared"
              data-signal-empty-state-owner="hertzbeat-ui-empty-state"
              title="No matching signals"
              description="Widen the time range or clear signal filters."
              actions={<HzButton size="sm" intent="ghost" onClick={clearFilterClauses}>Clear</HzButton>}
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-r lg:border-t-0"
            />
            <div
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:col-span-2 lg:border-r"
              data-hz-ui-lab-signal-data-table="shared"
              data-signal-data-table-owner="hertzbeat-ui-data-table"
            >
              <HzDataTable
                variant="embedded"
                rows={[
                  { id: 'log-001', time: '16:48:12', service: 'checkout-api', state: 'ERROR', trace: 'trace-91f2' },
                  { id: 'trace-002', time: '16:48:10', service: 'payment-api', state: 'OK', trace: 'trace-77a4' }
                ]}
                getRowKey={row => row.id}
                selectedRowKey="log-001"
                onRowClick={row => setContextMessage(`Signal row · ${row.service} · ${row.trace}`)}
                getRowProps={row => ({ 'data-signal-data-table-row': row.id })}
                columns={[
                  { key: 'time', header: 'Time', width: '112px', render: row => <span className="font-mono">{row.time}</span> },
                  { key: 'service', header: 'Service', render: row => <span className="font-semibold text-[#edf3fb]">{row.service}</span> },
                  {
                    key: 'state',
                    header: 'State',
                    width: '96px',
                    render: row => <HzStatusBadge tone={row.state === 'ERROR' ? 'critical' : 'success'} size="xs">{row.state}</HzStatusBadge>
                  },
                  { key: 'trace', header: 'Trace', width: '140px', render: row => <span className="font-mono text-[#8f99ab]">{row.trace}</span> }
                ]}
              />
            </div>
            <HzBarGauge
              title="Collector saturation"
              value={68}
              min={0}
              max={100}
              unit="%"
              tone="info"
              thresholds={[
                { value: 80, label: 'warn', tone: 'warning' },
                { value: 90, label: 'critical', tone: 'critical' }
              ]}
              detail="collector-a pool"
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-r lg:border-t-0"
            />
            <HzThresholdRail
              title="p95 latency"
              value={118}
              min={0}
              max={200}
              unit="ms"
              thresholds={[
                { value: 120, label: 'warn', tone: 'warning' },
                { value: 180, label: 'critical', tone: 'critical' }
              ]}
              className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] lg:border-t-0"
            />
          </div>
          <div
            className="grid min-w-0 gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-3 lg:grid-cols-[minmax(0,1fr)_260px]"
            data-hz-ui-lab-monitor-panel-primitives="shared"
          >
            <HzMonitorStatGrid
              items={[
                { label: 'Latest value', value: '25' },
                { label: 'Delta', value: '+10', tone: 'success' },
                { label: 'Range', value: '10 - 29' }
              ]}
            />
            <HzMonitorSignalBars
              items={[
                { label: 'usage', value: '72 %', widthPercent: 72, tone: 'info' },
                { label: 'idle', value: '28 %', widthPercent: 28, tone: 'neutral' }
              ]}
            />
          </div>
          <HzTimeDistributionChart
            title="Signal volume"
            buckets={signalVolumeBuckets}
            selectedBucketId={selectedSignalBucket.id}
            hiddenSegmentIds={hiddenSignalSegmentIds}
            onBucketSelect={bucket => {
              setSelectedSignalBucketId(bucket.id);
              setChartWindowSource('signal-volume');
              setContextMessage(`图表窗口: ${bucket.id} · signal volume`);
            }}
            onLegendToggle={segment => {
              const hidden = hiddenSignalSegmentIds.includes(segment.id);
              setHiddenSignalSegmentIds(previous => (hidden ? previous.filter(id => id !== segment.id) : [...previous, segment.id]));
              setContextMessage(`图例: ${segment.id} ${hidden ? 'shown' : 'hidden'} · signal volume`);
            }}
            className="border-x-0 border-t-0"
          />
          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] px-3 py-2 text-[11px]"
            data-hz-ui="chart-time-window-handoff"
            data-hz-chart-window-source={chartWindowSource}
            data-hz-chart-window-bucket={selectedSignalBucket.id}
            data-hz-chart-window-point={selectedLatencyPoint?.id || ''}
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-[#f3f6fb]">Chart window</div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-[#8f99ab]">
                {selectedSignalBucket.label} · {selectedLatencyPoint?.series.label || 'series'} {selectedLatencyPoint?.point.value || '-'}ms
              </div>
            </div>
            <div className="shrink-0 font-mono text-[10px] text-[#727b8c]">handoff</div>
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <HzTimeSeriesChart
              title="Collector latency"
              unit="milliseconds"
              series={collectorLatencySeries}
              selectedPointId={selectedLatencyPointId}
              hiddenSeriesIds={hiddenLatencySeriesIds}
              onPointSelect={(point, series) => {
                setSelectedLatencyPointId(`${series.id}:${point.label}`);
                setSelectedSignalBucketId(point.label);
                setChartWindowSource('collector-latency');
                setContextMessage(`图表窗口: ${series.id} ${point.label} · ${point.value}ms`);
              }}
              onLegendToggle={series => {
                const hidden = hiddenLatencySeriesIds.includes(series.id);
                setHiddenLatencySeriesIds(previous => (hidden ? previous.filter(id => id !== series.id) : [...previous, series.id]));
                setContextMessage(`图例: ${series.id} ${hidden ? 'shown' : 'hidden'} · collector latency`);
              }}
              height={128}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <HzStatusTimeline
              title="Availability timeline"
              rows={availabilityTimelineRows}
              className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)]" data-hz-ui-lab-monitor-history-chart="shared">
            <div
              className="min-w-0"
              data-hz-ui-lab-monitor-history-time-toolbar="shared"
              data-hz-ui-lab-time-foundation="shared-platform-time-context"
              data-hz-ui-lab-time-foundation-scope="monitor-metrics-logs-traces-alerts-otlp"
              data-hz-ui-lab-time-foundation-models="quick-relative-absolute-recent-custom-validation"
              data-hz-ui-lab-time-foundation-url-contract="from-to-refresh-live-timezone"
              data-hz-ui-lab-time-foundation-datazoom="preview-apply-reset"
              data-hz-ui-lab-time-foundation-datazoom-live="echarts-native"
              data-hz-ui-lab-time-foundation-readiness="platform-grade-monitor-history"
              data-hz-ui-lab-time-foundation-checks="single-line-dark-quick-relative-absolute-manual-timezone-refresh-recent-custom-validation-datazoom"
              data-monitor-history-time-toolbar-owner="hertzbeat-ui-time-range-toolbar"
              data-monitor-history-datazoom-feedback="time-toolbar"
            >
              <HzTimeRangePreviewHandoff
                state={timeFoundationPreviewSource ? 'preview' : 'applied'}
                source={timeFoundationPreviewSource || 'query-time'}
                from={timeFoundationValue.from || timeFoundationValue.start}
                to={timeFoundationValue.to || timeFoundationValue.end}
                simulateLabel={t('ui-lab.time-range.simulate-zoom')}
                applyLabel={t('ui-lab.time-range.apply-query')}
                resetLabel={t('time.range.reset')}
                onSimulate={() => {
                  setTimeFoundationValue(uiLabChartZoomPreviewValue);
                  setTimeFoundationPreviewSource('chart-datazoom');
                  setTimeRangeId('1h');
                  setRefreshIntervalId('30s');
                  setContextMessage('Monitor history zoom preview');
                }}
                onApply={() => {
                  setTimeFoundationPreviewSource(undefined);
                  setContextMessage('Monitor history zoom applied');
                }}
                onReset={() => {
                  setTimeFoundationValue(uiLabDefaultTimeFoundationValue);
                  setTimeFoundationPreviewSource(undefined);
                  setTimeRangeId('15m');
                  setRefreshIntervalId('30s');
                  setContextMessage('Monitor history zoom reset');
                }}
                className="relative z-[60] bg-[var(--hz-ui-surface-graphite)] px-3"
                data-hz-ui-lab-time-foundation-datazoom-handoff="shared"
              />
              <HzTimeRangeToolbar
                value={timeFoundationValue}
                showAbsoluteFields
                absoluteFieldsLayout="inline"
                absoluteInputMode="datetime-local"
                timeRangePickerMode="single"
                railLayout="nowrap"
                previewSource={timeFoundationPreviewSource}
                timePickerDefaultOpen
                presets={timeFoundationPresets}
                refreshOptions={timeFoundationRefreshOptions}
                recentRanges={timeFoundationRecentRanges}
                recentStorageKey="hertzbeat.uiLab.timeRange.recent"
                customRanges={timeFoundationCustomRanges}
                customStorageKey="hertzbeat.uiLab.timeRange.custom"
                labels={timeFoundationLabels}
                onApply={nextValue => {
                  const nextRange = (nextValue.timeRange || 'last-15m').replace(/^last-/, '');
                  setTimeFoundationValue(nextValue);
                  setTimeFoundationPreviewSource(undefined);
                  setTimeRangeId(nextRange);
                  setRefreshIntervalId(uiLabTimeContextRefreshToRefreshId(nextValue.refresh));
                  setContextMessage(`Monitor history time · ${nextRange} · ${nextValue.refresh || 'manual'}`);
                }}
                onRefresh={() => setContextMessage(`Monitor history refresh · ${timeRangeId}`)}
                onReset={() => {
                  setTimeFoundationValue(uiLabDefaultTimeFoundationValue);
                  setTimeFoundationPreviewSource(undefined);
                  setTimeRangeId('15m');
                  setRefreshIntervalId('30s');
                  setContextMessage('Monitor history time reset');
                }}
                presetOptionDataAttribute="data-monitor-history-time-range-option"
                refreshActionProps={{ 'data-monitor-history-refresh-action': 'true' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
              />
            </div>
            <div
              className="flex min-h-10 items-center border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
              data-hz-ui-lab-monitor-history-mode-tabs="shared"
              data-monitor-history-mode-owner="hertzbeat-ui-tabs"
              data-monitor-history-mode-active={historyAggregationModeId === 'aggregated' ? 'aggregated' : 'raw'}
            >
              <HzSegmentedTabs
                activeId={historyAggregationModeId}
                items={[
                  { id: 'raw', label: 'Raw' },
                  { id: 'aggregated', label: 'Aggregated' }
                ]}
                onSelect={value => {
                  setHistoryAggregationModeId(value);
                  setContextMessage(`Monitor history mode · ${value}`);
                }}
              />
            </div>
            <HzActionGroup
              layout="split"
              data-hz-ui-lab-monitor-history-controls="shared"
              data-hz-ui-lab-monitor-fullscreen-frame="shared"
            >
              <HzActionGroup density="inline">
                <HzUnderlineToggle
                  selected
                  selectionAttrName="data-chart-selected"
                  data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
                  onClick={() => setContextMessage('Monitor history chart series · mean')}
                >
                  Mean
                </HzUnderlineToggle>
                <HzUnderlineToggle
                  selected={false}
                  selectionAttrName="data-chart-selected"
                  data-monitor-history-toggle-owner="hertzbeat-ui-underline-toggle"
                  onClick={() => setContextMessage('Monitor history chart series · max')}
                >
                  Max
                </HzUnderlineToggle>
              </HzActionGroup>
              <HzActionGroup density="inline">
                <HzButton
                  size="sm"
                  intent="ghost"
                  data-monitor-history-control-owner="hertzbeat-ui-button"
                  onClick={() => setContextMessage('Monitor history latest point')}
                >
                  Latest point
                </HzButton>
                <HzButton
                  size="sm"
                  intent="ghost"
                  data-monitor-history-control-owner="hertzbeat-ui-button"
                  onClick={() => setHistoryFullscreenOpen(true)}
                >
                  Fullscreen
                </HzButton>
              </HzActionGroup>
            </HzActionGroup>
            <HzActionGroup
              layout="stack"
              density="inline"
              data-hz-ui-lab-monitor-history-action-stack="shared"
              data-monitor-history-line-action-stack-owner="hertzbeat-ui-action-group"
            >
              <HzActionGroup density="inline">
                <HzButton
                  size="sm"
                  intent="ghost"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  onClick={() => setContextMessage('Monitor history chart · primary only')}
                >
                  Primary only
                </HzButton>
                <HzButton
                  size="sm"
                  intent="ghost"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  onClick={() => setContextMessage('Monitor history chart · show all')}
                >
                  Show all stats
                </HzButton>
              </HzActionGroup>
              <HzActionGroup density="inline">
                <HzButton
                  size="sm"
                  intent="secondary"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  onClick={() => setContextMessage('Monitor history chart · mean')}
                >
                  Mean
                </HzButton>
                <HzButton
                  size="sm"
                  intent="ghost"
                  data-monitor-history-line-control-owner="hertzbeat-ui-button"
                  onClick={() => setContextMessage('Monitor history chart · max')}
                >
                  Max
                </HzButton>
              </HzActionGroup>
            </HzActionGroup>
            {historyFullscreenOpen ? (
              <HzMonitorFullscreenFrame
                title="Monitor history"
                kicker="History chart"
                closeLabel="Exit fullscreen"
                onClose={() => setHistoryFullscreenOpen(false)}
                data-monitor-history-fullscreen-owner="hertzbeat-ui-fullscreen-frame"
              >
                <HzMonitorHistoryChartCard
                  cardKey="fullscreen:responseTime"
                  heading="Monitor history · responseTime"
                  unit="ms"
                  selected
                  option={monitorHistoryEChartsOption}
                  height={220}
                  footer="61 samples"
                />
              </HzMonitorFullscreenFrame>
            ) : null}
            <HzMonitorEvidenceFrame
              className="border-b-0"
              data-hz-ui-lab-monitor-evidence-frame="shared"
              data-monitor-history-chart-frame-owner="hertzbeat-ui-evidence-frame"
              data-hz-ui-lab-monitor-history-refresh-contract="angular-first-page-reload"
              data-hz-ui-lab-monitor-history-selection-reset="angular-chart-reload"
            >
              <HzMonitorHistoryChartGrid layout="single" data-hz-ui-lab-monitor-history-chart-grid="shared">
                <HzMonitorHistoryChartCard
                  cardKey="summary:responseTime"
                  heading="Monitor history · responseTime"
                  unit="ms"
                  selected
                  option={monitorHistoryEChartsOption}
                  height={220}
                  footer="61 samples"
                  actions={
                    <HzMonitorMetricFavoriteAction
                      active
                      label="Remove favorite"
                      data-hz-ui-lab-monitor-history-favorite-action="shared"
                    />
                  }
                  zoomActionLabel="Apply as query time"
                  zoomActionProps={{ 'data-monitor-history-zoom-apply': 'local-to-query-time' } as React.ButtonHTMLAttributes<HTMLButtonElement>}
                  onZoomAction={() => setContextMessage('Monitor history zoom · responseTime')}
                  onDataZoomChange={() => {
                    setTimeFoundationValue(uiLabChartZoomPreviewValue);
                    setTimeFoundationPreviewSource('chart-datazoom');
                    setContextMessage('Monitor history native zoom preview');
                  }}
                  surfaceClassName="min-h-[336px] border-y-0"
                />
              </HzMonitorHistoryChartGrid>
              <HzMonitorIncrementalLoadFooter
                visibleCount={6}
                totalCount={14}
                hasMore
                loadMoreLabel="Load more charts"
                completeLabel="All charts loaded"
                onLoadMore={() => setContextMessage('History charts incremental load')}
                data-hz-ui-lab-monitor-history-incremental-load="angular-chart-sentinel"
                data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
                data-monitor-detail-incremental-mode="angular-chart-sentinel"
                data-monitor-detail-incremental-scope="history"
              />
            </HzMonitorEvidenceFrame>
            <HzMonitorEvidenceFrame
              variant="media"
              data-hz-ui-lab-monitor-media-frame="shared"
              data-monitor-detail-grafana-frame-owner="hertzbeat-ui-evidence-frame"
              data-hz-ui-lab-monitor-detail-grafana-action-contract="angular-edit-config-delete-dashboard"
            >
              <iframe title="grafana-dashboard-preview" src="about:blank" />
            </HzMonitorEvidenceFrame>
            <HzActionGroup
              density="inline"
              data-hz-ui-lab-monitor-detail-grafana-actions="shared"
              data-monitor-detail-grafana-actions-owner="hertzbeat-ui-action-group"
              data-monitor-detail-grafana-actions-contract="angular-dashboard-actions"
            >
              <HzButtonLink
                href="/monitors/42/edit?app=website"
                size="sm"
                data-monitor-detail-grafana-config-owner="hertzbeat-ui-button-link"
                data-monitor-detail-grafana-config-action="monitor-edit-grafana"
              >
                Configure dashboard
              </HzButtonLink>
              <HzButton
                intent="danger"
                size="sm"
                data-monitor-detail-grafana-delete-owner="hertzbeat-ui-button"
                data-monitor-detail-grafana-delete-action="delete-dashboard"
                data-hz-ui-lab-monitor-detail-grafana-delete-teardown="angular-hide-tab"
              >
                Delete dashboard
              </HzButton>
            </HzActionGroup>
            <div
              className="border-b border-[var(--hz-ui-line-soft)] px-0 py-2"
              data-hz-ui-lab-monitor-history-selectable-rows="shared"
            >
              <HzSelectableRows
                heading="Series samples"
                rows={[
                  { key: 'origin', title: 'origin', copy: '128', meta: '14:20' },
                  { key: 'p95', title: 'p95', copy: '144', meta: '14:25' }
                ]}
                selectedKey="origin"
                selectionAttrName="data-series-selected"
                onSelect={key => setContextMessage(`Monitor history series · ${key}`)}
              />
            </div>
            <div
              className="border-b border-[var(--hz-ui-line-soft)] px-0 py-2"
              data-hz-ui-lab-monitor-history-detail-rows="shared"
            >
              <HzDetailRows
                heading="Selected point"
                rows={[
                  { key: 'latest', title: 'Latest value', copy: '128', meta: '14:20' },
                  { key: 'delta', title: 'Delta', copy: '+8', meta: 'origin' }
                ]}
                data-monitor-history-summary-owner="hertzbeat-ui-detail-rows"
              />
            </div>
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)]" data-hz-ui-lab-monitor-basic-card="shared">
            <HzMonitorBasicCard
              heading="Monitoring Basic"
              editHref="/monitors/640360126405888/edit"
              editLabel="Edit monitor"
              data-monitor-basic-owner="hertzbeat-ui-basic-card"
              className="px-0 py-0"
              surfaceClassName="rounded-none border-x-0 border-y-0"
            >
              <HzMonitorBasicSummary
                name="mysql-prod-01"
                statusLabel="available"
                statusTone="success"
                facts={[
                  { label: 'Host', value: '127.0.0.1:3306' },
                  { label: 'Type', value: 'MYSQL' },
                  { label: 'Collector', value: 'collector-a' },
                  { label: 'Updated', value: '14:25:31' }
                ]}
                metaRows={[
                  { label: 'Instance', value: 'mysql-prod-01' },
                  { label: 'Schedule', value: '60s · static' }
                ]}
                labels={[
                  { label: 'env', value: 'prod' },
                  { label: 'region', value: 'cn' }
                ]}
                annotations={[{ label: 'owner', value: 'sre' }]}
                labelHeading="Labels"
                annotationHeading="Annotations"
              />
            </HzMonitorBasicCard>
          </div>
          <HzMonitorDetailSignalList
            className="border-b border-[var(--hz-ui-line-soft)]"
            data-hz-ui-lab-monitor-signal-list="shared"
            data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"
            data-monitor-detail-realtime-payload-errors="card-local"
            data-hz-ui-lab-monitor-realtime-payload-errors="card-local"
            data-hz-ui-lab-monitor-realtime-selection-reset="angular-table-reload"
          >
            <HzMonitorMetricCardGrid
              className="grid min-w-0 lg:grid-cols-1"
              data-hz-ui-lab-monitor-metric-card="shared"
              data-monitor-detail-card-grid-rhythm="shared-tight"
            >
              <HzMonitorMetricCard
                title="Realtime metric · basic"
                columns={[
                  { key: 'responseTime', title: 'responseTime' },
                  { key: 'status', title: 'status' },
                  { key: 'collector', title: 'collector' }
                ]}
                rows={[
                  { key: 'mysql-prod-01', label: 'mysql-prod-01', values: ['118ms', 'available', 'collector-a'] },
                  { key: 'linux-edge-03', label: 'linux-edge-03', values: ['72ms', 'collecting', 'collector-b'] }
                ]}
                selected
                labelHeader="Resource"
                actions={
                  <HzMonitorMetricFavoriteAction
                    active
                    label="Remove favorite"
                    onClick={() => setContextMessage('Realtime metric favorite · remove')}
                    data-hz-ui-lab-monitor-metric-favorite-action="shared"
                    data-monitor-detail-signal-row-action="favorite"
                  />
                }
                onSelect={() => setContextMessage('Realtime metric card · basic')}
                data-monitor-detail-metric-card-owner="hertzbeat-ui-metric-card"
                data-monitor-detail-signal-card="true"
                data-monitor-detail-signal-card-chrome="hertzbeat-ui-metric-card"
                data-monitor-detail-signal-row="basic"
                data-monitor-detail-signal-row-density="shared-metric-card"
                data-monitor-detail-signal-selected-style="left-rail"
                className="px-0 py-0"
                surfaceClassName="rounded-none border-x-0 border-y-0 bg-transparent"
              />
            </HzMonitorMetricCardGrid>
            <HzMonitorIncrementalLoadFooter
              visibleCount={10}
              totalCount={24}
              hasMore
              loadMoreLabel="Load more metrics"
              completeLabel="All metrics loaded"
              onLoadMore={() => setContextMessage('Realtime metrics incremental load')}
              data-hz-ui-lab-monitor-incremental-load="angular-sentinel"
              data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
              data-monitor-detail-incremental-mode="angular-sentinel"
            />
          </HzMonitorDetailSignalList>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] px-3 py-2" data-hz-ui-lab-monitor-realtime-toolbar="shared">
            <HzMonitorRealtimeToolbar
              compact
              facts={[{ title: 'Collect time', copy: '14:25:31' }]}
              expandLabel="Fullscreen"
              onExpand={() => setContextMessage('Realtime metric fullscreen')}
              data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] px-3 py-2" data-hz-ui-lab-monitor-realtime-inspector="shared">
            <HzMonitorRealtimeInspector
              variant="details"
              label="Active row"
              value="host=db-1"
              stats={[
                { label: 'Fields', value: '2' },
                { label: 'Labels', value: '1' }
              ]}
              rows={[
                { label: 'labels', value: 'host=db-1', meta: 'payload' },
                { label: 'usage', value: '72', meta: '%' },
                { label: 'idle', value: '28', meta: '%' }
              ]}
              data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] px-3 py-2" data-hz-ui-lab-monitor-realtime-row-nav="shared">
            <HzMonitorRealtimeRowNavigator
              label="Row 1 / 2 · host=db-1"
              previousLabel="Previous"
              nextLabel="Next"
              canPrevious={false}
              canNext
              onNext={() => setContextMessage('Realtime row navigation · next')}
              data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] px-3 py-2" data-hz-ui-lab-monitor-row-nav="shared">
            <HzMonitorRowNavigator
              label="Series 2 / 4 · mysql-prod-01"
              previousLabel="Previous series"
              nextLabel="Next series"
              canPrevious
              canNext
              onPrevious={() => setContextMessage('Monitor row navigation · previous')}
              onNext={() => setContextMessage('Monitor row navigation · next')}
              data-monitor-history-row-nav-owner="hertzbeat-ui-row-navigator"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)]" data-hz-ui-lab-monitor-control-band="shared">
            <HzMonitorControlBand
              title="Compare scope"
              variant="embedded"
              actions={
                <>
                  <HzButton intent="ghost" size="sm" onClick={() => setContextMessage('Compare scope · selected only')}>
                    Selected only
                  </HzButton>
                  <HzButton intent="ghost" size="sm" onClick={() => setContextMessage('Compare scope · all')}>
                    All
                  </HzButton>
                </>
              }
            >
              <HzUnderlineToggle selected selectionAttrName="data-compare-selected">
                basic.max_connections
              </HzUnderlineToggle>
              <HzUnderlineToggle selected={false} selectionAttrName="data-compare-selected">
                cache.query_cache_hit_rate
              </HzUnderlineToggle>
            </HzMonitorControlBand>
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)]" data-hz-ui-lab-monitor-favorites="shared">
            <HzMonitorFavoriteSurface
              value={favoriteMode}
              options={[
                { value: 'realtime', label: 'Realtime favorites' },
                { value: 'history', label: 'History favorites' }
              ]}
              selectorLabel="Favorite scope"
              message="Added to favorites successfully"
              onValueChange={value => {
                setFavoriteMode(value);
                setContextMessage(`Favorite scope · ${value}`);
              }}
              data-monitor-detail-favorite-owner="hertzbeat-ui-favorite-surface"
              data-monitor-detail-favorite-feedback-copy="angular-favorite-copy"
              data-hz-ui-lab-monitor-favorite-feedback="angular-copy"
              data-hz-ui-lab-monitor-favorite-set-semantics="angular-set"
              data-hz-ui-lab-monitor-favorite-active-fallback="angular-subselector-sticky"
              data-hz-ui-lab-monitor-favorite-history-reload-reset="angular-chart-reload"
              data-hz-ui-lab-monitor-favorite-empty-contract="angular-subselector-empty"
              data-hz-ui-lab-monitor-favorite-history-source="favorite-history-chart-payloads"
              data-hz-ui-lab-monitor-favorite-history-controls="angular-chart-toolbox"
              data-hz-ui-lab-monitor-favorite-realtime-incremental-load="angular-favorite-sentinel"
              data-hz-ui-lab-monitor-favorite-history-incremental-load="angular-favorite-chart-sentinel"
              data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
              data-monitor-detail-incremental-mode="angular-favorite-chart-sentinel"
              data-monitor-detail-incremental-scope="favorite-history"
              className="border-x-0 border-y-0"
            >
              {favoriteMode === 'realtime' ? (
                <HzMonitorFavoritePane
                  kind="realtime"
                  data-hz-ui-lab-monitor-favorite-pane="shared"
                  data-hz-monitor-favorite-demo="realtime"
                >
                  {['basic', 'availability', 'responseTime'].map(name => (
                    <button
                      key={name}
                      type="button"
                      className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left hover:bg-[var(--hz-ui-surface-soft)]"
                      onClick={() => setContextMessage(`Favorite metric · ${name}`)}
                    >
                      <span className="min-w-0 truncate text-[12px] font-semibold text-[#dbe4f0]">{name}</span>
                      <span className="font-mono text-[10px] text-[#727b8c]">realtime</span>
                    </button>
                  ))}
                  <HzMonitorIncrementalLoadFooter
                    visibleCount={3}
                    totalCount={7}
                    hasMore
                    loadMoreLabel="Load more favorite metrics"
                    onLoadMore={() => setContextMessage('Favorite realtime incremental load')}
                    data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
                    data-monitor-detail-incremental-mode="angular-favorite-sentinel"
                    data-monitor-detail-incremental-scope="favorite-realtime"
                  />
                </HzMonitorFavoritePane>
              ) : (
                <HzMonitorFavoritePane
                  kind="history"
                  data-hz-ui-lab-monitor-favorite-pane="shared"
                  data-hz-monitor-favorite-demo="history"
                >
                  {['cpu.usage', 'memory.used'].map(name => (
                    <button
                      key={name}
                      type="button"
                      className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left hover:bg-[var(--hz-ui-surface-soft)]"
                      onClick={() => setContextMessage(`Favorite history · ${name}`)}
                    >
                      <span className="min-w-0 truncate text-[12px] font-semibold text-[#dbe4f0]">{name}</span>
                      <span className="font-mono text-[10px] text-[#727b8c]">history</span>
                    </button>
                  ))}
                  <HzMonitorIncrementalLoadFooter
                    visibleCount={6}
                    totalCount={11}
                    hasMore
                    loadMoreLabel="Load more favorite charts"
                    completeLabel="All favorite charts loaded"
                    onLoadMore={() => setContextMessage('Favorite history charts incremental load')}
                    data-hz-ui-lab-monitor-favorite-history-incremental-load="angular-favorite-chart-sentinel"
                    data-monitor-detail-incremental-owner="hertzbeat-ui-incremental-load-footer"
                    data-monitor-detail-incremental-mode="angular-favorite-chart-sentinel"
                    data-monitor-detail-incremental-scope="favorite-history"
                  />
                </HzMonitorFavoritePane>
              )}
            </HzMonitorFavoriteSurface>
            <HzMonitorFavoriteSurface
              value="history"
              options={[
                { value: 'realtime', label: 'Realtime favorites' },
                { value: 'history', label: 'History favorites' }
              ]}
              selectorLabel="Favorite scope"
              data-hz-ui-lab-monitor-favorite-empty-teardown="angular-empty-no-sentinel"
              data-hz-ui-lab-monitor-favorite-empty-contract="angular-subselector-empty"
              data-monitor-detail-favorite-empty-contract="angular-subselector-empty"
              className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)]"
            >
              <HzEmptyState
                title="No history favorites"
                data-monitor-detail-empty-owner="hertzbeat-ui-empty-state"
                data-monitor-detail-empty-scope="favorite-history"
                data-monitor-detail-favorite-empty-teardown="angular-empty-no-sentinel"
              />
            </HzMonitorFavoriteSurface>
          </div>
          <HzMonitorDetailConsoleShell
            data-hz-ui-lab-monitor-detail-console-shell="shared"
            data-hz-ui-lab-monitor-detail-scrape-context="angular-nonstatic-scrape-as-app"
            data-hz-ui-lab-monitor-detail-history-catalog-load="angular-tab-click-lazy"
            data-hz-ui-lab-monitor-detail-history-tab-load="angular-click-load-metric-chart"
            data-hz-ui-lab-monitor-detail-realtime-tab-load="angular-click-load-real-time-metric"
            data-hz-ui-lab-monitor-detail-favorite-tab-load="angular-click-load-favorite-metrics"
            data-hz-ui-lab-monitor-detail-grafana-fallback-tab="angular-previous-data-tab"
            data-monitor-console-layout="angular-workbench"
            data-monitor-first-viewport-rhythm="angular-tight"
            data-monitor-detail-history-catalog-load="angular-tab-click-lazy"
            data-monitor-detail-history-tab-load="angular-click-load-metric-chart"
            data-monitor-detail-realtime-tab-load="angular-click-load-real-time-metric"
            data-monitor-detail-favorite-tab-load="angular-click-load-favorite-metrics"
            data-monitor-detail-grafana-fallback-tab="angular-previous-data-tab"
          >
            <HzMonitorBreadcrumb
              data-hz-ui-lab-monitor-inline-context="shared"
              data-hz-ui-lab-monitor-breadcrumb="shared"
              data-monitor-detail-header-mode="breadcrumb-only"
              data-monitor-detail-scrape-context="angular-nonstatic-scrape-as-app"
            >
              <span>Overview</span>
              <span>/</span>
              <Link
                href="/monitors?app=mysql"
                data-hz-ui-lab-monitor-detail-list-return="angular-app-filter"
                data-monitor-detail-list-return="angular-app-filter"
                data-monitor-detail-list-return-target="/monitors?app=mysql"
              >
                Monitors
              </Link>
              <span>/</span>
              <span>Monitor detail</span>
              <HzInlineContextMark
                component="a"
                href="/setting/define?app=mysql"
                placement="breadcrumb"
                data-monitor-detail-context-mark="breadcrumb"
                data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"
                data-hz-ui-lab-monitor-app-definition-link="angular-monitor-app"
                data-monitor-detail-app-definition-link="angular-monitor-app"
                data-monitor-detail-app-definition-target="/setting/define?app=mysql"
              >
                MySQL
              </HzInlineContextMark>
            </HzMonitorBreadcrumb>
            <HzMonitorDetailWorkbenchFrame
              data-hz-ui-lab-monitor-detail-workbench-frame="shared"
              data-monitor-workbench-stage="angular-layout"
              tabs={
                <HzMonitorDetailTabs
                  data-hz-ui-lab-monitor-detail-tabs="shared"
                  data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"
                  items={[
                    {
                      key: 'realtime',
                      label: (
                        <HzMonitorDetailTabLabel
                          tabKey="realtime"
                          icon={Activity}
                          data-hz-ui-lab-monitor-detail-tab-label="shared"
                        >
                          Realtime
                        </HzMonitorDetailTabLabel>
                      )
                    },
                    {
                      key: 'history',
                      label: (
                        <HzMonitorDetailTabLabel
                          tabKey="history"
                          icon={BarChart3}
                          data-hz-ui-lab-monitor-detail-tab-label="shared"
                        >
                          History
                        </HzMonitorDetailTabLabel>
                      )
                    },
                    {
                      key: 'favorites',
                      label: (
                        <HzMonitorDetailTabLabel
                          tabKey="favorites"
                          icon={Star}
                          data-hz-ui-lab-monitor-detail-tab-label="shared"
                        >
                          Favorites
                        </HzMonitorDetailTabLabel>
                      )
                    },
                    {
                      key: 'grafana',
                      label: 'Grafana'
                    }
                  ]}
                  selectedKey={monitorDetailTabId}
                  onSelect={value => {
                    setMonitorDetailTabId(value);
                    setContextMessage(`Monitor detail tab · ${value}`);
                  }}
                  panelIdPrefix="ui-lab-monitor-detail"
                  extra={
                    <HzActionGroup
                      layout="end-wrap"
                      density="inline"
                      data-hz-ui-lab-monitor-detail-tab-extra="angular-refresh-help"
                      data-monitor-detail-tab-extra-owner="hertzbeat-ui-action-group"
                      data-monitor-detail-tab-extra-contract="angular-refresh-help"
                    >
                      <HzMonitorRefreshToolbar
                        refreshLabel={
                          monitorDetailRefreshIntervalId === 'off'
                            ? t('monitor.detail.close-refresh')
                            : t('monitor.detail.auto-refresh', { time: monitorDetailRefreshIntervalId.replace(/s$/, '') })
                        }
                        refreshActionLabel="Refresh monitor detail"
                        selectedRefresh={monitorDetailRefreshIntervalId}
                        refreshOptions={[
                          { id: '90s', time: 90, current: true },
                          { id: '10s', time: 10 },
                          { id: '30s', time: 30 },
                          { id: '60s', time: 60 },
                          { id: '300s', time: 300 },
                          { id: 'off', time: null }
                        ].map(option => ({
                          value: option.id,
                          label:
                            option.time == null
                              ? t('monitor.detail.close-refresh')
                              : option.current
                                ? t('monitor.detail.auto-refresh', { time: option.time })
                                : t('monitor.detail.config-refresh', { time: option.time })
                        }))}
                        signalLinks={[
                          {
                            id: 'metrics',
                            href: '/ingestion/otlp/metrics?timeRange=last-1h&source=ui-lab',
                            label: 'Metrics Workbench',
                            icon: <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                          },
                          {
                            id: 'logs',
                            href: '/log/manage?timeRange=last-1h&source=ui-lab',
                            label: 'Logs Workbench',
                            icon: <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                          },
                          {
                            id: 'traces',
                            href: '/trace/manage?timeRange=last-1h&source=ui-lab',
                            label: 'Traces Workbench',
                            icon: <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
                          }
                        ]}
                        refreshIcon={<RefreshCw size={13} aria-hidden="true" />}
                        onRefreshChange={value => {
                          setMonitorDetailRefreshIntervalId(value);
                          setContextMessage(`Refresh interval · ${value}`);
                        }}
                        onRefresh={() => setContextMessage('Monitor detail refresh')}
                        data-hz-ui-lab-monitor-detail-refresh-toolbar="shared"
                        data-hz-ui-lab-monitor-detail-default-refresh="angular-deadline-90"
                        data-hz-ui-lab-monitor-detail-refresh-select="shared"
                        data-hz-ui-lab-monitor-detail-refresh-options="angular-config-refresh-copy"
                        data-hz-ui-lab-monitor-detail-countdown-reset="angular-deadline-reset"
                        data-monitor-detail-countdown-reset-contract="angular-deadline-reset"
                        data-monitor-detail-refresh-options-contract="angular-config-refresh-copy"
                        data-monitor-detail-refresh-copy-contract="angular-deadline-label"
                        data-monitor-detail-default-refresh-contract={monitorDetailRefreshIntervalId === '90s' ? 'angular-deadline-90' : undefined}
                        data-monitor-detail-refresh-current-option={monitorDetailRefreshIntervalId === '90s' ? 'angular-default-deadline-current' : 'configured-option'}
                        data-hz-ui-lab-monitor-detail-grafana-refresh-target="previous-data-tab"
                        data-hz-ui-lab-monitor-signal-handoff="shared"
                        data-monitor-refresh-toolbar-owner="hertzbeat-ui-refresh-toolbar"
                        data-monitor-detail-refresh-target={monitorDetailTabId === 'grafana' ? 'history' : monitorDetailTabId}
                        data-monitor-detail-grafana-refresh-target={monitorDetailTabId === 'grafana' ? 'history' : undefined}
                      />
                      <HzIconLink
                        href="https://hertzbeat.apache.org/docs/help/http"
                        label="Help"
                        target="_blank"
                        rel="noreferrer"
                        data-hz-ui-lab-monitor-detail-help-action="angular-docs-help"
                        data-monitor-detail-help-action="angular-docs-help"
                        data-monitor-detail-help-owner="hertzbeat-ui-icon-link"
                        data-monitor-detail-help-target="https://hertzbeat.apache.org/docs/help/http"
                      >
                        <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
                      </HzIconLink>
                    </HzActionGroup>
                  }
                />
              }
            >
              <HzMonitorDetailTabPanel
                id="ui-lab-monitor-detail-panel-realtime"
                tabId="ui-lab-monitor-detail-tab-realtime"
                active
                data-hz-ui-lab-monitor-detail-tab-panel="shared"
                data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"
              >
                <HzMonitorDetailTabSequence data-hz-ui-lab-monitor-detail-tab-sequence="shared">
                  <HzMonitorDetailStage
                    title="Monitor detail stage"
                    header="hidden"
                    rhythm="stack"
                    data-hz-ui-lab-monitor-detail-stage="shared"
                    data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"
                  >
                    <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <span className="min-w-0 truncate text-[12px] font-semibold text-[#dbe4f0]">Realtime metric rows</span>
                      <span className="font-mono text-[10px] text-[#727b8c]">shared stage</span>
                    </div>
                  </HzMonitorDetailStage>
                </HzMonitorDetailTabSequence>
              </HzMonitorDetailTabPanel>
            </HzMonitorDetailWorkbenchFrame>
          </HzMonitorDetailConsoleShell>
          <HzMonitorEditorForm
            data-hz-ui-lab-monitor-editor-form="shared"
            data-hz-ui-lab-monitor-editor-default-app="website"
            data-hz-ui-lab-monitor-editor-app-source="angular-route-context-hidden-field"
            data-hz-ui-lab-monitor-editor-static-host-position="angular-before-name"
            data-hz-ui-lab-monitor-editor-field-order="angular-monitor-form-sequence"
            data-hz-ui-lab-monitor-editor-detect-payload="angular-monitor-collector-params-no-grafana"
            data-hz-ui-lab-monitor-editor-save-payload="angular-monitor-collector-params-grafana"
            data-hz-ui-lab-monitor-editor-payload-param-merge="angular-params-advanced-sdparams"
            data-hz-ui-lab-monitor-editor-payload-host-instance="angular-host-param-as-instance"
            data-hz-ui-lab-monitor-editor-service-discovery-params="angular-nonstatic-only"
            data-hz-ui-lab-monitor-editor-scrape-reload="angular-reset-on-user-scrape-change"
            data-hz-ui-lab-monitor-editor-ssl-port-notice="angular-info-notification"
            data-hz-ui-lab-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"
            data-hz-ui-lab-monitor-editor-advanced-visible="angular-visible-param-only"
            data-hz-ui-lab-monitor-editor-label-selector="angular-app-label-selector"
            data-hz-ui-lab-monitor-editor-collector-selection="angular-collectors-selection-tags"
            data-hz-ui-lab-monitor-editor-interval-stepper="angular-min-step-max-by-app"
            data-hz-ui-lab-monitor-editor-detect-cron-validation="angular-detect-skips-cron-format"
            data-hz-ui-lab-monitor-editor-cron-required="angular-required-before-detect-save"
            data-monitor-editor-detect-cron-validation="angular-detect-skips-cron-format"
            data-monitor-editor-cron-required="angular-required-before-detect-save"
            onSubmit={event => {
              event.preventDefault();
              setContextMessage('Monitor form submit action');
            }}
            actionBar={
              <HzMonitorEditorActionBar
                data-hz-ui-lab-monitor-editor-action-bar="shared"
                data-hz-ui-lab-monitor-editor-cancel-return="legacy-list-root"
                title="Monitor editor actions"
                status="clean"
                statusLabel="Ready"
                summaryVisible={false}
                actionAlign="center"
                className="border-x-0"
                actions={[
                  {
                    id: 'detect',
                    label: 'Detect',
                    intent: 'ghost',
                    buttonProps: {
                      'data-monitor-editor-detect-cron-validation': 'angular-detect-skips-cron-format'
                    },
                    onSelect: () => setContextMessage('Monitor detect action')
                  },
                  {
                    id: 'submit',
                    label: 'OK',
                    type: 'submit',
                    intent: 'primary',
                    buttonProps: {
                      'data-monitor-editor-save-return': 'angular-app-list',
                      'data-monitor-editor-save-return-target': '/monitors?app=website',
                      'data-monitor-editor-save-notification-contract': 'angular-success-before-return'
                    },
                    onSelect: () => setContextMessage('Monitor save action')
                  },
                  {
                    id: 'cancel',
                    label: 'Cancel',
                    intent: 'ghost',
                    buttonProps: {
                      'data-monitor-editor-cancel-return': 'legacy-list-root',
                      'data-monitor-editor-cancel-return-target': '/monitors'
                    },
                    onSelect: () => setContextMessage('Monitor cancel action')
                  }
                ]}
              />
            }
          >
            <HzMonitorEditorHeader
              data-hz-ui-lab-monitor-editor-header="shared"
              title="Monitor editor header"
              className="border-x-0"
            />
            <HzMonitorEditorSection
              data-hz-ui-lab-monitor-editor-section="shared"
              title="Monitor editor section"
              copy="Shared section shell for monitor new/edit forms."
              className="border-x-0"
            >
              <HzMonitorEditorFieldGrid
                data-hz-ui-lab-monitor-editor-field-grid="shared"
                data-hz-ui-lab-monitor-field-controls="shared"
              >
                <HzField label="Scrape">
                  <HzSelect
                    value="http_sd"
                    aria-label="Scrape"
                    data-monitor-editor-scrape-reload-contract="angular-reset-on-user-scrape-change"
                    options={[
                      { value: 'static', label: 'static' },
                      { value: 'http_sd', label: 'http_sd' }
                    ]}
                    onChange={() => setContextMessage('Monitor scrape changed')}
                  />
                </HzField>
                <HzField
                  label="HTTP SD endpoint"
                  data-monitor-editor-scrape-param-order="angular-after-scrape-before-name"
                >
                  <HzInput value="https://service-discovery.local/targets" readOnly />
                </HzField>
                <HzField
                  label="Host"
                  data-hz-ui-lab-monitor-host-name-autofill="angular-new-host-change"
                  data-monitor-editor-static-host-field="angular-before-name"
                >
                  <HzInput
                    value="checkout.example.com"
                    readOnly
                    data-monitor-editor-host-name-autofill-contract="angular-new-host-change"
                  />
                </HzField>
                <HzField label="Monitor name">
                  <HzInput
                    value="Bright_Probe_23AB"
                    readOnly
                    data-monitor-editor-host-name-autofill-target="monitor-name"
                  />
                </HzField>
                <div
                  className="col-span-full"
                  data-hz-ui-lab-monitor-editor-advanced-collapse-demo="angular-ghost-collapse-dashed-trigger"
                  data-hz-ui-lab-monitor-editor-advanced-visible-demo="angular-visible-param-only"
                  data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"
                  data-monitor-editor-advanced-collapse-state={monitorEditorAdvancedOpen ? 'expanded' : 'collapsed'}
                >
                  <HzButton
                    type="button"
                    size="sm"
                    intent="secondary"
                    aria-expanded={monitorEditorAdvancedOpen}
                    data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"
                    data-monitor-editor-advanced-toggle-owner="hertzbeat-ui-button"
                    onClick={() => setMonitorEditorAdvancedOpen(open => !open)}
                  >
                    <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
                    Advanced
                  </HzButton>
                </div>
                <div data-monitor-editor-runtime-order="angular-after-advanced-before-labels" />
                <HzField
                  label="Collector"
                  data-hz-ui-lab-monitor-editor-collector-selection="angular-collectors-selection-tags"
                  data-monitor-editor-collector-selection="angular-collectors-selection-tags"
                >
                  <HzSelect
                    value="collector-a"
                    aria-label="Collector"
                    options={[
                      { value: '', label: 'Default collector - Public' },
                      { value: 'collector-a', label: 'collector-a · 10.0.0.12 · Online · Private' }
                    ]}
                    data-monitor-editor-collector-selection-owner="hertzbeat-ui-select"
                    optionDataAttributes={option => ({
                      'data-monitor-editor-collector-option': option.value || 'system-default',
                      'data-monitor-editor-collector-option-contract': 'angular-status-ip-mode-tags'
                    })}
                    onChange={() => setContextMessage('Monitor collector changed')}
                  />
                  <div
                    className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5"
                    data-monitor-editor-collector-tags="angular-status-ip-mode-tags"
                  >
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="status">Online</span>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="name">collector-a</span>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="ip">10.0.0.12</span>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="mode">Private</span>
                  </div>
                </HzField>
                <HzField
                  as="div"
                  label="Interval"
                  data-hz-ui-lab-monitor-editor-interval-stepper="angular-min-step-max-by-app"
                  data-monitor-interval-stepper-contract="angular-min-step-max-by-app"
                >
                  <HzNumberStepper
                    name="intervals"
                    min={10}
                    max={604800}
                    step={10}
                    value="60"
                    data-monitor-interval-stepper="hertzbeat-ui-number-stepper"
                    data-monitor-interval-stepper-min="10"
                    data-monitor-interval-stepper-max="604800"
                    data-monitor-interval-stepper-step="10"
                    data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"
                    onValueChange={() => setContextMessage('Monitor interval changed')}
                  />
                  <span
                    className="mt-1 inline-flex text-[10px] font-semibold text-[#7d8798]"
                    data-monitor-interval-stepper-unit="common.time.unit.second"
                  >
                    Second
                  </span>
                </HzField>
                <HzField
                  label="Cron expression"
                  data-hz-ui-lab-monitor-editor-cron-required="angular-required-before-detect-save"
                >
                  <HzInput
                    value="*/5 * * * *"
                    readOnly
                    required
                    data-monitor-editor-input="cron-expression"
                    data-monitor-editor-cron-required="angular-required-before-detect-save"
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Description"
                  span="wide"
                  data-hz-ui-lab-monitor-textarea="shared"
                  data-hz-ui-lab-monitor-description-textarea-limit="angular-textarea-limit-100"
                >
                  <HzTextarea
                    height="tall"
                    value="Primary MySQL endpoint for collector-a."
                    maxCharacterCount={100}
                    readOnly
                    data-monitor-description-textarea-limit="angular-textarea-limit-100"
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Incident message"
                  span="wide"
                  data-hz-ui-lab-status-incident-message-input="angular-textarea"
                  data-status-incident-message-input-owner="hertzbeat-ui-textarea"
                  data-status-incident-message-placeholder-contract="angular-state-placeholder"
                >
                  <HzTextarea
                    height="default"
                    rows={2}
                    placeholder="We are monitoring this event and observing the processing effect"
                    value="Monitoring checkout rollback."
                    readOnly
                    data-status-incident-message-placeholder="status.incident.message.tip.2"
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Incident components"
                  span="wide"
                  data-hz-ui-lab-status-incident-component-picker="angular-checkbox-group"
                  data-status-incident-component-picker-owner="hertzbeat-ui-checkbox"
                >
                  <div
                    className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-1.5"
                    data-status-incident-component-picker="angular-checkbox-group"
                  >
                    <HzCheckbox defaultChecked label="checkout-api" data-status-incident-component-option="42" />
                    <HzCheckbox label="payment-gateway" data-status-incident-component-option="43" />
                  </div>
                </HzField>
                <HzField
                  as="div"
                  label="Incident state"
                  span="wide"
                  data-hz-ui-lab-status-incident-state-control="angular-radio-buttons"
                  data-status-incident-state-owner="hertzbeat-ui-radio-button-group"
                >
                  <HzRadioButtonGroup
                    name="ui-lab-status-incident-state"
                    value="2"
                    data-status-incident-state-control="angular-radio-buttons"
                    options={[
                      { value: '0', label: 'Investigating', icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
                      { value: '1', label: 'Identified', icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
                      { value: '2', label: 'Monitoring', icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
                      { value: '3', label: 'Resolved', icon: <Power className="h-3.5 w-3.5" aria-hidden="true" /> }
                    ]}
                  />
                </HzField>
                <HzField as="div" label="Enabled" data-hz-ui-lab-monitor-checkbox="shared">
                  <HzCheckbox defaultChecked label="Collect this resource" />
                </HzField>
                <HzField
                  as="div"
                  label="Grafana template"
                  data-hz-ui-lab-monitor-grafana-template-upload="angular-json-template-upload"
                >
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-monitor-grafana-template-upload="angular-json-template-upload"
                  >
                    <HzFileInput
                      accept=".json,application/json"
                      aria-label="Upload Grafana Template"
                      data-monitor-grafana-template-upload-owner="hertzbeat-ui-file-input"
                      data-monitor-grafana-template-upload-input="json-template"
                    />
                    <HzButton
                      type="button"
                      size="sm"
                      intent="secondary"
                      data-monitor-grafana-template-upload-trigger-owner="hertzbeat-ui-button"
                      data-monitor-grafana-template-upload-trigger="json-template"
                    >
                      Upload Grafana Template
                    </HzButton>
                  </div>
                </HzField>
                <HzField
                  label="Password param"
                  data-hz-ui-lab-monitor-password-param="angular-app-multi-func-password"
                >
                  <HzInput
                    type="password"
                    value="secret"
                    readOnly
                    data-monitor-param-password-input="password"
                    data-monitor-param-password-contract="angular-app-multi-func-password"
                    data-monitor-param-input="password"
                    data-monitor-param-field="password"
                    data-monitor-editor-input-owner="hertzbeat-ui-input"
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Boolean param"
                  data-hz-ui-lab-monitor-boolean-param="angular-nz-switch"
                >
                  <HzSwitch
                    checked
                    label="SSL"
                    data-monitor-param-switch="ssl"
                    data-monitor-param-boolean-contract="angular-nz-switch"
                    data-monitor-param-field="ssl"
                    data-monitor-editor-switch-owner="hertzbeat-ui-switch"
                    onCheckedChange={() => setContextMessage('Monitor boolean param changed')}
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Textarea param"
                  data-hz-ui-lab-monitor-textarea-param="angular-nz-input-textarea-rows-8"
                >
                  <HzTextarea
                    height="tall"
                    value="multi-line operator note"
                    readOnly
                    data-monitor-param-textarea="description"
                    data-monitor-param-textarea-contract="angular-nz-input-textarea-rows-8"
                    data-monitor-param-field="description"
                    data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"
                  />
                </HzField>
                <HzField as="div" label="Interval" data-hz-ui-lab-monitor-number-stepper="shared">
                  <HzNumberStepper value="60" min="1" step="1" onValueChange={() => setContextMessage('Monitor interval changed')} />
                </HzField>
                <HzField
                  as="div"
                  label="Number param"
                  data-hz-ui-lab-monitor-number-param-bounds="angular-nz-input-number--1000-65535-step-1"
                >
                  <HzNumberStepper
                    value="443"
                    min={-1000}
                    max={65535}
                    step={1}
                    data-monitor-param-number-stepper="port"
                    data-monitor-param-number-contract="angular-nz-input-number--1000-65535-step-1"
                    data-monitor-param-number-min="-1000"
                    data-monitor-param-number-max="65535"
                    data-monitor-param-number-step="1"
                    data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"
                    onValueChange={() => setContextMessage('Monitor number param changed')}
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Radio param"
                  data-hz-ui-lab-monitor-radio-param="angular-nz-radio-group-button-solid"
                >
                  <HzRadioButtonGroup
                    name="ui-lab-monitor-radio-param"
                    value="basic"
                    options={[
                      { value: 'basic', label: 'Basic' },
                      { value: 'advanced', label: 'Advanced' }
                    ]}
                    data-monitor-param-radio="authType"
                    data-monitor-param-radio-contract="angular-nz-radio-group-button-solid"
                    data-monitor-param-field="authType"
                    data-monitor-editor-radio-owner="hertzbeat-ui-radio-button-group"
                    onChange={() => setContextMessage('Monitor radio param changed')}
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Labels param"
                  data-hz-ui-lab-monitor-labels-param="angular-app-configurable-field-key-value"
                >
                  <HzKeyValueEditor
                    rows={[
                      { key: 'team', value: 'platform' },
                      { key: 'env', value: 'prod' }
                    ]}
                    addLabel="Add label"
                    removeLabel="Remove"
                    keyPlaceholder="Label key"
                    valuePlaceholder="Label value"
                    data-monitor-param-labels-editor="labels"
                    data-monitor-param-labels-contract="angular-app-configurable-field-key-value"
                    data-monitor-param-field="labels"
                    data-monitor-editor-labels-owner="hertzbeat-ui-key-value-editor"
                    keyInputProps={{ 'data-monitor-param-labels-input': 'key' }}
                    valueInputProps={{ 'data-monitor-param-labels-input': 'value' }}
                    onChange={() => setContextMessage('Monitor labels param changed')}
                  />
                </HzField>
                <HzField
                  as="div"
                  label="Metrics field param"
                  data-hz-ui-lab-monitor-metrics-field-param="angular-app-configurable-field-field-unit-type"
                >
                  <HzConfigurableFieldEditor
                    rows={[
                      { field: 'usage', unit: '%', type: 'number' }
                    ]}
                    columns={[
                      {
                        key: 'field',
                        placeholder: 'Field',
                        inputProps: { 'data-monitor-param-metrics-field-input': 'field' }
                      },
                      {
                        key: 'unit',
                        placeholder: 'Unit',
                        className: 'minmax(50px,90px)',
                        inputProps: { 'data-monitor-param-metrics-field-input': 'unit' }
                      },
                      {
                        key: 'type',
                        placeholder: 'Type',
                        inputProps: { 'data-monitor-param-metrics-field-input': 'type' }
                      }
                    ]}
                    addLabel="Add metric"
                    removeLabel="Remove"
                    data-monitor-param-metrics-field-editor="metrics"
                    data-monitor-param-metrics-field-contract="angular-app-configurable-field-field-unit-type"
                    data-monitor-param-field="metrics"
                    data-monitor-editor-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
                    onChange={() => setContextMessage('Monitor metrics-field param changed')}
                  />
                </HzField>
              </HzMonitorEditorFieldGrid>
              <HzField as="div" label="Structured params" rhythm="section" data-hz-ui-lab-monitor-code-editor-frame="shared">
                <HzCodeEditor
                  data-hz-ui-lab-monitor-code-editor="shared"
                  value={'{"ssl": true, "timeout": 3000}'}
                  language="json"
                  minHeight="96px"
                  readOnly
                  meta="json"
                  ariaLabel="Structured monitor params"
                />
              </HzField>
              <HzKeyValueEditor
                data-hz-ui-lab-monitor-key-value-editor="shared"
                data-hz-ui-lab-monitor-key-value-actions="shared"
                title="Annotations"
                rows={[
                  { key: 'runbook', value: 'checkout' },
                  { key: 'owner', value: 'sre' }
                ]}
                addLabel="Add annotation"
                removeLabel="Remove"
                keyPlaceholder="key"
                valuePlaceholder="value"
                onChange={() => setContextMessage('Monitor key/value rows changed')}
                className="mt-3"
              />
              <div
                className="mt-3"
                data-hz-ui-lab-monitor-label-selector="angular-app-label-selector"
                data-monitor-editor-label-selector="angular-app-label-selector"
                data-monitor-editor-label-selector-owner="cold-label-selector"
              >
                <LabelRecordInput
                  value="team:platform, env:prod"
                  onValueChange={() => setContextMessage('Monitor label selector changed')}
                  keyPlaceholder="label key"
                  valuePlaceholder="label value"
                  addLabel="Add label"
                  removeLabel="Remove"
                  containerClassName="min-w-0"
                />
              </div>
            </HzMonitorEditorSection>
          </HzMonitorEditorForm>
          <HzMonitorEditorActionBar
            data-hz-ui-lab-monitor-editor-busy-feedback="angular-spin-tip"
            title="Monitor editor detecting"
            status="saving"
            statusLabel="Available Detecting"
            summaryVisible={false}
            actionAlign="center"
            className="border-x-0"
            feedback={
              <HzInlineFeedback
                tone="info"
                title="Available Detecting"
                variant="embedded"
                data-hz-ui-lab-monitor-editor-busy-contract="angular-spin-tip"
                data-monitor-editor-feedback="busy"
                data-monitor-editor-busy-contract="angular-spin-tip"
                data-monitor-editor-busy-phase="detecting"
              />
            }
            actions={[
              {
                id: 'detect',
                label: 'Detect',
                intent: 'ghost',
                disabled: true,
                buttonProps: {
                  'data-monitor-editor-detect-busy-label': 'Available Detecting'
                }
              },
              {
                id: 'submit',
                label: 'OK',
                type: 'submit',
                intent: 'primary',
                disabled: true,
                buttonProps: {
                  'data-monitor-editor-submit-busy-label': 'Loading...'
                }
              }
            ]}
          />
          <HzMonitorEditorActionBar
            data-hz-ui-lab-monitor-editor-validation-feedback="angular-form-required"
            title="Monitor editor validation"
            status="failed"
            statusLabel="Failed"
            summaryVisible={false}
            actionAlign="center"
            className="border-x-0"
            feedback={
              <HzInlineFeedback
                tone="critical"
                title="Monitor name is required"
                variant="embedded"
                data-hz-ui-lab-monitor-editor-validation-contract="angular-form-required"
                data-monitor-editor-feedback="error"
                data-monitor-editor-validation-contract="angular-form-required"
                data-monitor-editor-blocked-action="save"
                data-monitor-editor-blocked-before-api="true"
              />
            }
            actions={[
              {
                id: 'submit',
                label: 'OK',
                type: 'submit',
                intent: 'primary'
              },
              {
                id: 'detect',
                label: 'Detect',
                intent: 'ghost'
              }
            ]}
          />
          <HzMonitorEditorActionBar
            data-hz-ui-lab-monitor-editor-api-error-feedback="angular-message-msg"
            title="Monitor editor API error"
            status="failed"
            statusLabel="Failed"
            summaryVisible={false}
            actionAlign="center"
            className="border-x-0"
            feedback={
              <HzInlineFeedback
                tone="critical"
                title="Backend detect rejected"
                description="Backend said the host is unreachable"
                variant="embedded"
                data-hz-ui-lab-monitor-editor-api-error-contract="angular-message-msg"
                data-monitor-editor-feedback="error"
                data-monitor-editor-api-error-contract="angular-message-msg"
                data-monitor-editor-blocked-action="detect"
              />
            }
            actions={[
              {
                id: 'detect',
                label: 'Detect',
                intent: 'ghost'
              },
              {
                id: 'submit',
                label: 'OK',
                type: 'submit',
                intent: 'primary'
              }
            ]}
          />
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] 2xl:grid-cols-[minmax(0,0.92fr)_minmax(300px,1fr)]">
            <HzHeatmapChart
              title="Latency heatmap"
              buckets={latencyHeatmapBuckets}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <div className="grid min-w-0">
              <HzLogStream
                title="Log stream"
                rows={logStreamRows}
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
              />
              <HzTraceList
                title="Recent traces"
                traces={traceListItems}
                selectedTraceId={selectedTrace.id}
                onTraceSelect={trace => {
                  setSelectedTraceId(trace.id);
                  setTraceDetailOpen(true);
                  setContextMessage(`上下文窗口: ${trace.id} · ${trace.durationMs}ms · trace detail`);
                }}
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)]"
              />
              <HzServiceDependencyGraph
                title="Service dependency"
                nodes={traceServiceNodes}
                edges={traceServiceEdges}
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)]"
              />
              <HzActionWorkbench
                data-hz-ui-lab-action-workbench="shared"
                data-hz-ui-lab-actions-placeholder-replacement="api-backed-workbench"
                data-actions-legacy-open-context="adapter-boundary-panel"
                data-actions-legacy-entity-handoff="/entities"
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)]"
                title="Automation actions"
                subtitle="Shared guarded action entry, adapter boundary, checklist rail, and evidence handoff surface before live execution adapters are wired."
                sourceLabel="Automation entry"
                actions={[
                  { label: 'Open overview', href: '/overview', variant: 'primary' },
                  { label: 'Open entities', href: '/entities', variant: 'subtle' }
                ]}
                shell={{
                  eyebrow: 'Shared action shell',
                  copy: 'Action surfaces stay compact, evidence-led, and manually confirmed while execution adapters are pending.',
                  chips: ['Action catalog', 'Risk posture', 'Approval rail']
                }}
                adapterBoundary={{
                  state: 'adapter-pending',
                  label: 'Execution boundary',
                  copy: 'Roadmap automation snapshots stay separated from live operator actions until the execution adapter lands.',
                  roadmapOnlyLabels: ['Workflow automation', 'Action catalog', 'Approvals', 'Runbook orchestration']
                }}
                checklistTitle="Launch checklist"
                checklist={[
                  { title: 'Context carried', copy: 'Alert/entity/trace context remains attached to suggestions.', tone: 'bg-[#75ad86]' },
                  { title: 'Adapter pending', copy: 'No automatic execution is exposed from this entry.', tone: 'bg-[#c2a86b]' },
                  { title: 'Evidence retained', copy: 'Every suggestion links back to the originating signal.', tone: 'bg-[#9aa9cf]' }
                ]}
                suggestedTitle="Suggested actions"
                suggestedCopy="Suggestions are generated from context and require manual confirmation."
                suggestedEvidenceLabel="Open evidence"
                suggestedConfirmLabel="Manual required"
                suggestedActions={[
                  {
                    id: 'suggest-restart-checkout',
                    title: 'Suggest restart checkout-api',
                    copy: 'Restart stays disabled until a human confirms risk and rollback context.',
                    displayMeta: 'High risk · restart checkout',
                    evidence: 'Source alert center · signal traces',
                    evidenceHref: '/alert?status=firing',
                    confirmation: 'manual-required',
                    posture: 'Suggestion only; no auto-execute endpoint is exposed.'
                  }
                ]}
                catalogAdapter={{
                  state: 'fallback-empty',
                  adapterOwner: 'next-actions-catalog-bff',
                  endpoint: '/api/actions/catalog?limit=8',
                  method: 'GET',
                  executionMode: 'manual-approval-draft-only',
                  executionAllowed: false,
                  managerBacked: false,
                  title: 'Action catalog adapter',
                  copy: 'Shared catalog read evidence stays manual-only before approval drafts can reference durable manager entries.',
                  loadingLabel: 'Loading catalog',
                  emptyLabel: 'No manager catalog items yet.',
                  items: []
                }}
                approvalDraft={{
                  state: 'ready',
                  adapterOwner: 'next-actions-approval-draft-bff',
                  endpoint: '/api/actions/approval-drafts',
                  method: 'POST',
                  executionMode: 'manual-approval-draft-only',
                  executionAllowed: false,
                  title: 'Approval draft adapter',
                  copy: 'The shared workbench can create a non-executing approval draft from suggestion context before any live adapter exists.',
                  createLabel: 'Create draft',
                  pendingLabel: 'Creating draft',
                  successLabel: 'Draft created',
                  failedLabel: 'Draft failed',
                  disabledReason: 'Needs alert, entity, or trace context.',
                  requestPreview: '{"actionId":"suggest-restart-checkout","executionAllowed":false}'
                }}
                approvalDraftQueue={{
                  state: 'fallback-local-drafts',
                  adapterOwner: 'next-actions-approval-draft-bff',
                  endpoint: '/api/actions/approval-drafts?limit=8',
                  method: 'GET',
                  executionMode: 'manual-approval-draft-only',
                  executionAllowed: false,
                  managerBacked: false,
                  title: 'Approval draft queue',
                  copy: 'Shared read evidence lists manager-backed drafts when available and shows an explicit empty fallback otherwise.',
                  loadingLabel: 'Loading drafts',
                  emptyLabel: 'No approval drafts returned from manager yet.',
                  drafts: [
                    {
                      draftId: 'approval-draft-ui-lab-approved',
                      state: 'approval-draft-approved',
                      actionId: 'suggest-restart-checkout',
                      catalogId: 'restart-checkout',
                      executionState: 'not-executed',
                      adapterOwner: 'next-actions-approval-decision-bff'
                    }
                  ]
                }}
                approvalDecision={{
                  state: 'awaiting-draft',
                  status: 'blocked',
                  adapterOwner: 'next-actions-approval-decision-bff',
                  endpoint: '/api/actions/approval-drafts/:draftId/decision',
                  method: 'POST',
                  executionMode: 'manual-approval-draft-only',
                  executionAllowed: false,
                  managerBacked: false,
                  title: 'Approval decision adapter',
                  copy: 'Approve or reject records a reviewer decision, keeps the draft non-executing, and never calls an action runner.',
                  approveLabel: 'Approve draft',
                  rejectLabel: 'Reject draft',
                  pendingLabel: 'Recording decision',
                  successLabel: 'Decision recorded',
                  failedLabel: 'Decision failed',
                  disabledReason: 'Create a draft before recording a decision.',
                  requestPreview: '{"decision":"approved","executionAllowed":false}'
                }}
                emptyTitle="Execution adapter pending"
                emptyCopy="The shared surface is ready for handoffs; live runs and approvals remain behind the adapter boundary."
              />
              <HzIncidentWorkbench
                data-hz-ui-lab-incident-workbench="shared"
                data-hz-ui-lab-incident-query-contract="angular-search-pagination"
                data-incidents-query-contract="angular-search-pagination"
                data-incidents-query-label="page=0 size=8"
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)]"
                title="Incident workbench"
                subtitle="Shared incident list, response timeline, ownership queue, and signal handoffs before the real route wires API mutations."
                sourceLabel="Status page incidents"
                queryLabel="page=0 size=8"
                metrics={[
                  { label: 'Open', value: String(incidentWorkbenchRows.length), hint: 'active' },
                  { label: 'Critical', value: '1', tone: 'critical' },
                  { label: 'Mitigating', value: '1', tone: 'warning' },
                  { label: 'Owners', value: '2' }
                ]}
                incidents={incidentWorkbenchRows}
                timeline={incidentTimelineRows}
                ownership={incidentOwnershipRows}
                selectedIncidentId="inc-204"
                actions={[
                  { label: 'Open logs', href: '/log/manage', variant: 'default' },
                  { label: 'Open traces', href: '/trace/manage', variant: 'primary' }
                ]}
                transitionLabel="Status transition"
                transitionActions={[
                  { id: 'identified', label: 'Identified', state: 1, variant: 'default' },
                  { id: 'monitoring', label: 'Monitoring', state: 2, variant: 'default' },
                  { id: 'resolved', label: 'Resolved', state: 3, variant: 'primary' }
                ]}
              />
              <HzInlineFeedback
                tone="critical"
                title="Status setting deletes require confirmation"
                meta="Status page component and incident deletes preserve Angular modal.confirm before the delete mutation"
                variant="embedded"
                data-hz-ui-lab-status-setting-delete-confirm="angular-modal-confirm"
                data-status-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
              />
              <HzInlineFeedback
                tone="success"
                title="Status setting mutations use Angular notify keys"
                meta="Org apply, component and incident create/edit, and deletes preserve Angular notification keys and the need-org guard"
                variant="embedded"
                data-hz-ui-lab-status-setting-mutation-feedback="angular-notify-keys"
                data-status-setting-mutation-feedback-owner="route-action-feedback-contract"
              />
              <HzInlineFeedback
                tone="info"
                title="Status setting tabs reload on click"
                meta="Component and incident tabs, plus the active refresh action, advance the route refresh contract like Angular nzClick/sync handlers"
                variant="embedded"
                data-hz-ui-lab-status-setting-tab-refresh="angular-nz-tab-click-load"
                data-status-tab-refresh-owner="route-refresh-contract"
              />
              <HzInlineFeedback
                tone="info"
                title="Status incident toolbar refresh"
                meta="Incident tab keeps the Angular syncIncidence toolbar action beside search and new incident controls"
                variant="embedded"
                data-hz-ui-lab-status-incident-refresh="angular-sync-incidence"
                data-status-incident-refresh-owner="route-refresh-contract"
              />
              <HzInlineFeedback
                tone="info"
                title="Status row delete menu"
                meta="Component and incident rows keep Angular's primary edit/update action plus ellipsis dropdown delete menu"
                variant="embedded"
                data-hz-ui-lab-status-row-delete-menu="angular-ellipsis-dropdown-delete"
                data-status-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
              />
              <HzInlineFeedback
                tone="info"
                title="Status public link placement"
                meta="Public status links stay in the component and incident tab toolbars and render only when the status org has id and name"
                variant="embedded"
                data-hz-ui-lab-status-public-link="angular-tab-toolbar-conditional"
                data-status-public-link-owner="status-tab-toolbar"
              />
              <HzInlineFeedback
                tone="info"
                title="Status incident pagination"
                meta="Incident search, clear, page index, and page size changes preserve Angular nz-table pagination loading"
                variant="embedded"
                data-hz-ui-lab-status-incident-pagination="angular-search-pagination"
                data-status-incident-pagination-owner="hertzbeat-ui-pagination-bar"
              />
              <HzInlineFeedback
                tone="critical"
                title="Status incident failure closes modal"
                meta="Incident create/edit API failures match Angular onIncidentModalCancel, while component failures keep the modal open"
                variant="embedded"
                data-hz-ui-lab-status-incident-failure-close="angular-cancel-on-api-failure"
                data-status-incident-failure-close-owner="status-route-action-feedback"
              />
              <HzStatusIncidentHistory
                title="Incident History"
                data-hz-ui-lab-status-incident-history="angular-collapse-desc"
                data-status-incident-history-contract="angular-collapse-desc"
                data-status-incident-history-owner="hertzbeat-ui-status-incident-history"
                items={[
                  {
                    id: 'status-history-newest',
                    title: 'Mitigation update...',
                    message: 'Mitigation update added after the checkout rollback.',
                    meta: '2026-05-26 03:30:00',
                    stateLabel: 'Monitoring',
                    stateTone: 'warning'
                  },
                  {
                    id: 'status-history-older',
                    title: 'Investigating payme...',
                    message: 'Investigating payment latency across checkout-api.',
                    meta: '2026-05-26 03:12:00',
                    stateLabel: 'Identified',
                    stateTone: 'warning'
                  }
                ]}
              />
              <HzInlineFeedback
                tone="info"
                title="Public status uses public endpoints"
                meta="The standalone /status page keeps Angular's public status entry, public org/component/incident reads, and component-incident switch contract"
                variant="embedded"
                data-hz-ui-lab-public-status-api-contract="angular-public-status"
                data-public-status-api-owner="status-center-public-controller"
                data-public-status-mode-switch-contract="component-incident"
              />
              <HzTopologyToolbar
                data-hz-ui-lab-topology-toolbar="shared"
                data-hz-ui-lab-topology-toolbar-density="graph-first"
                density="graph-first"
                environmentLabel="Environment"
                environmentValue="prod"
                environmentOptions={[
                  { value: 'all', label: 'All environments' },
                  { value: 'prod', label: 'prod' }
                ]}
                searchLabel="Filter topology"
                searchPlaceholder="Search entities, services, resources, or labels"
                searchValue="checkout-api"
                sourceKindLabel="Source"
                sourceKindValue="otlp-trace-call"
                sourceKindOptions={[
                  { value: 'all', label: 'All sources' },
                  { value: 'otlp-trace-call', label: 'OTLP trace' },
                  { value: 'monitor-owner', label: 'Monitor owner' }
                ]}
                depthLabel="Depth"
                depthValue="2"
                depthOptions={[
                  { value: '1', label: '1-hop' },
                  { value: '2', label: '2-hop' },
                  { value: '3', label: '3-hop' }
                ]}
                groupByLabel="Group by"
                groupByValue="none"
                groupByOptions={[
                  { value: 'none', label: 'None' },
                  { value: 'environment', label: 'Environment' },
                  { value: 'source-kind', label: 'Source kind' }
                ]}
                resetLabel="Reset"
                resetHref="/ui-lab#topology-toolbar-reset"
                summaryLabel="Current filter"
                summaryItems={['checkout-api', 'prod', 'last-1h', 'service-call']}
                stateLabel="Investigation state"
                stateItems={[
                  { id: 'focus', label: 'Focus', value: 'checkout-api', tone: 'info' },
                  { id: 'depth', label: 'Depth', value: '2-hop', tone: 'neutral' },
                  { id: 'group', label: 'Group', value: 'None', tone: 'neutral' }
                ]}
                boundary="none"
              />
              <HzTopologyScopeBar
                data-hz-ui-lab-topology-scope-bar="shared"
                boundary="section"
                items={[
                  {
                    id: 'environment',
                    label: 'Environment',
                    value: 'prod'
                  },
                  {
                    id: 'time-range',
                    label: 'Time range',
                    value: 'last 1 hour'
                  }
                ]}
                actions={[
                  {
                    id: 'refresh',
                    label: 'Refresh topology'
                  }
                ]}
              />
              <HzTopologyFocusTrail
                data-hz-ui-lab-topology-focus-trail="shared"
                label="Focused topology"
                boundary="section"
                density="graph-dock"
                focusMode="focused"
                focusDepth="2"
                focusEntityId="checkout-api"
                crumbs={[
                  {
                    id: 'all',
                    href: '/ui-lab#topology',
                    label: 'All entities'
                  },
                  {
                    id: 'checkout-api',
                    href: '/ui-lab#topology-checkout',
                    label: 'checkout-api',
                    value: '2-hop',
                    active: true
                  }
                ]}
                filters={[
                  {
                    id: 'environment',
                    label: 'Environment',
                    value: 'prod'
                  },
                  {
                    id: 'time-range',
                    label: 'Time range',
                    value: 'last 1 hour'
                  },
                  {
                    id: 'source',
                    label: 'Source',
                    value: 'Trace calls'
                  },
                  {
                    id: 'view',
                    label: 'View',
                    value: 'Service calls'
                  }
                ]}
                hiddenCountLabel="0 hidden by scope"
                exitAction={{
                  href: '/ui-lab#topology',
                  label: 'Exit focus'
                }}
              />
              <HzTopologyGroupPanel
                data-hz-ui-lab-topology-group-panel="shared"
                title="Grouped topology"
                copy="Large graph grouping keeps collapsed clusters visible with the worst health still exposed."
                groupByLabel="Group by environment"
                boundary="section"
                items={[
                  {
                    id: 'prod-services',
                    label: 'prod services',
                    value: '24 services',
                    count: 24,
                    collapsedCount: 7,
                    worstTone: 'danger',
                    active: true,
                    meta: 'worst p95 420ms'
                  },
                  {
                    id: 'shared-resources',
                    label: 'shared resources',
                    value: '6 resources',
                    count: 6,
                    collapsedCount: 2,
                    worstTone: 'warning',
                    meta: 'databases and queues'
                  }
                ]}
                actions={[
                  { id: 'clear-group', href: '/ui-lab#topology-group-clear', label: 'Clear group' },
                  { id: 'open-table', href: '/ui-lab#topology-table', label: 'Open table' }
                ]}
              />
              <HzTopologyPathSummary
                data-hz-ui-lab-topology-path-summary="shared"
                title="Selected path"
                boundary="section"
                selectedEdgeId="checkout-orders"
                hoveredEdgeId="checkout-orders"
                sourceId="svc-checkout"
                targetId="db-orders"
                relationType="HTTP call"
                sourceKind="otlp-trace-call"
                source={{ label: 'Source', value: 'checkout-api', meta: 'service:checkout' }}
                target={{ label: 'Target', value: 'orders-db', meta: 'database:orders' }}
                relation={{ label: 'Relation', value: 'HTTP call', meta: 'trace edge' }}
                directionLabel="upstream to downstream"
                metrics={[
                  { id: 'request-rate', label: 'Request rate', value: '12.34/s', tone: 'info' },
                  { id: 'error-rate', label: 'Error rate', value: '4.2%', tone: 'warning' },
                  { id: 'latency-p95', label: 'P95', value: '180ms', tone: 'warning' }
                ]}
                evidenceBadges={['trace', 'alert']}
                actions={[
                  { id: 'focus-path', href: '/ui-lab#topology-focus-path', label: 'Focus path' },
                  { id: 'open-trace', href: '/ui-lab#topology-open-trace', label: 'Open trace' }
                ]}
              />
              <HzTopologyFilterStrip
                data-hz-ui-lab-topology-filter-strip="shared"
                variant="source-grid"
                boundary="section"
                items={[
                  {
                    id: 'otlp-trace-call',
                    href: '/ui-lab#topology-traces',
                    label: 'Trace calls',
                    copy: 'Observed service edges',
                    active: true
                  },
                  {
                    id: 'monitor-bind',
                    href: '/ui-lab#topology-monitors',
                    label: 'Monitor binds',
                    copy: 'Ownership evidence'
                  },
                  {
                    id: 'entity-relation',
                    href: '/ui-lab#topology-relations',
                    label: 'Entity relations',
                    copy: 'Declared dependencies'
                  },
                  {
                    id: 'incident-impact',
                    href: '/ui-lab#topology-incidents',
                    label: 'Incident impact',
                    copy: 'Active blast radius'
                  }
                ]}
              />
              <HzTopologyFilterStrip
                data-hz-ui-lab-topology-source-rail="shared"
                variant="source-rail"
                boundary="none"
                items={[
                  {
                    id: 'rail-trace',
                    href: '/ui-lab#topology-rail-trace',
                    label: 'Trace calls',
                    active: true
                  },
                  {
                    id: 'rail-monitor',
                    href: '/ui-lab#topology-rail-monitor',
                    label: 'Monitor binds'
                  },
                  {
                    id: 'rail-relation',
                    href: '/ui-lab#topology-rail-relation',
                    label: 'Entity relations'
                  },
                  {
                    id: 'rail-alert',
                    href: '/ui-lab#topology-rail-alert',
                    label: 'Alert impact'
                  }
                ]}
              />
              <HzTopologyFilterStrip
                data-hz-ui-lab-topology-view-filter-strip="shared"
                variant="view-list"
                boundary="section"
                copyVisibility="assistive"
                items={[
                  {
                    id: 'service-call',
                    href: '/ui-lab#topology-service-calls',
                    label: 'Service calls',
                    copy: 'Layered trace graph',
                    active: true
                  },
                  {
                    id: 'resource-dependency',
                    href: '/ui-lab#topology-resources',
                    label: 'Resource dependencies',
                    copy: 'Entity and monitor relations'
                  }
                ]}
              />
              <HzTopologyActionLink
                data-hz-ui-lab-topology-action-link="shared"
                id="alert-impact"
                href="/ui-lab#topology-alerts"
                label="Open alert impact"
                copy="Keep the selected topology scope."
                emphasis="primary"
                spacing="inset"
              />
              <HzTopologyWorkbenchFrame
                data-hz-ui-lab-topology-workbench-frame="shared"
                as="section"
                density="compact"
                boundary="section"
                style={{ minHeight: 0 }}
              >
                <HzTopologyWorkbenchHeader
                  data-hz-ui-lab-topology-workbench-header="shared"
                  eyebrow="Topology workbench"
                  title="Evidence-first graph"
                  copy="Shared shell owns the route header, scope bar, source strip, and compact graph body."
                  density="operational-compact"
                  copyVisibility="assistive"
                  boundary="none"
                  scopeSlot={
                    <HzTopologyScopeBar
                      items={[
                        { id: 'environment', label: 'Environment', value: 'prod' },
                        { id: 'time-range', label: 'Time range', value: 'last 1 hour' }
                      ]}
                      actions={[{ id: 'refresh', label: 'Refresh' }]}
                    />
                  }
                  sourceSlot={
                    <HzTopologyFilterStrip
                      variant="source-rail"
                      items={[
                        { id: 'trace', href: '/ui-lab#topology-trace', label: 'Trace', active: true },
                        { id: 'monitor', href: '/ui-lab#topology-monitor', label: 'Monitor' }
                      ]}
                    />
                  }
                />
                <HzTopologyWorkbenchGrid
                  data-hz-ui-lab-topology-workbench-grid="shared"
                  style={{ minHeight: 0 }}
                >
                  <HzTopologyWorkbenchSlot
                    data-hz-ui-lab-topology-workbench-canvas-slot="shared"
                    kind="canvas"
                    surface="placeholder"
                  >
                    Shared canvas slot
                  </HzTopologyWorkbenchSlot>
                  <HzTopologyWorkbenchSlot
                    data-hz-ui-lab-topology-workbench-companion-slot="shared"
                    kind="companion"
                    surface="placeholder"
                  >
                    Shared companion slot
                  </HzTopologyWorkbenchSlot>
                </HzTopologyWorkbenchGrid>
              </HzTopologyWorkbenchFrame>
              <HzTopologyCanvas
                data-hz-ui-lab-topology-g6-canvas-shell="shared"
                layout="layered-service"
                interactionMode="inspect"
                interactionScope="hover-group"
                hoverMode="neighbor-highlight"
                drawerMode="node-edge"
                focusDepth="2-hop"
                minHeight="compact"
                boundary="section"
              >
                <HzTopologyCanvasAnnotation
                  data-hz-ui-lab-topology-g6-annotation="shared"
                  title="G6 service graph canvas"
                  copy="AntV G6 renderer with RED-coded relationships"
                  visibility="assistive"
                />
                <HzTopologyG6Canvas
                  graph={topologyG6LabGraph}
                  selectedNodeId={topologyG6LabSelection.nodeId || undefined}
                  selectedEdgeId={topologyG6LabSelection.edgeId || undefined}
                  hoveredNodeId="svc-checkout"
                  layout="layered-service"
                  height="compact"
                  onNodeSelect={handleTopologyG6LabNodeSelect}
                  onEdgeSelect={handleTopologyG6LabEdgeSelect}
                  filterScope={{
                    environment: 'prod',
                    sourceKind: 'otlp-trace-call',
                    groupBy: 'source-kind',
                    searchQuery: 'checkout'
                  }}
                  filterControls={[
                    {
                      id: 'source-kind',
                      kind: 'source-kind',
                      label: 'Source',
                      value: 'otlp-trace-call',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod',
                      active: true
                    },
                    {
                      id: 'group-by',
                      kind: 'group-by',
                      label: 'Group',
                      value: 'source-kind',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod&groupBy=source-kind',
                      active: true
                    },
                    {
                      id: 'search',
                      kind: 'search',
                      label: 'Search',
                      value: 'checkout',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod&search=checkout'
                    },
                    {
                      id: 'reset',
                      kind: 'reset',
                      label: 'Reset',
                      value: 'all',
                      href: '/topology?environment=prod'
                    }
                  ]}
                  groupItemHrefs={{
                    'otlp-trace-call': '/topology?sourceKind=otlp-trace-call&environment=prod&groupBy=source-kind',
                    'template-dependency': '/topology?sourceKind=template-dependency&environment=prod&groupBy=source-kind',
                    'database-middleware-connection':
                      '/topology?sourceKind=database-middleware-connection&environment=prod&groupBy=source-kind',
                    'monitor-ownership': '/topology?sourceKind=monitor-ownership&environment=prod&groupBy=source-kind'
                  }}
                  legendSlot={
                <HzTopologyLegend
                  data-hz-ui-lab-topology-g6-legend-dock="shared"
                  title="Legend"
                  summaryLabel="In canvas"
                  boundary="flush"
                  density="canvas-dock"
                  sections={[
                        {
                          id: 'status',
                          label: 'Status',
                          items: [
                            { id: 'healthy-node', label: 'Healthy', color: '#22c55e', visualSource: 'hertzbeat-status-token', value: 'healthy' },
                            { id: 'warning-node', label: 'Warning', color: '#f59e0b', visualSource: 'hertzbeat-status-token', value: 'warning' },
                            { id: 'critical-node', label: 'Critical', color: '#ef4444', visualSource: 'hertzbeat-status-token', value: 'critical' }
                          ]
                        },
                        {
                          id: 'interaction',
                          label: 'Interaction',
                          items: [
                            { id: 'selected-node', label: 'Selected', color: '#e5edf8', visualSource: 'hertzbeat-interaction-token', value: 'selected' },
                            { id: 'directional-edge', label: 'Edge', color: '#94a3b8', pattern: 'solid', visualSource: 'hertzbeat-edge-token', value: 'direction' },
                            { id: 'dimmed-edge', label: 'Dimmed', color: '#94a3b8', pattern: 'muted', visualSource: 'hertzbeat-edge-token', value: 'context' }
                          ]
                        }
                      ]}
                    />
                  }
                  summaryLabel="7 nodes · 6 edges"
                  overlayMode="non-occluding"
                  fitViewLabel="Fit view"
                  resetViewLabel="Reset view"
                  zoomInLabel="Zoom in"
                  zoomOutLabel="Zoom out"
                  data-hz-ui-lab-topology-g6-canvas="grafana-inspired-shared"
                  data-hz-ui-lab-topology-g6-selection-mode="in-page-click-drawer-demo"
                  data-hz-ui-lab-topology-g6-selected-node={topologyG6LabSelection.nodeId || 'none'}
                  data-hz-ui-lab-topology-g6-selected-edge={topologyG6LabSelection.edgeId || 'none'}
                  data-hz-ui-lab-topology-g6-selection-source={topologyG6LabSelection.source}
                  data-hz-ui-lab-topology-g6-group-summary="shared"
                  data-hz-ui-lab-topology-g6-non-occluding="shared"
                />
              </HzTopologyCanvas>
              <HzTopologyCanvas
                data-hz-ui-lab-topology-g6-scale-contract="50-200-500"
                data-hz-ui-lab-topology-g6-scale-50={topologyG6ScaleLabProfile50.nodeCount}
                data-hz-ui-lab-topology-g6-scale-200={topologyG6ScaleLabProfile200.nodeCount}
                data-hz-ui-lab-topology-g6-scale-500={topologyG6ScaleLabProfile500.nodeCount}
                data-hz-ui-lab-topology-g6-large-graph-200-strategy={topologyG6LargeGraphStrategy200.strategy}
                data-hz-ui-lab-topology-g6-large-graph-500-strategy={topologyG6LargeGraphStrategy500.strategy}
                data-hz-ui-lab-topology-g6-large-graph-500-filtering={topologyG6LargeGraphStrategy500.filtering}
                data-hz-ui-lab-topology-g6-large-graph-500-table-companion={topologyG6LargeGraphStrategy500.tableCompanion}
                data-hz-ui-lab-topology-g6-render-window="500-node-windowed-shared"
                data-hz-ui-lab-topology-g6-render-window-mode={topologyG6ScaleLabRenderWindow500.mode}
                data-hz-ui-lab-topology-g6-render-window-rendered={topologyG6ScaleLabRenderWindow500.renderedNodeCount}
                data-hz-ui-lab-topology-g6-render-window-hidden={topologyG6ScaleLabRenderWindow500.hiddenNodeCount}
                layout="force"
                interactionMode="inspect"
                interactionScope="hover-group"
                hoverMode="neighbor-highlight"
                drawerMode="node-edge"
                focusDepth="2-hop"
                minHeight="compact"
                boundary="section"
              >
                <HzTopologyCanvasAnnotation
                  data-hz-ui-lab-topology-g6-scale-annotation="shared"
                  title="G6 scale fixture"
                  copy="50/200/500 node contracts for large graph checks"
                  visibility="assistive"
                />
                <HzTopologyG6Canvas
                  graph={topologyG6ScaleLabGraph500}
                  selectedNodeId={topologyG6ScaleLabSelection.nodeId}
                  selectedEdgeId={topologyG6ScaleLabSelection.edgeId}
                  searchQuery="Service 420"
                  layout="force"
                  height="compact"
                  onNodeSelect={handleTopologyG6ScaleLabNodeSelect}
                  onEdgeSelect={handleTopologyG6ScaleLabEdgeSelect}
                  filterScope={{
                    environment: 'prod',
                    sourceKind: 'otlp-trace-call',
                    groupBy: 'source-kind',
                    searchQuery: 'Service 420'
                  }}
                  filterControls={[
                    {
                      id: 'source-kind',
                      kind: 'source-kind',
                      label: 'Source',
                      value: 'otlp-trace-call',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod',
                      active: true
                    },
                    {
                      id: 'group-by',
                      kind: 'group-by',
                      label: 'Group',
                      value: 'source-kind',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod&groupBy=source-kind',
                      active: true
                    },
                    {
                      id: 'search',
                      kind: 'search',
                      label: 'Search',
                      value: 'Service 420',
                      href: '/topology?sourceKind=otlp-trace-call&environment=prod&search=Service+420'
                    },
                    {
                      id: 'reset',
                      kind: 'reset',
                      label: 'Reset',
                      value: 'all',
                      href: '/topology?environment=prod'
                    }
                  ]}
                  summaryLabel={`${topologyG6ScaleLabProfile500.nodeCount} nodes · ${topologyG6ScaleLabProfile500.edgeCount} edges`}
                  fitViewLabel="Fit view"
                  resetViewLabel="Reset view"
                  zoomInLabel="Zoom in"
                  zoomOutLabel="Zoom out"
                  data-hz-ui-lab-topology-g6-scale-canvas="500-node-windowed-shared"
                  data-hz-ui-lab-topology-g6-scale-selection-mode="in-page-click-drawer-demo"
                  data-hz-ui-lab-topology-g6-scale-selected-node={topologyG6ScaleLabSelection.nodeId ?? 'none'}
                  data-hz-ui-lab-topology-g6-scale-selected-edge={topologyG6ScaleLabSelection.edgeId ?? 'none'}
                  data-hz-ui-lab-topology-g6-scale-selection-source={topologyG6ScaleLabSelection.source}
                  data-hz-ui-lab-topology-g6-scale-browser-regression="zoom-hover-select-table-stable"
                  data-hz-ui-lab-topology-g6-scale-browser-regression-owner="hertzbeat-ui-g6-scale-regression"
                  data-hz-ui-lab-topology-g6-scale-browser-regression-invariants="no-url-change no-remount viewport-preserved table-companion"
                />
              </HzTopologyCanvas>
              <HzTopologyCanvas
                data-hz-ui-lab-topology-canvas="shared"
                layout="layered-service"
                interactionMode="inspect"
                interactionScope="hover-group"
                hoverMode="neighbor-highlight"
                drawerMode="node-edge"
                focusDepth="2-hop"
                minHeight="compact"
                boundary="section"
              >
                <HzTopologyCanvasAnnotation
                  data-hz-ui-lab-topology-canvas-annotation="shared"
                  title="Layered service graph canvas"
                  copy="Hover highlights neighbors"
                  visibility="assistive"
                />
                <HzTopologyGraphLayer data-hz-ui-lab-topology-graph-layer="shared">
                  <HzTopologyEdge
                    data-hz-ui-lab-topology-edge="shared"
                    id="api-warehouse"
                    variant="line"
                    tone="orange"
                    focus="active-path"
                    selected
                    from={{ x: 24, y: 52 }}
                    to={{ x: 64, y: 52 }}
                    relationshipType="trace-call"
                    source="otlp-trace-call"
                    evidenceBadges={['trace', 'alert']}
                    redMetrics={{ requestRatePerSecond: 2.13, errorRate: 0.031, latencyP95Ms: 96 }}
                  />
                </HzTopologyGraphLayer>
                <HzTopologyEdge
                  id="api-warehouse"
                  variant="drilldown"
                  href="/ui-lab#topology-edge"
                  aria-label="Inspect API to warehouse edge"
                  tone="orange"
                  focus="active-path"
                  selected
                  from={{ x: 24, y: 52 }}
                  to={{ x: 64, y: 52 }}
                  relationshipType="trace-call"
                  source="otlp-trace-call"
                  evidenceBadges={['trace', 'alert']}
                  redMetrics={{ requestRatePerSecond: 2.13, errorRate: 0.031, latencyP95Ms: 96 }}
                />
                <HzTopologyNode
                  data-hz-ui-lab-topology-node="shared"
                  href="/ui-lab#topology-api"
                  label="API"
                  healthLabel="Health 82"
                  healthCopy="trace and relation evidence"
                  entityType="service"
                  source="otlp-trace-call"
                  health="warning"
                  tone="warning"
                  focus="active"
                  evidenceBadges={['trace', 'relation']}
                  redMetrics={{ requestRatePerSecond: 2.13, errorRate: 0.031, latencyP95Ms: 96 }}
                  position={{ x: 24, y: 52, size: 84 }}
                />
                <HzTopologyNode
                  href="/ui-lab#topology-warehouse"
                  label="Warehouse"
                  healthLabel="Health 96"
                  healthCopy="trace evidence"
                  entityType="database"
                  source="monitor-ownership"
                  health="healthy"
                  tone="success"
                  focus="related"
                  evidenceBadges={['monitor']}
                  redMetrics={{ requestRatePerSecond: 2.06, errorRate: 0, latencyP95Ms: 22 }}
                  position={{ x: 64, y: 52, size: 84 }}
                />
                <HzTopologyHoverTooltip
                  data-hz-ui-lab-topology-hover-tooltip="shared"
                  kind="edge"
                  title="API -> Warehouse"
                  summary="OTLP trace-call edge"
                  visibility="preview"
                  trigger="live-edge-hover"
                  placement="canvas-anchor"
                  anchor={{ x: 316, y: 206, source: 'g6-pointer' }}
                  size="compact"
                  facts={[
                    { id: 'source', label: 'Source', value: 'API', meta: 'service:commerce/api' },
                    { id: 'target', label: 'Target', value: 'Warehouse', meta: 'database:orders' },
                    { id: 'relation-type', label: 'Relation', value: 'trace-call' },
                    { id: 'last-seen', label: 'Last seen', value: '2026/04/29 13:20:00' },
                    { id: 'sample-trace', label: 'Sample trace', value: 'trace-1428' }
                  ]}
                  metrics={[
                    { id: 'request-rate', label: 'Rate', value: '2.13/s', tone: 'info' },
                    { id: 'error-rate', label: 'Errors', value: '3.1%', tone: 'warning' },
                    { id: 'latency-p95', label: 'P95', value: '96ms', tone: 'warning' }
                  ]}
                  evidenceBadges={['trace', 'alert']}
                />
              </HzTopologyCanvas>
              <HzTopologyCompanionRail
                data-hz-ui-lab-topology-companion-rail="shared"
                data-hz-ui-lab-topology-companion-rail-priority="graph-first"
                density="compact"
                placement="stack"
                boundary="stack-section"
                priority="graph-first"
                stickyContext="jump-list"
              >
                <HzTopologyCompanionJumpList
                  data-hz-ui-lab-topology-companion-jump-list="shared"
                  ariaLabel="Topology companion sections"
                  density="graph-first"
                  activeMode="contained-rail-scroll"
                  items={[
                    { id: 'legend', href: '#topology-companion-legend', label: 'Legend', active: true },
                    { id: 'edge-detail', href: '#topology-companion-edge-detail', label: 'Edge' },
                    { id: 'current-node', href: '#topology-companion-current-node', label: 'Node' },
                    { id: 'timeline', href: '#topology-companion-timeline', label: 'Timeline' },
                    { id: 'edge-red', href: '#topology-companion-edge-red', label: 'RED' }
                  ]}
                />
                <HzTopologyCompanionSection
                  data-hz-ui-lab-topology-companion-section="legend"
                  sectionId="legend"
                  anchorId="topology-companion-legend"
                  density="graph-first"
                >
                  <HzTopologySectionLabel data-hz-ui-lab-topology-section-label="shared">
                    Topology companion
                  </HzTopologySectionLabel>
                  <HzTopologyLegend
                    data-hz-ui-lab-topology-legend="shared"
                    title="Topology legend"
                    summaryLabel="2 groups"
                    boundary="flush"
                    sections={[
                      {
                        id: 'status',
                        label: 'Status',
                        items: [
                          { id: 'healthy-node', label: 'Healthy', color: '#22c55e', visualSource: 'hertzbeat-status-token', value: 'healthy' },
                          { id: 'warning-node', label: 'Warning', color: '#f59e0b', visualSource: 'hertzbeat-status-token', value: 'warning' },
                          { id: 'critical-node', label: 'Critical', color: '#ef4444', visualSource: 'hertzbeat-status-token', value: 'critical' }
                        ]
                      },
                      {
                        id: 'interaction',
                        label: 'Interaction',
                        items: [
                          { id: 'selected-node', label: 'Selected node', color: '#e5edf8', visualSource: 'hertzbeat-interaction-token', value: 'selected' },
                          { id: 'directional-edge', label: 'Directional edge', color: '#94a3b8', pattern: 'solid', visualSource: 'hertzbeat-edge-token', value: 'arrow direction' },
                          { id: 'dimmed-edge', label: 'Dimmed edge', color: '#94a3b8', pattern: 'muted', visualSource: 'hertzbeat-edge-token', value: 'outside selection' }
                        ]
                      }
                    ]}
                  />
                </HzTopologyCompanionSection>
                <HzTopologyCompanionSection
                  data-hz-ui-lab-topology-companion-section="edge-detail"
                  sectionId="edge-detail"
                  anchorId="topology-companion-edge-detail"
                  density="graph-first"
                >
                  <HzTopologyDetailDrawer
                  data-hz-ui-lab-topology-detail-drawer="shared"
                  kind="edge"
                  density="graph-first"
                  subjectId="api-warehouse"
                  sourceId="svc-api"
                  targetId="db-warehouse"
                  relationType="trace-call"
                  sourceKind="otlp-trace-call"
                  eyebrow="Relationship evidence"
                  title="API to warehouse"
                  subtitle="Trace call · collector-a"
                  boundary="This edge is backed by selected-window trace and alert evidence."
                  boundaryProps={{ 'data-hz-ui-lab-topology-detail-boundary': 'shared' } as React.HTMLAttributes<HTMLDivElement>}
                  facts={[
                    { id: 'source-entity', label: 'Source entity', value: 'API', meta: 'service:api' },
                    { id: 'target-entity', label: 'Target entity', value: 'Warehouse', meta: 'database:warehouse' },
                    { id: 'request-rate', label: 'Request rate', value: '2.13/s', meta: 'Trace graph', tone: 'info' },
                    { id: 'error-rate', label: 'Error rate', value: '3.1%', meta: 'Trace graph', tone: 'warning' }
                  ]}
                  actions={[
                    { id: 'from-entity', href: '/ui-lab#topology-api', label: 'Source entity' },
                    { id: 'alert-impact', href: '/ui-lab#topology-alerts', label: 'Alert impact', emphasis: 'primary', copy: 'Open with the current edge and time scope.' }
                  ]}
                  signalActions={[
                    { id: 'metrics', href: '/ui-lab#topology-metrics', label: 'Metrics evidence', emphasis: 'primary' },
                    { id: 'logs', href: '/ui-lab#topology-logs', label: 'Logs evidence' },
                    { id: 'traces', href: '/ui-lab#topology-traces', label: 'Traces evidence' }
                  ]}
                  surface="flush"
                />
                </HzTopologyCompanionSection>
                <HzTopologyCompanionSection
                  data-hz-ui-lab-topology-companion-section="current-node"
                  sectionId="current-node"
                  anchorId="topology-companion-current-node"
                  density="graph-first"
                >
                  <HzTopologyDetailDrawer
                  data-hz-ui-lab-topology-node-detail-drawer="shared"
                  kind="node"
                  density="graph-first"
                  subjectId="svc-checkout"
                  entityType="service"
                  sourceKind="otlp-trace-call"
                  eyebrow="Current entity"
                  title="checkout-api"
                  subtitle="service:checkout · prod"
                  boundary="Keep the selected topology scope when opening entity evidence."
                  boundaryProps={{ 'data-hz-ui-lab-topology-node-detail-boundary': 'shared' } as React.HTMLAttributes<HTMLDivElement>}
                  facts={[
                    { id: 'entity-id', label: 'Entity id', value: 'service:checkout', meta: 'commerce' },
                    { id: 'health', label: 'Health', value: '82', meta: '1 unhealthy monitor', tone: 'warning' },
                    { id: 'request-rate', label: 'Request rate', value: '12.34/s', meta: 'Trace graph', tone: 'info' }
                  ]}
                  actions={[
                    { id: 'entity', href: '/ui-lab#topology-entity', label: 'Entity detail', emphasis: 'primary' }
                  ]}
                  signalActionsLabel="Open signals"
                  signalActions={[
                    { id: 'metrics', href: '/ui-lab#topology-metrics', label: 'Metrics evidence', emphasis: 'primary' },
                    { id: 'logs', href: '/ui-lab#topology-logs', label: 'Logs evidence' },
                    { id: 'traces', href: '/ui-lab#topology-traces', label: 'Traces evidence' }
                  ]}
                  surface="flush"
                />
                </HzTopologyCompanionSection>
                <HzTopologyCompanionSection
                  data-hz-ui-lab-topology-companion-section="timeline"
                  data-hz-ui-lab-topology-companion-section-collapsible="shared"
                  sectionId="timeline"
                  anchorId="topology-companion-timeline"
                  density="graph-first"
                  collapsible
                  collapsed={topologyCompanionCollapsedSections.timeline ?? false}
                  collapseLabel="Hide timeline"
                  expandLabel="Show timeline"
                  onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('timeline', collapsed)}
                >
                  <HzTopologyEvidenceList
                  data-hz-ui-lab-topology-evidence-list="shared"
                  kind="impact-timeline"
                  title="Impact timeline"
                  copy="Selected-window topology evidence stays compact and scannable."
                  boundary="companion-timeline"
                  items={[
                    {
                      id: 'activity:901',
                      label: 'CMDB',
                      value: 'Definition updated',
                      meta: 'owner changed - alice',
                      tone: 'info',
                      'data-topology-impact-timeline-event': 'activity:901'
                    },
                    {
                      id: 'relation:101',
                      label: 'Relation',
                      value: 'depends_on updated',
                      meta: 'manual - system',
                      tone: 'warning',
                      'data-topology-impact-timeline-event': 'relation:101'
                    }
                  ]}
                />
                </HzTopologyCompanionSection>
                <HzTopologyCompanionSection
                  data-hz-ui-lab-topology-companion-section="edge-red"
                  data-hz-ui-lab-topology-companion-section-collapsible="shared"
                  sectionId="edge-red"
                  anchorId="topology-companion-edge-red"
                  density="graph-first"
                  collapsible
                  collapsed={topologyCompanionCollapsedSections['edge-red'] ?? false}
                  collapseLabel="Hide RED"
                  expandLabel="Show RED"
                  onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('edge-red', collapsed)}
                >
                  <HzTopologyMetricTable
                  data-hz-ui-lab-topology-metric-table="shared"
                  data-hz-ui-lab-topology-metric-table-scale-selection="edge-sync"
                  data-hz-ui-lab-topology-metric-table-scale-selection-owner="hertzbeat-ui-metric-table-scale-selection"
                  title="Topology RED ranking"
                  density="graph-first"
                  rows={topologyMetricRows}
                  selectedRowId={topologyG6ScaleLabSelection.edgeId ?? 'scale-edge-420-421'}
                  renderWindowFilter={topologyMetricWindowFilter}
                  onRenderWindowFilterChange={setTopologyMetricWindowFilter}
                  renderWindowCompanion={{
                    mode: topologyG6ScaleLabRenderWindow500.mode,
                    totalNodeCount: topologyG6ScaleLabRenderWindow500.totalNodeCount,
                    renderedNodeCount: topologyG6ScaleLabRenderWindow500.renderedNodeCount,
                    hiddenNodeCount: topologyG6ScaleLabRenderWindow500.hiddenNodeCount,
                    visibleNodeBudget: topologyG6ScaleLabRenderWindow500.visibleNodeBudget,
                    tableCompanion: topologyG6ScaleLabRenderWindow500.tableCompanion,
                    priorityNodeIds: topologyG6ScaleLabRenderWindow500.priorityNodeIds,
                    renderedNodeIds: topologyG6ScaleLabRenderWindow500.graph.nodes.map(node => node.id)
                  }}
                  labels={{ rowAction: 'Inspect edge' }}
                  onRowSelect={handleTopologyG6ScaleLabTableRowSelect}
                  boundary="flush"
                />
                </HzTopologyCompanionSection>
                <HzTopologyEmptyState
                  data-hz-ui-lab-topology-empty-state="shared"
                  title="No topology evidence"
                  copy="The selected time scope has no trace, relation, monitor, or incident evidence yet."
                  sourceLabel="API"
                  timeScope="last-1h"
                  environment="prod"
                  sourceKind="otlp-trace-call"
                  relationType="trace-call"
                  focusEntityId="service:commerce/checkout"
                  depth={2}
                  resultCount={0}
                  evidenceSources={['trace', 'relation', 'monitor', 'incident']}
                  boundary="flush"
                />
                <HzTopologyEmptyState
                  data-hz-ui-lab-topology-degraded-state="shared"
                  title="Topology API unavailable"
                  copy="The graph is degraded because API, Greptime, trace, or relation evidence cannot be loaded for this scope."
                  sourceLabel="Topology API unavailable"
                  timeScope="last-1h"
                  environment="prod"
                  sourceKind="otlp-trace-call"
                  relationType="trace-call"
                  focusEntityId="service:commerce/checkout"
                  depth={2}
                  resultCount={0}
                  evidenceSources={['api', 'greptime', 'trace', 'relation']}
                  kind="degraded"
                  boundary="flush"
                />
                <HzTopologyLoadingState
                  data-hz-ui-lab-topology-loading-state="shared"
                  title="Loading topology evidence"
                  copy="Fetching API, Greptime, trace, and relation evidence for this scope."
                  sourceLabel="Topology API"
                  timeScope="last-1h"
                  environment="prod"
                  sourceKind="otlp-trace-call"
                  relationType="trace-call"
                  focusEntityId="service:commerce/checkout"
                  depth={2}
                  evidenceSources={['api', 'greptime', 'trace', 'relation']}
                  rows={3}
                  boundary="flush"
                />
              </HzTopologyCompanionRail>
              <HzTraceEventTimeline
                title="Span events"
                events={traceSpanEvents}
                totalMs={126}
                selectedSpanId={selectedTraceSpan.id}
                className="border-x-0 border-t border-[var(--hz-ui-line-soft)]"
              />
              <div
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface-soft)] px-3 py-2 text-[11px]"
                data-hz-ui="trace-selection-summary"
                data-hz-selected-trace-span={selectedTraceSpan.id}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-[#f3f6fb]">Selected span</div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-[#8f99ab]">
                    {selectedTraceSpan.service} / {selectedTraceSpan.operation}
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-3 text-right font-mono text-[10px] text-[#8f99ab]">
                  <span>
                    <span className="block text-[#dbe4f0]">{selectedTraceSpan.durationMs}ms</span>
                    duration
                  </span>
                  <span>
                    <span className="block text-[#dbe4f0]">{selectedTraceSpan.selfMs || selectedTraceSpan.durationMs}ms</span>
                    self
                  </span>
                  <span>
                    <span className="block text-[#dbe4f0]">{selectedTraceSpanEvents.length}</span>
                    events
                  </span>
                </div>
              </div>
              <HzTraceWaterfall
                title="Trace waterfall"
                spans={traceWaterfallSpans}
                events={traceSpanEvents}
                selectedSpanId={selectedTraceSpan.id}
                criticalPathSpanIds={['api', 'collector']}
                onSpanSelect={span => {
                  setSelectedTraceSpanId(span.id);
                  setContextMessage(`上下文窗口: trace span ${span.id} · ${span.durationMs}ms · logs/traces`);
                }}
                className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)]"
              />
            </div>
          </div>
          <div
            className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] 2xl:grid-cols-[minmax(0,1fr)_320px]"
            data-hz-ui-lab-monitor-detail-states="shared"
          >
            <HzLogVolumeChart
              title="Log volume"
              buckets={logVolumeBuckets}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <HzLogLevelDistribution
              title="Log level distribution"
              levels={logLevelDistribution}
              className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
            <HzTraceLatencyDistribution
              title="Trace latency distribution"
              buckets={traceLatencyBuckets}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <HzTraceSpanTable
              title="Span table"
              spans={traceWaterfallSpans}
              className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
            />
          </div>
          <div className="grid min-w-0 border-b border-[var(--hz-ui-line-soft)] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <HzStateNotice
              tone="warning"
              title="Query partially delayed"
              description="Metrics and logs returned. Trace aggregates are still catching up for the selected window."
              meta="lag 42s"
              variant="embedded"
              actions={
                <>
                  <HzButton size="sm">Retry</HzButton>
                  <HzButton size="sm" intent="ghost">Inspect</HzButton>
                </>
              }
              className="2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <div className="grid min-w-0 sm:grid-cols-2 2xl:grid-cols-1">
              <HzLoadingState
                data-hz-ui-lab-monitor-editor-loading-state="shared"
                title="Loading history"
                description="Backfilling the previous range."
                rows={3}
                className="border-x-0 border-y-0 sm:border-r sm:border-[var(--hz-ui-line-soft)] 2xl:border-b 2xl:border-r-0"
              />
              <section
                className="border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3"
                data-hz-ui-lab-monitor-editor-error-state="shared"
                data-monitor-editor-route-state-owner="hertzbeat-ui-inline-feedback"
              >
                <HzInlineFeedback
                  tone="critical"
                  title="Failed to load the monitor form"
                  description="The monitor form could not be initialized right now. Please try again."
                  variant="embedded"
                  data-monitor-editor-route-state-feedback="error"
                />
                <div className="mt-3 flex justify-center">
                  <HzButton
                    size="sm"
                    intent="primary"
                    data-monitor-editor-route-state-retry="true"
                    data-monitor-editor-route-state-retry-owner="hertzbeat-ui-button"
                    onClick={() => setContextMessage('Monitor route-state retry')}
                  >
                    Retry
                  </HzButton>
                </div>
              </section>
              <section
                className="border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)]"
                data-hz-ui-lab-monitor-detail-route-state="shared"
                data-monitor-detail-route-state-owner="hertzbeat-ui-loading-state"
              >
                <HzLoadingState
                  title="Loading monitor details"
                  description="Please wait while the page prepares the monitor instance, metric summary, and history trends."
                  rows={3}
                  data-monitor-detail-route-state-loading="true"
                />
              </section>
              <section
                className="border-y border-[var(--hz-ui-line-soft)] bg-[var(--hz-ui-surface)] px-3 py-3"
                data-hz-ui-lab-monitor-detail-error-state="shared"
                data-monitor-detail-route-state-owner="hertzbeat-ui-inline-feedback"
              >
                <HzInlineFeedback
                  tone="critical"
                  title="Failed to load monitor details"
                  description="The monitor details could not be loaded right now. Try again later or reopen the monitor from the list."
                  variant="embedded"
                  data-monitor-detail-route-state-feedback="error"
                />
                <div className="mt-3 flex justify-center">
                  <HzButton
                    size="sm"
                    intent="primary"
                    data-monitor-detail-route-state-retry="true"
                    data-monitor-detail-route-state-retry-owner="hertzbeat-ui-button"
                    onClick={() => setContextMessage('Monitor detail route-state retry')}
                  >
                    Retry
                  </HzButton>
                </div>
              </section>
              <HzEmptyState
                title="No matching logs"
                description="Widen time range or clear status filter."
                actions={<HzButton size="sm" intent="ghost" onClick={clearFilterClauses}>Clear</HzButton>}
                className="border-x-0 border-y-0"
              />
            </div>
          </div>
          <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#f3f6fb]">Monitor results</div>
              <div className="text-[11px] text-[#727b8c]">最近 15 分钟 · 按采集延迟降序</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[11px] text-[#8f99ab]">list view</span>
              <HzButton size="sm" intent="ghost" aria-label="Open selected resource inspector" onClick={() => setInspectorOpen(true)}>
                <Search size={13} />
                Inspect
              </HzButton>
              <HzButton size="sm">
                <RefreshCw size={13} />
                Refresh
              </HzButton>
            </div>
          </div>
          <HzDataTable
            variant="embedded"
            columns={resultColumnDefinitions}
            rows={monitorRows}
            getRowKey={row => row.name}
            selectedRowKey={selectedMonitor.name}
            onRowClick={row => {
              setSelectedMonitorName(row.name);
              setContextMessage(`上下文窗口: ${row.name} · ${row.collector} · 最近 15 分钟`);
              setInspectorOpen(true);
            }}
          />
          <HzBatchToolbar
            selectionCount={2}
            selectionLabel="monitors selected"
            data-hz-ui-lab-monitor-batch-response-filter="angular-status-filtered-selection"
            data-monitor-batch-response-filter-owner="hertzbeat-ui-batch-toolbar"
            data-hz-ui-lab-monitor-batch-more-menu="angular-toolbar-ellipsis-menu"
            data-monitor-batch-more-menu-owner="hertzbeat-ui-batch-toolbar"
            overflowLabel="More monitor operations"
            overflowButtonProps={{
              'data-monitor-batch-more-menu-trigger': 'angular-ellipsis-menu',
              'data-monitor-batch-more-menu-trigger-owner': 'hertzbeat-ui-icon-button'
            }}
            overflowPanelProps={{
              'data-monitor-batch-more-menu-panel': 'angular-nz-dropdown-menu',
              'data-monitor-batch-more-menu-clearance': 'floating-overlay-no-table-crop',
              'data-monitor-batch-more-menu-panel-owner': 'hertzbeat-ui-batch-toolbar'
            }}
            actions={[
              {
                id: 'enable',
                label: 'Enable',
                presentation: 'menu',
                onSelect: () => setContextMessage('批量操作: enable only paused selected monitors'),
                buttonProps: {
                  'data-monitor-batch-response-filter': 'angular-status-filtered-selection',
                  'data-monitor-batch-response-eligible-status': 'paused',
                  'data-monitor-batch-response-action-owner': 'hertzbeat-ui-batch-toolbar',
                  'data-monitor-batch-more-menu-action': 'enable'
                }
              },
              {
                id: 'pause',
                label: 'Pause',
                presentation: 'menu',
                onSelect: () => setContextMessage('批量操作: pause only active selected monitors'),
                buttonProps: {
                  'data-monitor-batch-response-filter': 'angular-status-filtered-selection',
                  'data-monitor-batch-response-eligible-status': 'active',
                  'data-monitor-batch-response-action-owner': 'hertzbeat-ui-batch-toolbar',
                  'data-monitor-batch-more-menu-action': 'pause'
                }
              },
              {
                id: 'export-type',
                label: 'Export...',
                presentation: 'menu',
                onSelect: () => setMonitorExportDialogOpen(true),
                buttonProps: {
                  'data-hz-ui-lab-monitor-export-type-trigger': 'shared',
                  'data-hz-ui-lab-monitor-export-type-trigger-flow': 'angular-trigger-type-modal-before-download',
                  'data-monitor-export-type-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                  'data-monitor-batch-more-menu-action': 'export-selected'
                }
              },
              {
                id: 'export-all',
                label: 'Export all...',
                presentation: 'menu',
                onSelect: () => setMonitorExportDialogOpen(true),
                buttonProps: {
                  'data-hz-ui-lab-monitor-export-all-trigger': 'shared',
                  'data-hz-ui-lab-monitor-export-type-trigger-flow': 'angular-trigger-type-modal-before-download',
                  'data-monitor-export-type-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                  'data-monitor-batch-more-menu-action': 'export-all'
                }
              },
              {
                id: 'import',
                label: 'Import',
                presentation: 'menu',
                onSelect: () => setContextMessage('批量操作: import monitors'),
                buttonProps: {
                  'data-monitor-batch-more-menu-action': 'import'
                }
              },
              {
                id: 'delete',
                label: 'Delete',
                tone: 'critical',
                presentation: 'menu',
                onSelect: () => setContextMessage('批量操作: delete requires confirmation'),
                buttonProps: {
                  'data-monitor-batch-more-menu-action': 'delete'
                }
              }
            ]}
            variant="embedded"
          />
          <HzCheckbox
            disabled
            label="Unavailable monitor excluded from selection"
            data-hz-ui-lab-monitor-disabled-selection="shared"
            data-monitor-disabled-selection-owner="hertzbeat-ui-checkbox"
          />
          <HzInlineFeedback
            tone="info"
            title="Import [monitors-prod.yml] submitted"
            meta="Preparing import"
            variant="embedded"
            data-hz-ui-lab-monitor-import-feedback="shared"
            data-hz-ui-lab-monitor-import-clears-selection="shared"
            data-hz-ui-lab-monitor-import-failure-retains-selection="shared"
            data-monitor-import-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="This monitor item is no longer available, the list will refresh automatically"
            meta="Refresh queued"
            variant="embedded"
            data-hz-ui-lab-monitor-unavailable-refresh="shared"
            data-monitor-unavailable-refresh-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <SearchRow
            value="数据库"
            placeholder="Search threshold rules"
            searchLabel="Search"
            clearLabel="Clear"
            onValueChange={() => undefined}
            onSearch={() => setContextMessage('Alert setting search · localized app label maps to app key')}
            onClear={() => setContextMessage('Alert setting search · cleared')}
            data-hz-ui-lab-alert-setting-search-translation="angular-app-entry-search"
            data-alert-setting-search-translation-contract="angular-app-entry-search"
            data-alert-setting-search-translation-owner="alert-setting-query-state"
            data-alert-setting-search-translation-source="/apps/defines"
          />
          <HzBatchToolbar
            selectionCount={2}
            selectionLabel="threshold rules selected"
            actions={[
              {
                id: 'export-type',
                label: 'Export',
                onSelect: () => setAlertSettingExportDialogOpen(true),
                buttonProps: {
                  'data-hz-ui-lab-alert-setting-export-trigger': 'shared',
                  'data-alert-setting-export-trigger-owner': 'hertzbeat-ui-batch-toolbar'
                }
              },
              {
                id: 'import',
                label: 'Import',
                onSelect: () => setContextMessage('Alert setting import · file upload'),
                buttonProps: {
                  'data-hz-ui-lab-alert-setting-import-trigger': 'shared',
                  'data-alert-setting-import-trigger-owner': 'hertzbeat-ui-batch-toolbar'
                }
              },
              {
                id: 'delete',
                label: 'Bulk delete',
                tone: 'critical',
                onSelect: () => setContextMessage('Alert setting delete requires confirmation'),
                buttonProps: {
                  'data-alert-setting-delete-trigger-owner': 'hertzbeat-ui-batch-toolbar'
                }
              }
            ]}
            variant="embedded"
            data-hz-ui-lab-alert-setting-import-export="shared"
            data-alert-setting-batch-owner="hertzbeat-ui-batch-toolbar"
            data-alert-setting-import-export-contract="angular-import-export"
            data-hz-ui-lab-alert-setting-export-success="angular-download-closes-dialog-no-toast"
            data-alert-setting-export-success-owner="route-action-feedback-contract"
            data-hz-ui-lab-alert-setting-export-loading="angular-selected-type-only"
            data-alert-setting-export-loading-owner="route-action-feedback-contract"
          />
          <div
            data-hz-ui-lab-alert-setting-pagination="angular-nz-table-server"
            data-alert-setting-pagination-owner="hertzbeat-ui-pagination-bar"
            data-alert-setting-pagination-contract="angular-page-index-size"
          >
            <HzPaginationBar
              summary="Page 1 / 4 · total 28"
              pageSizeLabel="Page size"
              pageSizeValue="8"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Page"
              pageJumpValue="1"
              pageJumpMax={4}
              previousLabel="Previous"
              nextLabel="Next"
              previousDisabled
              pageSizeSelectProps={
                {
                  'data-alert-setting-pagination-page-size-owner': 'hertzbeat-ui-select'
                } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
              }
              pageJumpInputProps={
                {
                  'data-alert-setting-pagination-page-jump-owner': 'hertzbeat-ui-input'
                } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
              }
            />
          </div>
          <div
            className="grid gap-2"
            data-hz-ui-lab-alert-center-entity-batch="shared"
            data-alert-center-entity-batch-owner="hertzbeat-ui-batch-toolbar"
          >
            <HzCheckbox
              defaultChecked
              label="Select current alert page"
              data-alert-center-batch-select-page="hertzbeat-ui-checkbox"
            />
            <HzBatchToolbar
              selectionCount={2}
              selectionLabel="alert groups selected"
              actions={[
                {
                  id: 'acknowledge-selected',
                  label: 'Acknowledge 1',
                  buttonProps: {
                    'data-alert-center-batch-action': 'acknowledge-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                  }
                },
                {
                  id: 'unacknowledge-selected',
                  label: 'Unacknowledge 1',
                  buttonProps: {
                    'data-alert-center-batch-action': 'unacknowledge-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                  }
                },
                {
                  id: 'resolve-selected',
                  label: 'Resolve 1',
                  buttonProps: {
                    'data-alert-center-batch-action': 'resolve-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                  }
                },
                {
                  id: 'reopen-selected',
                  label: 'Reopen 1',
                  buttonProps: {
                    'data-alert-center-batch-action': 'reopen-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                  }
                },
                {
                  id: 'silence-selected',
                  label: 'Create silence for 2',
                  buttonProps: {
                    'data-alert-center-batch-action': 'silence-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar',
                    'data-alert-center-batch-dialog-source': 'selected-groups'
                  }
                },
                {
                  id: 'inhibit-selected',
                  label: 'Create inhibit for 2',
                  buttonProps: {
                    'data-alert-center-batch-action': 'inhibit-selected',
                    'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar',
                    'data-alert-center-batch-dialog-source': 'selected-groups'
                  }
                }
              ]}
              variant="embedded"
              data-alert-center-batch-toolbar="selected-entity-alerts"
            />
            <HzInlineFeedback
              tone="success"
              title="Quick dialog submit"
              meta="Creates silence/inhibit, clears selection, and refreshes the alert list"
              variant="embedded"
              data-hz-ui-lab-alert-center-rule-submit="quick-dialog-submit"
              data-alert-center-rule-submit-owner="alert-center-quick-dialog"
            />
            <HzInlineFeedback
              tone="success"
              title="Add Success!"
              meta="Alert center quick silence/inhibit creation notification"
              variant="embedded"
              data-hz-ui-lab-alert-center-rule-create-feedback="angular-new-notify"
              data-alert-center-rule-create-feedback-owner="hertzbeat-ui-inline-feedback"
            />
            <HzInlineFeedback
              tone="critical"
              title="Add Failed!"
              meta="Alert center quick silence/inhibit creation failure notification"
              variant="embedded"
              data-hz-ui-lab-alert-center-rule-create-feedback="angular-new-fail"
              data-alert-center-rule-create-feedback-owner="hertzbeat-ui-inline-feedback"
            />
            <HzInlineFeedback
              tone="info"
              title="Quick dialog selection count"
              meta="Single alert group counts as 1; selected batch counts selected groups"
              variant="embedded"
              data-hz-ui-lab-alert-center-rule-selection-count="angular-group-count"
              data-alert-center-rule-selection-count-owner="route-state-contract"
            />
            <HzInlineFeedback
              tone="info"
              title="Inhibit default labels"
              meta="Target labels drop severity; equal labels use the Angular allow-list"
              variant="embedded"
              data-hz-ui-lab-alert-center-inhibit-defaults="angular-drop-severity-equal-allowlist"
              data-alert-center-inhibit-defaults-owner="route-state-contract"
            />
            <HzInlineFeedback
              tone="info"
              title="Batch status confirmation"
              meta="Acknowledge, unacknowledge, resolve, and reopen wait for Angular-style confirmation"
              variant="embedded"
              data-hz-ui-lab-alert-center-batch-confirm="angular-status-confirm"
              data-alert-center-batch-confirm-owner="hertzbeat-ui-confirm-dialog"
            />
            <HzInlineFeedback
              tone="critical"
              title="Row delete confirmation"
              meta="Non-entity alert delete waits for Angular single-delete confirmation"
              variant="embedded"
              data-hz-ui-lab-alert-center-row-delete-confirm="angular-single-delete-confirm"
              data-alert-center-row-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
            />
            <HzInlineFeedback
              tone="warning"
              title="Quick dialog validation"
              meta="Blocks invalid silence/inhibit drafts before API mutation and keeps the dialog open"
              variant="embedded"
              data-hz-ui-lab-alert-center-rule-validation="angular-required-before-submit"
              data-alert-center-rule-validation-owner="alert-center-quick-dialog"
            />
            <HzInlineFeedback
              tone="info"
              title="Entity response return"
              meta="Return links append responseResultKind/action/count after alert operations"
              variant="embedded"
              data-hz-ui-lab-alert-center-response-return="angular-response-result"
              data-alert-center-response-return-owner="route-state-contract"
            />
            <HzInlineFeedback
              tone="warning"
              title="View or create silence rules"
              meta="Possible suppression with zero matching silence keeps Angular's create-capable noise-control label"
              variant="embedded"
              data-hz-ui-lab-alert-center-noise-action-label="angular-view-or-create"
              data-alert-noise-control-action="silence"
              data-alert-noise-control-action-label="angular-view-or-create"
              data-alert-noise-control-action-label-owner="route-state-contract"
            />
            <HzInlineFeedback
              tone="warning"
              title="View or create inhibit rules"
              meta="Possible suppression with zero matching inhibit keeps Angular's create-capable noise-control label"
              variant="embedded"
              data-hz-ui-lab-alert-center-noise-action-label="angular-view-or-create"
              data-alert-noise-control-action="inhibit"
              data-alert-noise-control-action-label="angular-view-or-create"
              data-alert-noise-control-action-label-owner="route-state-contract"
            />
            <HzHeaderRealtimeNotice
              status="live"
              title="Alert center live refresh"
              description="ALERT_EVENT refreshes the filtered alert list through the Angular SSE endpoint"
              meta="ALERT_EVENT"
              data-hz-ui-lab-alert-center-sse-refresh="angular-alert-event-refresh"
              data-alert-center-sse-owner="hertzbeat-ui-header-realtime-notice"
            />
            <div
              className="rounded-[4px] border-l-[3px] border-l-[#4e74f8] bg-[#101827] px-3 py-2 text-[12px] text-[#dbe4f0] shadow-[inset_3px_0_0_rgba(78,116,248,0.28)]"
              data-hz-ui-lab-alert-center-sse-highlight="angular-new-alert"
              data-alert-center-sse-highlight-owner="route-alert-card"
              data-alert-group-card="7"
              data-alert-group-realtime-state="new"
              data-alert-group-realtime-owner="angular-new-alert"
            >
              service:checkout · ALERT_EVENT highlighted
            </div>
            <HzInlineFeedback
              tone="success"
              title="Mark Success!"
              meta="Angular alert status mutation notification"
              variant="embedded"
              data-hz-ui-lab-alert-center-mark-feedback="angular-mark-notify"
              data-alert-center-action-feedback-owner="hertzbeat-ui-inline-feedback"
            />
            <div
              className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-2"
              data-hz-ui-lab-alert-center-acknowledged-actions="angular-unacknowledge-resolve"
              data-alert-center-acknowledged-actions-owner="route-alert-card"
            >
              <HzButton
                size="sm"
                variant="subtle"
                data-alert-group-action="unacknowledge"
                data-alert-group-action-status="acknowledged"
              >
                Unacknowledge
              </HzButton>
              <HzButton
                size="sm"
                variant="subtle"
                data-alert-group-action="resolve"
                data-alert-group-action-status="acknowledged"
              >
                Resolve
              </HzButton>
              <span className="text-[11px] text-[#8f99ab]">acknowledged card keeps Angular resolve affordance</span>
            </div>
            <HzInlineFeedback
              tone="success"
              title="Delete Success!"
              meta="Angular alert close/delete mutation notification"
              variant="embedded"
              data-hz-ui-lab-alert-center-delete-feedback="angular-delete-notify"
              data-alert-center-action-feedback-owner="hertzbeat-ui-inline-feedback"
            />
            <HzInlineFeedback
              tone="info"
              title="Alert delete page clamp"
              meta="Delete success applies Angular updatePageIndex(delSize) before refreshing"
              variant="embedded"
              data-hz-ui-lab-alert-center-delete-clamp="angular-update-page-index"
              data-alert-center-delete-page-clamp-owner="route-state-contract"
            />
            <HzInlineFeedback
              tone="info"
              title="Post-action filters retained"
              meta="Acknowledge, resolve, reopen, and delete reload the current filtered list without changing status/search/severity"
              variant="embedded"
              data-hz-ui-lab-alert-center-post-action-filter="angular-retain-filter"
              data-alert-center-post-action-filter-owner="route-state-contract"
            />
            <HzStatStrip
              columns={4}
              frame="panel-inset"
              spacing="compact"
              data-hz-ui-lab-alert-center-facts-strip="angular-platform-facts-strip"
              data-alert-center-facts-strip-owner="hertzbeat-ui-stat-strip"
            >
              <HzStatCell
                label="Total"
                value="3"
                tone="neutral"
                variant="tile"
                density="compact"
                frame="inset"
                data-alert-center-fact="total"
                data-alert-center-fact-owner="hertzbeat-ui-stat-cell"
              />
              <HzStatCell
                label="Firing"
                value="1"
                tone="critical"
                variant="tile"
                density="compact"
                frame="inset"
                data-alert-center-fact="firing"
                data-alert-center-fact-owner="hertzbeat-ui-stat-cell"
              />
              <HzStatCell
                label="Acknowledged"
                value="1"
                tone="warning"
                variant="tile"
                density="compact"
                frame="inset"
                data-alert-center-fact="acknowledged"
                data-alert-center-fact-owner="hertzbeat-ui-stat-cell"
              />
              <HzStatCell
                label="Resolved"
                value="1"
                tone="success"
                variant="tile"
                density="compact"
                frame="inset"
                data-alert-center-fact="resolved"
                data-alert-center-fact-owner="hertzbeat-ui-stat-cell"
              />
            </HzStatStrip>
            <div
              className="grid gap-2 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-3 text-[12px]"
              data-hz-ui-lab-alert-center-annotation-detail="angular-detail-section"
              data-alert-card-annotations="angular-detail-section"
              data-alert-card-annotations-owner="route-alert-card"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Annotations</div>
              <div
                className="grid gap-1 rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2"
                data-alert-card-annotation="summary"
              >
                <span className="font-semibold text-[#cbd5e1]">summary:</span>
                <span className="whitespace-pre-wrap break-words leading-5 text-[#a9b0bb]">
                  Checkout latency stayed above threshold for two intervals.
                </span>
              </div>
            </div>
            <div
              className="grid gap-2 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-3 text-[12px]"
              data-hz-ui-lab-alert-center-time-detail="angular-first-last-end"
              data-alert-card-time-detail="angular-first-last-end"
              data-alert-card-time-detail-owner="route-alert-card"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Alert time</div>
              <div className="grid gap-1 md:grid-cols-3">
                <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2" data-alert-card-time-row="first">
                  <div className="text-[11px] font-semibold text-[#7e8494]">First time</div>
                  <div className="mt-1 font-mono text-[#dbe4f0]">2026-05-28 17:40:00</div>
                </div>
                <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2" data-alert-card-time-row="last">
                  <div className="text-[11px] font-semibold text-[#7e8494]">Last time</div>
                  <div className="mt-1 font-mono text-[#dbe4f0]">2026-05-28 17:45:00</div>
                </div>
                <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2" data-alert-card-time-row="end">
                  <div className="text-[11px] font-semibold text-[#7e8494]">End time</div>
                  <div className="mt-1 font-mono text-[#dbe4f0]">2026-05-28 17:50:00</div>
                </div>
              </div>
            </div>
            <div
              className="grid gap-2 rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-3 text-[12px]"
              data-hz-ui-lab-alert-center-status-detail="angular-status-section"
              data-alert-card-status-detail="angular-status-section"
              data-alert-card-status-detail-owner="hertzbeat-ui-status-badge"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">Alert status</div>
              <HzStatusBadge
                tone="critical"
                label="Status"
                value="Firing"
                layout="context-pill"
                data-alert-card-status-badge="angular-status-tag"
                data-alert-card-status-value="Firing"
              />
            </div>
          </div>
          <HzInlineFeedback
            tone="info"
            title="Import [alert-defines.json] submitted"
            meta="Preparing threshold import"
            variant="embedded"
            data-hz-ui-lab-alert-setting-import-feedback="shared"
            data-alert-setting-action-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Import Success!"
            meta="Angular alert setting import success keeps the fixed import-success title"
            variant="embedded"
            data-hz-ui-lab-alert-setting-import-success="angular-import-success-notification"
            data-alert-setting-import-success-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-import-feedback-title="common.notify.import-success"
          />
          <HzInlineFeedback
            tone="critical"
            title="Import Failed!"
            description="backend-message"
            meta="Angular alert setting import failure keeps the import-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-import-failure="angular-import-fail-notification"
            data-alert-setting-import-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-import-feedback-title="common.notify.import-fail"
            data-alert-setting-import-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Export Failed!"
            description="backend-message"
            meta="Angular alert setting export failures keep the export-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-export-failure="angular-export-fail-notification"
            data-alert-setting-export-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-export-feedback-title="common.notify.export-fail"
            data-alert-setting-export-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            description="backend-message"
            meta="Angular alert setting delete failure keeps the delete-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-delete-failure="angular-delete-fail-notification"
            data-alert-setting-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-delete-feedback-title="common.notify.delete-fail"
            data-alert-setting-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="warning"
            title="Please select items to delete"
            meta="Angular alert setting batch delete stays clickable and warns when no rows are selected"
            variant="embedded"
            data-hz-ui-lab-alert-setting-no-select-delete="angular-warning"
            data-alert-setting-no-select-delete-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="No monitors selected for export"
            meta="Angular alert setting export uses common.notify.no-select-export before opening the type chooser"
            variant="embedded"
            data-hz-ui-lab-alert-setting-no-select-export="angular-warning"
            data-alert-setting-no-select-export-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular alert setting enable toggle failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-enable-failure="angular-edit-fail-notification"
            data-alert-setting-enable-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-enable-feedback-title="common.notify.edit-fail"
            data-alert-setting-enable-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            description="backend-message"
            meta="Angular alert setting create failure keeps the new-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-save-failure="angular-new-fail-notification"
            data-alert-setting-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-save-feedback-title="common.notify.new-fail"
            data-alert-setting-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular alert setting edit failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-setting-save-failure="angular-edit-fail-notification"
            data-alert-setting-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-setting-save-feedback-title="common.notify.edit-fail"
            data-alert-setting-save-feedback-detail="backend-message"
          />
          <HzFileInput
            aria-label="Import threshold rules file"
            data-hz-ui-lab-alert-setting-import-input="shared"
            data-alert-setting-import-input-owner="hertzbeat-ui-file-input"
          />
          <HzExportTypeDialog
            open={alertSettingExportDialogOpen}
            title="Choose export file format"
            description="Matches the legacy Angular alert threshold JSON / EXCEL chooser before downloading selected rules."
            scope="selected"
            selectedCount={2}
            closeLabel="Close"
            onClose={() => setAlertSettingExportDialogOpen(false)}
            onSelect={type => {
              setContextMessage(`Alert setting export type · ${type}`);
              setAlertSettingExportDialogOpen(false);
            }}
            jsonDescription="Export threshold rules in JSON format."
            excelDescription="Export threshold rules in EXCEL format."
            data-hz-ui-lab-alert-setting-export-type-dialog="shared"
            data-alert-setting-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
            data-alert-setting-export-success-contract="angular-download-closes-dialog-no-toast"
            data-alert-setting-export-success-owner="route-action-feedback-contract"
            data-alert-setting-export-loading-contract="angular-selected-type-only"
            data-alert-setting-export-loading-owner="route-action-feedback-contract"
            jsonButtonProps={
              {
                'data-hz-ui-lab-alert-setting-export-type-option': 'json',
                'data-alert-setting-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                'data-alert-setting-export-loading': 'json-selected-only'
              } as React.ComponentProps<typeof HzExportTypeDialog>['jsonButtonProps']
            }
            excelButtonProps={
              {
                'data-hz-ui-lab-alert-setting-export-type-option': 'excel',
                'data-alert-setting-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                'data-alert-setting-export-loading': 'excel-selected-only'
              } as React.ComponentProps<typeof HzExportTypeDialog>['excelButtonProps']
            }
          />
          <div
            data-hz-ui-lab-monitor-export-type-dialog="shared"
            data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
            data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"
            data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"
          >
            <HzExportTypeDialog
              open={monitorExportDialogOpen}
              title="Choose export type"
              description="Matches the legacy Angular JSON / EXCEL chooser before downloading selected monitors."
              scope="selected"
              selectedCount={2}
              closeLabel="Close"
              onClose={() => setMonitorExportDialogOpen(false)}
              onSelect={type => {
                setContextMessage(`Monitor export type · ${type}`);
                setMonitorExportDialogOpen(false);
              }}
              jsonDescription="Export selected monitors as JSON."
              excelDescription="Export selected monitors as EXCEL."
              data-hz-ui-lab-monitor-export-type-dialog="shared"
              data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
              data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"
              data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"
              jsonButtonProps={
                {
                  'data-hz-ui-lab-monitor-export-type-option': 'json',
                  'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog'
                } as React.ComponentProps<typeof HzExportTypeDialog>['jsonButtonProps']
              }
              excelButtonProps={
                {
                  'data-hz-ui-lab-monitor-export-type-option': 'excel',
                  'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog'
                } as React.ComponentProps<typeof HzExportTypeDialog>['excelButtonProps']
              }
            />
          </div>
          <div data-hz-ui-lab-monitor-pagination="shared">
            <HzPaginationBar
              summary="Page 1 / 2 · total 128"
              pageSizeLabel="Page size"
              pageSizeValue="8"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '20', label: '20' },
                { value: '50', label: '50' }
              ]}
              pageJumpLabel="Page"
              pageJumpValue="1"
              pageJumpMax={2}
              pageJumpInputProps={{
                'data-hz-ui-lab-monitor-page-jump': 'shared',
                'data-monitor-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              previousLabel="Previous"
              nextLabel="Next"
              previousDisabled
              onPageJumpChange={value => setContextMessage(`Page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Page size · ${value}`)}
              onNext={() => setContextMessage('Pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <div data-hz-ui-lab-alert-group-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 3 · 9-15 / 21"
              pageSizeLabel="Group page size"
              pageSizeValue="15"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Group page"
              pageJumpValue="2"
              pageJumpMax={3}
              pageJumpInputProps={{
                'data-hz-ui-lab-alert-group-page-jump': 'shared',
                'data-alert-group-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-alert-group-page-size': 'shared',
                'data-alert-group-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPageJumpChange={value => setContextMessage(`Alert group page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Alert group page size · ${value}`)}
              onPrevious={() => setContextMessage('Alert group pagination · previous page')}
              onNext={() => setContextMessage('Alert group pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <div
            data-hz-ui-lab-alert-group-select-current-page="angular-select-all"
            data-alert-group-select-current-page-owner="hertzbeat-ui-checkbox"
          >
            <HzCheckbox
              data-alert-group-select-current-page="table-header"
              data-alert-group-select-current-page-owner="hertzbeat-ui-checkbox"
              checked
              aria-label="Select current alert group page"
              containerClassName="min-h-0"
              label="Select current page"
              onChange={() => setContextMessage('Alert group select current page')}
            />
          </div>
          <HzInlineFeedback
            tone="warning"
            title="Select group rules before deleting"
            meta="Angular no-select warning"
            variant="embedded"
            data-hz-ui-lab-alert-group-no-select-delete="angular-warning"
            data-alert-group-no-select-delete-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Enable toggle feedback"
            variant="embedded"
            data-hz-ui-lab-alert-group-enable-feedback="angular-edit-notify"
            data-alert-group-enable-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular alert group enable failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-group-enable-failure="angular-edit-fail-notification"
            data-alert-group-enable-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-group-enable-feedback-title="common.notify.edit-fail"
            data-alert-group-enable-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Add Success!"
            meta="Create modal save feedback"
            variant="embedded"
            data-hz-ui-lab-alert-group-save-feedback="angular-new-notify"
            data-alert-group-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Edit modal save feedback"
            variant="embedded"
            data-hz-ui-lab-alert-group-save-feedback="angular-edit-notify"
            data-alert-group-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            description="backend-message"
            meta="Angular alert group create failure keeps the new-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-group-save-failure="angular-new-fail-notification"
            data-alert-group-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-group-save-feedback-title="common.notify.new-fail"
            data-alert-group-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular alert group edit failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-group-save-failure="angular-edit-fail-notification"
            data-alert-group-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-group-save-feedback-title="common.notify.edit-fail"
            data-alert-group-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            meta="Edit detail load feedback"
            variant="embedded"
            data-hz-ui-lab-alert-group-edit-load-feedback="angular-edit-fail"
            data-alert-group-edit-load-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="Wait time is required"
            meta="Angular required-field validation"
            variant="embedded"
            data-hz-ui-lab-alert-group-required-validation="angular-required-timers"
            data-alert-group-required-validation-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="Wait time must be 0 or greater"
            meta="Angular nzMin timer validation"
            variant="embedded"
            data-hz-ui-lab-alert-group-non-negative-validation="angular-nzmin-timers"
            data-alert-group-non-negative-validation-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Delete confirm feedback"
            variant="embedded"
            data-hz-ui-lab-alert-group-delete-feedback="angular-delete-notify"
            data-alert-group-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            description="backend-message"
            meta="Angular alert group delete failure keeps the delete-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-group-delete-failure="angular-delete-fail-notification"
            data-alert-group-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-group-delete-feedback-title="common.notify.delete-fail"
            data-alert-group-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Add Success!"
            meta="Label create save feedback"
            variant="embedded"
            data-hz-ui-lab-label-save-feedback="angular-new-notify"
            data-label-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Label edit save feedback"
            variant="embedded"
            data-hz-ui-lab-label-save-feedback="angular-edit-notify"
            data-label-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            meta="Angular label create failure keeps the new-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-label-save-failure="angular-new-fail-notification"
            data-label-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-label-save-feedback-title="common.notify.new-fail"
            data-label-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            meta="Angular label edit failure keeps the edit-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-label-save-failure="angular-edit-fail-notification"
            data-label-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-label-save-feedback-title="common.notify.edit-fail"
            data-label-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label save shows OK loading"
            meta="Label create/edit keeps Angular nzOkLoading while the save request is pending"
            variant="embedded"
            data-hz-ui-lab-label-save-loading="angular-nz-ok-loading"
            data-label-save-ok-loading-owner="angular-nz-ok-loading"
          />
          <HzInlineFeedback
            tone="info"
            title="Label save trims spaces"
            meta="Angular trims name, value, and description before create/edit"
            variant="embedded"
            data-hz-ui-lab-label-save-trim="angular-trim-before-save"
            data-label-save-trim-owner="label-manage-controller"
          />
          <HzInlineFeedback
            tone="info"
            title="Label optional fields"
            meta="Angular preserves untouched optional value and description fields as undefined while still trimming edited fields"
            variant="embedded"
            data-hz-ui-lab-label-optional-save-payload="angular-preserve-undefined-optional-fields"
            data-label-optional-save-payload-owner="label-manage-controller"
          />
          <HzInlineFeedback
            tone="info"
            title="Label type payload"
            meta="Angular new Label() leaves type implicit because the label dialog has no type field"
            variant="embedded"
            data-hz-ui-lab-label-type-save-payload="angular-preserve-implicit-type"
            data-label-type-save-payload-owner="label-manage-controller"
          />
          <HzInlineFeedback
            tone="info"
            title="Label display format"
            meta="Angular only trims value to test emptiness; displayed, copied, and monitor-handoff labels keep the raw tag value"
            variant="embedded"
            data-hz-ui-lab-label-display-format="angular-format-label-name-raw-tag-value"
            data-label-display-format-owner="label-view-model"
          />
          <HzInlineFeedback
            tone="info"
            title="Label description display"
            meta="Angular renders any truthy label description and keeps the raw value for the card text and tooltip"
            variant="embedded"
            data-hz-ui-lab-label-description-display="angular-truthy-description-raw"
            data-label-description-display-owner="label-manage-surface"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label modal mask"
            meta="Angular label modal keeps nzMaskClosable=false"
            variant="embedded"
            data-hz-ui-lab-label-dialog-mask-closable="angular-mask-closable-false"
            data-label-dialog-mask-closable-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="info"
            title="Label modal width"
            meta="Angular label modal keeps nzWidth=30%"
            variant="embedded"
            data-hz-ui-lab-label-dialog-width="angular-width-30-percent"
            data-label-dialog-width-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="info"
            title="Label modal form layout"
            meta="Angular label modal uses nz-form-label span 7 and control span 12 for name, value, description, and display"
            variant="embedded"
            data-hz-ui-lab-label-dialog-field-layout="angular-label-7-control-12"
            data-label-dialog-field-layout-owner="route-form-field-grid"
          />
          <HzInlineFeedback
            tone="info"
            title="Label preview visibility"
            meta="Angular hides the display preview row until the label name field is defined"
            variant="embedded"
            data-hz-ui-lab-label-preview-visibility="angular-name-defined-preview"
            data-label-dialog-preview-visibility-owner="route-form-state"
          />
          <HzInlineFeedback
            tone="info"
            title="Label preview chrome"
            meta="Angular keeps the display preview as an inline nz-tag with no extra preview frame"
            variant="embedded"
            data-hz-ui-lab-label-preview-frame="angular-inline-tag-no-extra-frame"
            data-label-dialog-preview-frame-owner="route-form-field-grid"
            data-label-dialog-preview-chrome-mode="angular-tag-only-no-extra-frame"
            data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label edit reference"
            meta="Angular edits the selected label object directly and cancel only closes the modal"
            variant="embedded"
            data-hz-ui-lab-label-edit-reference="angular-edit-direct-reference"
            data-label-edit-reference-contract="angular-edit-direct-reference"
            data-label-edit-reference-owner="route-form-state"
          />
          <HzInlineFeedback
            tone="success"
            title="Copy Success!"
            meta="Label copy feedback"
            variant="embedded"
            data-hz-ui-lab-label-copy-feedback="angular-copy-notify"
            data-label-copy-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="Copy Failed!"
            meta="Label copy feedback"
            variant="embedded"
            data-hz-ui-lab-label-copy-feedback="angular-copy-fail"
            data-label-copy-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Label delete requires confirmation"
            meta="Label deletes preserve Angular modal.confirm before the delete mutation"
            variant="embedded"
            data-hz-ui-lab-label-delete-confirm="angular-modal-confirm"
            data-label-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label delete confirmation state"
            meta="Closed and open states preserve Angular modal.confirm lifecycle"
            variant="embedded"
            data-hz-ui-lab-label-delete-confirm-state="angular-modal-confirm-state"
            data-label-delete-confirm-state-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="info"
            title="Label delete confirm closes before result"
            meta="Angular nzOnOk starts the delete mutation without holding the confirm dialog open"
            variant="embedded"
            data-hz-ui-lab-label-delete-confirm-close="angular-close-before-delete-result"
            data-label-delete-confirm-close-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Label delete feedback"
            variant="embedded"
            data-hz-ui-lab-label-delete-feedback="angular-delete-notify"
            data-label-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            meta="Angular label delete failure keeps the delete-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-label-delete-failure="angular-delete-fail-notification"
            data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-label-delete-feedback-title="common.notify.delete-fail"
            data-label-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="info"
            title="Label delete query"
            meta="Angular deletes labels through DELETE /label with repeated ids query parameters"
            variant="embedded"
            data-hz-ui-lab-label-delete-query="angular-repeated-ids-query"
            data-label-delete-query-owner="route-mutation-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label load failure keeps shell"
            meta="Angular label list load failures only end table loading and log the backend message"
            variant="embedded"
            data-hz-ui-lab-label-load-failure="angular-console-only-shell"
            data-label-load-failure-owner="label-route-controller"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label cards show load ownership"
            meta="Angular tableLoading covers initial load, refresh/search reloads, and delete reloads"
            variant="embedded"
            data-hz-ui-lab-label-card-loading="angular-table-loading"
            data-label-card-loading-owner="label-route-controller"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label name is required"
            meta="Label save keeps Angular required validation before submit"
            variant="embedded"
            data-hz-ui-lab-label-name-validation="angular-required-before-submit"
            data-label-name-validation-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label name validation appears after OK"
            meta="Angular marks the required field dirty only after OK is clicked"
            variant="embedded"
            data-hz-ui-lab-label-name-validation-trigger="angular-ok-marks-dirty"
            data-label-name-validation-trigger-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Label required check before trim"
            meta="Angular validates the raw required name field before trimming the label name for the save payload"
            variant="embedded"
            data-hz-ui-lab-label-name-validation-raw="angular-required-before-trim"
            data-label-name-validation-raw-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Labels load as one card set"
            meta="Label management preserves Angular pageSize=9999 load-all query"
            variant="embedded"
            data-hz-ui-lab-label-query="angular-load-all-labels"
            data-label-query-owner="label-query-state"
          />
          <HzInlineFeedback
            tone="info"
            title="Label query order"
            meta="Angular appends pageIndex, pageSize, optional type, then optional search"
            variant="embedded"
            data-hz-ui-lab-label-query-param-order="angular-page-index-size-type-search"
            data-label-query-param-order-contract="angular-page-index-size-type-search"
            data-label-query-param-order-owner="label-query-state"
          />
          <HzInlineFeedback
            tone="success"
            title="Label search submits on Enter and clear"
            meta="Label search preserves Angular app-multi-func-input keydown.enter and cleared load behavior"
            variant="embedded"
            data-hz-ui-lab-label-search-submit="angular-enter-and-clear"
            data-label-search-submit-owner="cold-search-row"
          />
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            data-hz-ui-lab-label-card-grid="angular-card-grid"
            data-label-card-grid-owner="hertzbeat-ui-label-tag"
            data-label-card-column-contract="nz-xs-12-sm-8-md-6-lg-4"
          >
            <div
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3"
              data-hz-ui-lab-label-card="angular-card"
              data-label-card-shell="angular-card"
              data-label-card-size="small"
            >
              <Link
                href="/monitors?labels=team%3Aops"
                data-hz-ui-lab-label-monitor-handoff="angular-routerlink-monitors-labels"
                data-label-monitor-handoff-owner="next-monitor-query-link"
              >
                <HzLabelTag
                  colorToken="geekblue"
                  data-hz-ui-lab-label-color="angular-render-label-color"
                  data-label-color-owner="hertzbeat-ui-label-tag"
                >
                  team:ops
                </HzLabelTag>
              </Link>
              <div
                data-label-card-description="angular-description"
                data-label-card-description-display="angular-truthy-description-raw"
                data-label-card-description-display-owner="label-manage-surface"
                className="mt-2 text-[12px] text-[#8f99ab]"
              >
                ops team
              </div>
              <HzActionGroup
                density="compact-icons"
                layout="start"
                data-hz-ui-lab-label-row-actions="angular-card-actions-contextual"
                data-label-row-actions-owner="hertzbeat-ui-action-group"
                data-label-card-actions="angular-card-actions"
              >
                <HzIconButton
                  label="Copy label team:ops"
                  intent="ghost"
                  data-label-row-action="copy"
                  data-label-row-action-owner="row-contextual-icon-button"
                  data-label-row-action-label="team:ops"
                >
                  <CopyIcon size={13} />
                </HzIconButton>
                <HzIconButton
                  label="Edit label team:ops"
                  intent="ghost"
                  data-label-row-action="edit"
                  data-label-row-action-owner="row-contextual-icon-button"
                  data-label-row-action-label="team:ops"
                >
                  <Pencil size={13} />
                </HzIconButton>
                <HzIconButton
                  label="Delete label team:ops"
                  intent="ghost"
                  data-label-row-action="delete"
                  data-label-row-action-owner="row-contextual-icon-button"
                  data-label-row-action-label="team:ops"
                >
                  <Trash2 size={13} />
                </HzIconButton>
              </HzActionGroup>
            </div>
          </div>
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Plugin enable toggle feedback"
            variant="embedded"
            data-hz-ui-lab-plugin-enable-feedback="angular-edit-notify"
            data-plugin-enable-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            meta="Plugin enable failure keeps the edit-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-plugin-enable-failure="angular-edit-fail-notification"
            data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"
            data-plugin-enable-feedback-title="common.notify.edit-fail"
            data-plugin-enable-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin enable optimism"
            meta="Angular flips the row enable status before sending the plugin PUT request"
            variant="embedded"
            data-hz-ui-lab-plugin-enable-optimistic="angular-toggle-mutates-row-before-put"
            data-plugin-enable-optimistic-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Plugin table loading"
            meta="Angular loadPluginsTable owns table loading for search, clear, refresh, pagination, delete, and enable changes"
            variant="embedded"
            data-hz-ui-lab-plugin-table-loading="angular-load-plugins-table"
            data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"
            data-plugin-toggle-loading-owner="angular-nz-table-loading"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin reload clears selection"
            meta="Angular loadPluginsTable clears checkedAll and selected plugin ids after reload"
            variant="embedded"
            data-hz-ui-lab-plugin-selection-reset="angular-load-clears-selection"
            data-plugin-selection-reset-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin table keeps Angular edit column"
            meta="Angular renders five plugin table columns and keeps param editing inside the edit action column"
            variant="embedded"
            data-hz-ui-lab-plugin-table-columns="angular-five-column-edit-actions"
            data-plugin-table-columns-owner="angular-nz-table"
          />
          <HzInlineFeedback
            tone="info"
            title="Plugin param action visibility"
            meta="Angular hides the param edit action only when paramCount is exactly 0"
            variant="embedded"
            data-hz-ui-lab-plugin-param-action-visibility="angular-paramcount-zero-only"
            data-plugin-param-action-visibility-owner="plugin-view-model"
          />
          <div
            data-hz-ui-lab-plugin-search-submit="angular-enter-and-clear"
            data-plugin-search-clear-owner="shared-search-row"
            data-hz-ui-lab-plugin-query-param-order="angular-page-index-size-search"
            data-plugin-query-param-order-contract="angular-page-index-size-search"
            data-plugin-query-param-order-owner="plugin-query-state"
          >
            <SearchRow
              value="smtp"
              placeholder="Search plugin"
              searchLabel="Search"
              clearLabel="Clear"
              onValueChange={() => setContextMessage('Plugin search changed')}
              onSearch={() => setContextMessage('Plugin search submitted')}
              onClear={() => setContextMessage('Plugin search cleared')}
              data-plugin-search-submit-contract="angular-enter-and-clear"
              data-plugin-search-clear-contract="angular-cleared-load"
              data-plugin-search-clear-owner="shared-search-row"
            />
          </div>
          <div
            className="relative z-[9999] inline-block overflow-visible open:z-[9999]"
            data-hz-ui-lab-plugin-toolbar-delete-menu="angular-toolbar-ellipsis-delete"
            data-plugin-toolbar-delete-menu-layer="overlay-visible-above-panel"
            data-plugin-toolbar-delete-menu-clearance="floating-overlay-no-panel-crop"
            data-plugin-toolbar-delete-menu-open={pluginToolbarActionMenuOpen ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-expanded={pluginToolbarActionMenuOpen}
              aria-label="More plugin toolbar actions"
              className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#101217] text-[#dbe4f0] [&::-webkit-details-marker]:hidden"
              onClick={() => setPluginToolbarActionMenuOpen(open => !open)}
              data-plugin-toolbar-delete-menu-trigger="angular-toolbar-ellipsis-delete"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div
              role="menu"
              hidden={!pluginToolbarActionMenuOpen}
              className="mt-2 z-[9999] min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
              data-plugin-toolbar-delete-menu-layer-panel="overlay-visible-above-panel"
              data-plugin-toolbar-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
              data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"
            >
              <HzTableRowActionButton
                width="root-span"
                intent="ghost"
                data-plugin-delete-selected-owner="hertzbeat-ui-table-row-action-button"
                className="w-full text-[#fecaca] hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </HzTableRowActionButton>
            </div>
          </div>
          <HzActionGroup
            density="compact-icons"
            layout="start"
            data-hz-ui-lab-plugin-row-actions="angular-row-actions-contextual"
            data-plugin-row-actions-owner="hertzbeat-ui-action-group"
          >
            <HzIconButton
              label="Edit plugin params smtp"
              intent="ghost"
              data-plugin-row-action="params"
              data-plugin-row-action-owner="row-contextual-icon-button"
              data-plugin-row-action-label="smtp"
            >
              <Pencil size={13} />
            </HzIconButton>
            <div
              className="relative z-[9999] inline-block overflow-visible open:z-[9999]"
              data-hz-ui-lab-plugin-row-delete-menu="angular-ellipsis-dropdown-delete"
              data-plugin-row-delete-menu-layer="overlay-visible-above-panel"
              data-plugin-row-delete-menu-clearance="floating-overlay-no-panel-crop"
              data-plugin-row-delete-menu-open={pluginRowActionMenuOpen ? 'true' : 'false'}
            >
              <button
                type="button"
                aria-expanded={pluginRowActionMenuOpen}
                aria-label="More plugin row actions"
                className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#101217] text-[#dbe4f0] [&::-webkit-details-marker]:hidden"
                onClick={() => setPluginRowActionMenuOpen(open => !open)}
                data-plugin-row-delete-menu-trigger="smtp"
                data-plugin-row-action-label="smtp"
              >
                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div
                role="menu"
                hidden={!pluginRowActionMenuOpen}
                className="mt-2 z-[9999] min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
                data-plugin-row-delete-menu-layer-panel="overlay-visible-above-panel"
                data-plugin-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
                data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                data-plugin-row-delete-menu-panel-open={pluginRowActionMenuOpen ? 'true' : 'false'}
              >
                <HzTableRowActionButton
                  width="root-span"
                  intent="ghost"
                  data-plugin-delete-one-owner="hertzbeat-ui-table-row-action-button"
                  data-plugin-row-action="delete"
                  data-plugin-row-action-label="smtp"
                  className="w-full text-[#fecaca] hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </HzTableRowActionButton>
              </div>
            </div>
          </HzActionGroup>
          <HzInlineFeedback
            tone="warning"
            title="Select monitors before deleting"
            meta="Plugin batch delete no-select warning"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-warning="angular-no-select-warning"
            data-plugin-delete-warning-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Plugin delete requires confirmation"
            meta="Plugin deletes preserve Angular modal.confirm before the delete mutation"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-confirm="angular-modal-confirm"
            data-plugin-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Plugin delete feedback"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-feedback="angular-delete-notify"
            data-plugin-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            meta="Plugin delete failure keeps the delete-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-failure="angular-delete-fail-notification"
            data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-plugin-delete-feedback-title="common.notify.delete-fail"
            data-plugin-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete query keeps repeated ids"
            meta="Angular appends one ids query parameter per selected plugin"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-query="angular-repeated-ids-query"
            data-plugin-delete-query-owner="route-mutation-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Page recovered"
            meta="Plugin delete page index clamp"
            variant="embedded"
            data-hz-ui-lab-plugin-delete-clamp="angular-update-page-index"
            data-plugin-delete-page-clamp-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin table keeps viewport height"
            meta="Empty or short plugin tables keep the pagination anchored near the page bottom"
            variant="embedded"
            data-hz-ui-lab-plugin-table-stable-height="viewport-fill-on-empty-or-short"
            data-plugin-table-stable-height-owner="route-layout-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Plugin load failure keeps shell"
            meta="Angular plugin list failures clear loading and log only, leaving toolbar and table shell mounted"
            variant="embedded"
            data-hz-ui-lab-plugin-load-failure="angular-console-only-shell"
            data-plugin-load-failure-owner="plugin-route-controller"
          />
          <HzInlineFeedback
            tone="warning"
            title="Required fields"
            meta="Plugin upload marks required name and jar file before submit"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-validation="angular-required-before-submit"
            data-plugin-upload-validation-owner="route-validation-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Invalid upload stays open"
            meta="Angular invalid plugin upload marks dirty fields and keeps the modal open without sending FormData"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-invalid-submit="angular-mark-dirty-keep-open"
            data-plugin-upload-invalid-submit-owner="route-validation-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Upload cancel preserves draft"
            meta="Angular upload cancel hides the modal without resetting form state"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-cancel="angular-cancel-preserves-form"
            data-plugin-upload-cancel-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Upload cancel stays available"
            meta="Angular plugin upload keeps Cancel active while nzOkLoading is true"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-cancel-pending="angular-cancel-allowed-during-ok-loading"
            data-plugin-upload-cancel-pending-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="success"
            title="Jar remove clears selection"
            meta="Angular nzRemove clears the selected jar file and jar form value"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-file-remove="angular-nz-remove-clears-jar"
            data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"
          />
          <HzInlineFeedback
            tone="warning"
            title="Upload modal mask is locked"
            meta="Angular plugin upload modal uses nzMaskClosable=false"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-mask-closable="angular-mask-closable-false"
            data-plugin-upload-mask-closable-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="success"
            title="Upload modal keeps Angular width"
            meta="Angular plugin upload modal uses nzWidth=30%"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-width="angular-width-30-percent"
            data-plugin-upload-width-owner="angular-nz-modal"
          />
          <div
            className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3 text-[12px] font-semibold text-[#a9b0bb]"
            data-hz-ui-lab-plugin-upload-field-layout="angular-label-8-control-14"
            data-plugin-upload-field-layout-contract="angular-label-8-control-14"
            data-plugin-upload-field-layout-owner="route-form-field-grid"
          >
            <label
              className="grid gap-2 sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)] sm:items-center"
              data-plugin-upload-field="name"
              data-plugin-upload-field-layout="angular-label-8-control-14"
            >
              <span className="text-right max-sm:text-left" data-plugin-upload-label-span="8">Plugin name</span>
              <span className="min-w-0" data-plugin-upload-control-span="14">
                <HzInput value="smtp" readOnly data-plugin-upload-name-input="angular-required" />
              </span>
            </label>
            <label
              className="grid gap-2 sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)] sm:items-center"
              data-plugin-upload-field="jarFile"
              data-plugin-upload-field-layout="angular-label-8-control-14"
            >
              <span className="text-right max-sm:text-left" data-plugin-upload-label-span="8">Jar file</span>
              <span className="min-w-0" data-plugin-upload-control-span="14">
                <HzFileInput
                  accept=".jar"
                  aria-label="Plugin jar file"
                  data-hz-ui-lab-plugin-upload-file-list="angular-before-upload-single-replace"
                  data-plugin-upload-file-input="angular-jar-before-upload"
                  data-plugin-upload-file-input-owner="hertzbeat-ui-file-input"
                  data-plugin-upload-file-list-contract="angular-before-upload-single-replace"
                  data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"
                />
                <HzInput value="smtp.jar" readOnly data-plugin-upload-file-name="angular-jar-before-upload" />
                <HzIconButton
                  label="Remove selected jar"
                  intent="ghost"
                  data-hz-ui-lab-plugin-upload-file-remove="angular-nz-remove-clears-jar"
                  data-plugin-upload-file-remove="angular-nz-remove-clears-jar"
                  data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"
                  data-plugin-upload-file-remove-state="selected"
                >
                  <X size={13} />
                </HzIconButton>
              </span>
            </label>
          </div>
          <div
            className="inline-flex min-h-8 items-center"
            data-hz-ui-lab-plugin-upload-status-control="angular-nz-switch"
            data-plugin-upload-status-control-owner="hertzbeat-ui-switch"
          >
            <HzSwitch
              checked
              label="Plugin status"
              data-plugin-upload-status-control="angular-nz-switch"
              data-plugin-upload-status-control-owner="hertzbeat-ui-switch"
            />
          </div>
          <HzInlineFeedback
            tone="success"
            title="FormData payload"
            meta="Plugin upload sends Angular multipart fields"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-payload="angular-form-data"
            data-plugin-upload-payload-owner="route-mutation-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Upload name payload"
            meta="Angular appends the plugin name to FormData without trimming first"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-name-payload="angular-raw-name-no-trim"
            data-plugin-upload-name-payload-owner="plugin-manage-controller"
          />
          <HzInlineFeedback
            tone="success"
            title="Upload save lifecycle"
            meta="Angular closes and resets the upload modal after success, and keeps the modal open on failure"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-save-lifecycle="angular-close-success-keep-open-fail"
            data-plugin-upload-save-lifecycle-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Upload success reset"
            meta="Angular resetForm clears name and jar file, restores enableStatus=true, closes the modal, and reloads the table"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-success-reset="angular-reset-form-after-success"
            data-plugin-upload-success-reset-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Upload OK button shows request loading"
            meta="Angular nzOkLoading remains visible while plugin upload is pending"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-loading="angular-nz-ok-loading"
            data-plugin-upload-ok-loading-owner="angular-nz-ok-loading"
          />
          <HzInlineFeedback
            tone="success"
            title="Add Success!"
            meta="Plugin upload save feedback"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-feedback="angular-new-notify"
            data-plugin-upload-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            meta="Backend validation detail"
            variant="embedded"
            data-hz-ui-lab-plugin-upload-failure="angular-new-fail-notification"
            data-plugin-upload-feedback-title="common.notify.new-fail"
            data-plugin-upload-feedback-detail="backend-message"
            data-plugin-upload-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin params loaded"
            meta="Plugin param edit opens Angular params define modal from /plugin/params/define"
            variant="embedded"
            data-hz-ui-lab-plugin-param-load="angular-params-define-modal"
            data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"
          />
          <HzInlineFeedback
            tone="info"
            title="Plugin params can be empty"
            meta="Angular still opens the params modal when /plugin/params/define succeeds with no paramDefines"
            variant="embedded"
            data-hz-ui-lab-plugin-param-empty="angular-empty-params-modal"
            data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin params modal keeps default width"
            meta="Angular parameter modal does not override nzWidth, so it stays at the default modal width"
            variant="embedded"
            data-hz-ui-lab-plugin-param-width="angular-default-modal-width"
            data-plugin-param-width-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin param fields keep Angular spans"
            meta="Angular parameter modal uses nz-form-label span 7 and control span 8 for dense scan lines"
            variant="embedded"
            data-hz-ui-lab-plugin-param-field-layout="angular-label-7-control-8"
            data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin params advanced fields"
            meta="Angular renders key-value, labels, label-selector, metrics-field, and array params through configurable-field or multi-func-input controls"
            variant="embedded"
            data-hz-ui-lab-plugin-param-advanced-fields="angular-configurable-and-multi-func"
            data-plugin-param-advanced-fields-owner="hertzbeat-ui-advanced-param-controls"
          />
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-radio="angular-nz-radio-group"
            data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params radio group</HzDataMetaText>
            <HzRadioButtonGroup
              name="plugin-param-radio-lab"
              value="basic"
              options={[
                { value: 'basic', label: 'Basic' },
                { value: 'bearer', label: 'Bearer' }
              ]}
              data-plugin-param-radio="angular-nz-radio-group"
              data-plugin-param-radio-field="authType"
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-textarea="angular-textarea-rows-8"
            data-plugin-param-textarea-owner="hertzbeat-ui-textarea"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params textarea keeps Angular rows</HzDataMetaText>
            <HzTextarea
              value={'line one\nline two'}
              rows={8}
              height="tall"
              readOnly
              data-plugin-param-textarea="angular-textarea-rows-8"
              data-plugin-param-textarea-rows="8"
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-key-value="angular-app-configurable-field"
            data-plugin-param-configurable-field="angular-app-configurable-field"
            data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params key-value uses configurable rows</HzDataMetaText>
            <HzKeyValueEditor
              rows={[
                { key: 'Authorization', value: 'Bearer token' }
              ]}
              onChange={() => setContextMessage('Plugin param key-value edited')}
              addLabel="Add"
              removeLabel="Remove"
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
              data-plugin-param-key-value-editor="headers"
              data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"
              keyInputProps={{ 'data-plugin-param-key-value-input': 'key' }}
              valueInputProps={{ 'data-plugin-param-key-value-input': 'value' }}
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-labels="angular-app-configurable-field"
            data-plugin-param-configurable-field="angular-app-configurable-field"
            data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params labels keep object rows</HzDataMetaText>
            <HzKeyValueEditor
              rows={[
                { key: 'env', value: 'prod' }
              ]}
              onChange={() => setContextMessage('Plugin param labels edited')}
              addLabel="Add"
              removeLabel="Remove"
              keyPlaceholder="Label key"
              valuePlaceholder="Label value"
              data-plugin-param-labels-editor="labels"
              data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"
              keyInputProps={{ 'data-plugin-param-labels-input': 'key' }}
              valueInputProps={{ 'data-plugin-param-labels-input': 'value' }}
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-label-selector="angular-app-label-selector"
            data-hz-ui-lab-plugin-param-pending-editable="angular-controls-remain-enabled"
            data-plugin-param-label-selector="angular-app-label-selector"
            data-plugin-param-label-selector-owner="cold-label-selector"
            data-plugin-param-pending-editable="angular-controls-remain-enabled"
            data-plugin-param-pending-editable-owner="angular-param-modal"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params label-selector keeps searchable label rows</HzDataMetaText>
            <LabelRecordInput
              value="service:checkout, severity:critical"
              onValueChange={() => setContextMessage('Plugin param label-selector edited')}
              name="selector"
              keyPlaceholder="Label key"
              valuePlaceholder="Label value"
              addLabel="Add"
              removeLabel="Remove"
              containerClassName="min-w-0"
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-metrics-field="angular-app-configurable-field"
            data-plugin-param-configurable-field="angular-app-configurable-field"
            data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params metrics-field keeps three required columns</HzDataMetaText>
            <HzConfigurableFieldEditor
              rows={[
                { field: 'usage', unit: '%', type: 'number' }
              ]}
              columns={[
                {
                  key: 'field',
                  placeholder: 'Field',
                  inputProps: { 'data-plugin-param-metrics-field-input': 'field' }
                },
                {
                  key: 'unit',
                  placeholder: 'Unit',
                  className: 'minmax(50px,90px)',
                  inputProps: { 'data-plugin-param-metrics-field-input': 'unit' }
                },
                {
                  key: 'type',
                  placeholder: 'Type',
                  inputProps: { 'data-plugin-param-metrics-field-input': 'type' }
                }
              ]}
              onChange={() => setContextMessage('Plugin param metrics-field edited')}
              addLabel="Add"
              removeLabel="Remove"
              data-plugin-param-metrics-field-editor="metrics"
              data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
            />
          </div>
          <div
            className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] p-3"
            data-hz-ui-lab-plugin-param-multi-func-input="angular-app-multi-func-input"
            data-plugin-param-multi-func-input="angular-app-multi-func-input"
            data-plugin-param-multi-func-type="array"
            data-plugin-param-array-owner="hertzbeat-ui-input"
          >
            <HzDataMetaText display="block" casing="plain">Plugin params array uses shared input and clear</HzDataMetaText>
            <div className="relative">
              <HzInput
                value="alpha,beta"
                readOnly
                className="pr-8"
                data-plugin-param-input="recipients"
                data-plugin-param-input-owner="hertzbeat-ui-input"
                data-plugin-param-array="angular-app-multi-func-input"
                data-plugin-param-array-owner="hertzbeat-ui-input"
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[3px] text-[#858d9a] transition-colors hover:bg-[#202632] hover:text-[#eef2f7]"
                aria-label="Clear"
                onClick={() => setContextMessage('Plugin param array cleared')}
                data-plugin-param-multi-func-clear="angular-allow-clear"
                data-plugin-param-multi-func-clear-field="recipients"
                data-plugin-param-multi-func-clear-owner="hertzbeat-ui-input-affordance"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <HzInlineFeedback
            tone="warning"
            title="Plugin params modal mask is locked"
            meta="Angular plugin params modal uses nzMaskClosable=false"
            variant="embedded"
            data-hz-ui-lab-plugin-param-mask-closable="angular-mask-closable-false"
            data-plugin-param-mask-closable-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Plugin params save posts Angular /plugin/params payload"
            variant="embedded"
            data-hz-ui-lab-plugin-param-save="angular-params-post"
            data-hz-ui-lab-plugin-param-payload="angular-object-values-payload"
            data-plugin-param-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            meta="Angular plugin params failure keeps the edit-fail title and shows the backend message as detail"
            variant="embedded"
            data-hz-ui-lab-plugin-param-failure="angular-edit-fail-notification"
            data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"
            data-plugin-param-feedback-title="common.notify.edit-fail"
            data-plugin-param-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Plugin params close after success"
            meta="Angular closes the params modal only after savePluginParamDefine succeeds and leaves it open on failure"
            variant="embedded"
            data-hz-ui-lab-plugin-param-save-lifecycle="angular-close-success-keep-open-fail"
            data-plugin-param-save-lifecycle-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Plugin params save has no OK loading"
            meta="Angular parameter modal keeps OK/Cancel available while savePluginParamDefine is pending"
            variant="embedded"
            data-hz-ui-lab-plugin-param-save-loading="angular-no-ok-loading"
            data-plugin-param-save-loading-owner="angular-modal-ok-contract"
          />
          <div data-hz-ui-lab-plugin-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 5 · 9-16 / 34"
              pageSizeLabel="Plugin page size"
              pageSizeValue="8"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Plugin page"
              pageJumpValue="2"
              pageJumpMax={5}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPrevious={() => setContextMessage('Plugin pagination · previous page')}
              onNext={() => setContextMessage('Plugin pagination · next page')}
              onPageSizeChange={value => setContextMessage(`Plugin page size · ${value}`)}
              onPageJumpChange={value => setContextMessage(`Plugin page jump · ${value}`)}
              pageJumpInputProps={{
                'data-hz-ui-lab-plugin-page-jump': 'shared',
                'data-plugin-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-plugin-page-size': 'shared',
                'data-plugin-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
            />
          </div>
          <div
            data-hz-ui-lab-collector-search-submit="angular-enter-and-clear"
            data-collector-search-clear-owner="shared-search-row"
          >
            <SearchRow
              value="edge"
              placeholder="Search collector"
              searchLabel="Search"
              clearLabel="Clear"
              onValueChange={() => setContextMessage('Collector search changed')}
              onSearch={() => setContextMessage('Collector search submitted')}
              onClear={() => setContextMessage('Collector search cleared')}
              data-collector-search-submit-contract="angular-enter-and-clear"
              data-collector-search-clear-contract="angular-cleared-load"
              data-collector-search-clear-owner="shared-search-row"
            />
          </div>
          <HzInlineFeedback
            tone="warning"
            title="Select collectors before deleting"
            meta="Collector batch delete no-select warning"
            variant="embedded"
            data-hz-ui-lab-collector-delete-warning="angular-no-select-warning"
            data-collector-delete-warning-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Collector delete requires confirmation"
            meta="Collector deletes preserve Angular modal.confirm before the delete mutation"
            variant="embedded"
            data-hz-ui-lab-collector-delete-confirm="angular-modal-confirm"
            data-collector-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Collector delete feedback and repeated collectors query"
            variant="embedded"
            data-hz-ui-lab-collector-delete-feedback="angular-delete-notify"
            data-collector-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            meta="Collector delete failure keeps the delete-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-collector-delete-failure="angular-delete-fail-notification"
            data-collector-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-collector-delete-feedback-title="common.notify.delete-fail"
            data-collector-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete clamps the current collector page"
            meta="Angular updatePageIndex keeps delete reloads away from an empty trailing page"
            variant="embedded"
            data-hz-ui-lab-collector-delete-clamp="angular-update-page-index"
            data-collector-delete-page-clamp-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Collector reload clears selected rows"
            meta="Angular loadCollectorsTable clears checkedAll and checkedCollectors after refresh, pagination, search, and successful mutations"
            variant="embedded"
            data-hz-ui-lab-collector-selection-reset="angular-load-clears-selection"
            data-collector-selection-reset-owner="route-state-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Select collectors before online/offline"
            meta="Collector online/offline no-select warnings"
            variant="embedded"
            data-hz-ui-lab-collector-operate-warning="angular-no-select-online-offline"
            data-collector-operate-warning-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="Header select-all keeps Angular batch payload behavior"
            meta="Angular keeps main-default-collector visually disabled, but its header select-all still includes the row name in the batch Set"
            variant="embedded"
            data-hz-ui-lab-collector-select-all-contract="angular-header-includes-disabled-default"
            data-collector-select-all-owner="hertzbeat-ui-inline-feedback"
          />
          <div
            className="relative z-[9999] inline-block overflow-visible"
            data-hz-ui-lab-collector-row-delete-menu="angular-ellipsis-dropdown-delete"
            data-collector-row-delete-menu-layer="overlay-visible-above-panel"
            data-collector-row-delete-menu-clearance="floating-overlay-no-panel-crop"
            data-collector-row-delete-menu-open={collectorRowActionMenuOpen ? 'true' : 'false'}
          >
            <button
              type="button"
              aria-expanded={collectorRowActionMenuOpen}
              aria-label="More row actions"
              className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#101217] text-[#dbe4f0] [&::-webkit-details-marker]:hidden"
              onClick={() => setCollectorRowActionMenuOpen(open => !open)}
              data-collector-row-delete-menu-trigger="edge-a"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div
              role="menu"
              hidden={!collectorRowActionMenuOpen}
              className="absolute right-0 top-9 z-[100] min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1"
              data-collector-row-delete-menu-layer-panel="overlay-visible-above-panel"
              data-collector-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
              data-collector-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
              data-collector-row-delete-menu-panel-open={collectorRowActionMenuOpen ? 'true' : 'false'}
            >
              <HzTableRowActionButton
                width="root-span"
                data-collector-delete-one-owner="hertzbeat-ui-table-row-action-button"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Delete
              </HzTableRowActionButton>
            </div>
          </div>
          <HzInlineFeedback
            tone="critical"
            title="Collector online/offline requires confirmation"
            meta="Collector online/offline preserves Angular modal.confirm before the PUT mutation"
            variant="embedded"
            data-hz-ui-lab-collector-operate-confirm="angular-modal-confirm"
            data-collector-operate-confirm-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="success"
            title="Operate Success!"
            meta="Collector online/offline feedback and repeated collectors query"
            variant="embedded"
            data-hz-ui-lab-collector-operate-feedback="angular-operate-notify"
            data-collector-operate-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Operate Failed!"
            meta="Collector online/offline failure keeps the operate-fail title and shows backend message detail"
            variant="embedded"
            data-hz-ui-lab-collector-operate-failure="angular-operate-fail-notification"
            data-collector-operate-failure-owner="hertzbeat-ui-inline-feedback"
            data-collector-operate-feedback-title="common.notify.operate-fail"
            data-collector-operate-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="warning"
            title="Collector table shows loading during mutations"
            meta="Delete, online, and offline operations mirror Angular nz-table loading while the request is pending"
            variant="embedded"
            data-hz-ui-lab-collector-mutation-loading="angular-nz-table-loading"
            data-collector-table-loading-owner="angular-nz-table-loading"
          />
          <HzInlineFeedback
            tone="warning"
            title="Collector table reload owns loading"
            meta="Search, clear, refresh, pagination, and mutations share the Angular loadCollectorsTable nz-table loading contract"
            variant="embedded"
            data-hz-ui-lab-collector-table-loading="angular-load-collectors-table"
            data-collector-table-loading-owner="angular-nz-table-loading"
            data-collector-table-loading-scope="load-search-refresh-pagination-mutation"
          />
          <HzInlineFeedback
            tone="warning"
            title="Collector list load failure keeps shell"
            meta="Angular logs collector list load failures and leaves toolbar, table, pagination, deploy, search, and batch actions mounted"
            variant="embedded"
            data-hz-ui-lab-collector-load-failure="angular-console-only-shell"
            data-collector-load-failure-owner="collector-route-controller"
          />
          <HzInlineFeedback
            tone="success"
            title="Copy Success!"
            meta="Collector identity copy success mirrors Angular message duration 800ms"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-copy-feedback="angular-copy-success-duration-800"
            data-collector-deploy-copy-feedback-owner="hertzbeat-ui-inline-feedback"
            data-collector-deploy-copy-feedback-duration-ms="800"
          />
          <HzInlineFeedback
            tone="success"
            title="Collector identity generated"
            meta="Collector deploy modal calls Angular generate identity endpoint"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-identity="angular-generate-identity"
            data-collector-deploy-identity-owner="route-mutation-contract"
          />
          <HzInlineFeedback
            tone="critical"
            title="Apply Failed"
            meta="Deploy generate failure keeps Angular notification title plus backend message detail"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-failure="angular-apply-fail-notification"
            data-collector-deploy-feedback-owner="hertzbeat-ui-inline-feedback"
            data-collector-deploy-feedback-title="common.notify.apply-fail"
            data-collector-deploy-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="warning"
            title="Generate validates required collector name on submit"
            meta="Angular keeps the OK button clickable, then marks the required name field dirty when it is empty"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-validation="angular-submit-marks-required"
            data-collector-deploy-validation-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Deploy required check before trim"
            meta="Angular validates the raw required field before trimming the collector name for the generate request"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-validation-raw="angular-required-before-trim"
            data-collector-deploy-validation-raw-owner="collector-route-controller"
          />
          <HzInlineFeedback
            tone="warning"
            title="Deploy OK button shows request loading"
            meta="Angular nzOkLoading and button nzLoading stay visible while generate identity is pending"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-loading="angular-nz-ok-loading"
            data-collector-deploy-ok-loading-owner="angular-nz-ok-loading"
          />
          <HzInlineFeedback
            tone="warning"
            title="Collector deploy modal mask is locked"
            meta="Angular collector deploy modal keeps nzMaskClosable=false"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-mask-closable="angular-mask-closable-false"
            data-collector-deploy-mask-closable-owner="angular-nz-modal"
          />
          <HzInlineFeedback
            tone="warning"
            title="Collector deploy close clears name"
            meta="Angular deploy cancel/result close hides the modal and resets the collector name field"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-close-reset="angular-close-clears-name"
            data-collector-deploy-close-reset-owner="collector-route-controller"
          />
          <HzInlineFeedback
            tone="neutral"
            title="Closed deploy ignores late identity"
            meta="Angular close clears the collector field before any delayed generate result can restore the visible name"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-close-pending-result="angular-close-ignores-late-generate"
            data-collector-deploy-close-pending-result-owner="collector-route-controller"
          />
          <HzInlineFeedback
            tone="info"
            title="Collector deploy modal width"
            meta="Angular collector deploy modal uses nzWidth=45%"
            variant="embedded"
            data-hz-ui-lab-collector-deploy-width="angular-width-45-percent"
            data-collector-deploy-width-owner="angular-nz-modal"
          />
          <div
            className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3 text-[12px] font-semibold text-[#a9b0bb]"
            data-hz-ui-lab-collector-deploy-field-layout="angular-label-7-control-12"
            data-hz-ui-lab-collector-deploy-name-lock="angular-disable-after-identity"
            data-collector-deploy-field-layout-contract="angular-label-7-control-12"
            data-collector-deploy-field-layout-owner="route-form-field-grid"
            data-collector-deploy-name-lock-owner="angular-ngmodel-input"
          >
            <label
              className="grid gap-2 md:grid-cols-[7fr_12fr] md:items-center"
              data-collector-deploy-field="name"
              data-collector-deploy-field-layout="angular-label-7-control-12"
            >
              <span className="md:text-right" data-collector-deploy-label-span="7">Collector name</span>
              <span className="min-w-0" data-collector-deploy-control-span="12">
                <HzInput
                  value="edge-a"
                  disabled
                  data-collector-deploy-name-input="angular-required-name"
                  data-collector-deploy-name-lock="angular-disable-after-identity"
                  data-collector-deploy-name-disabled="true"
                />
              </span>
            </label>
          </div>
          <HzButton
            size="md"
            intent="danger"
            data-hz-ui-lab-collector-deploy-result-close="angular-danger-close-after-identity"
            data-collector-deploy-result-close-owner="hertzbeat-ui-button"
            data-collector-deploy-result-close-reset="angular-close-clears-name"
            data-collector-deploy-result-close-reset-owner="collector-route-controller"
          >
            Close generated identity
          </HzButton>
          <HzCodeEditor
            readOnly
            language="shell"
            value={'$ docker run -d \\\n    -e IDENTITY=collector-token \\\n    -e MANAGER_HOST=127.0.0.1 \\\n    -e MODE=public \\\n    --name hertzbeat-collector apache/hertzbeat-collector'}
            title="Deploy via Docker"
            meta="shell"
            minHeight="120px"
            data-hz-ui-lab-collector-deploy-docker-shell="angular-docker-shell"
            data-collector-deploy-code-owner="hertzbeat-ui-code-editor"
          />
          <HzCodeEditor
            readOnly
            language="yaml"
            value={'collector:\n  dispatch:\n    entrance:\n      netty:\n        enabled: true\n        mode: public\n        identity: collector-token\n        manager-host: 127.0.0.1\n        manager-port: 1158'}
            title="Deploy via installation package"
            meta={
              <a
                href="https://github.com/apache/hertzbeat/releases"
                target="_blank"
                rel="noreferrer"
                data-hz-ui-lab-collector-deploy-package-link="angular-github-releases-link"
                data-collector-deploy-package-link-owner="angular-nz-modal"
              >
                Releases
              </a>
            }
            minHeight="140px"
            data-hz-ui-lab-collector-deploy-package-shell="angular-package-shell"
            data-collector-deploy-code-owner="hertzbeat-ui-code-editor"
          />
          <div data-hz-ui-lab-collector-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 5 · 9-16 / 34"
              pageSizeLabel="Collector page size"
              pageSizeValue="8"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Collector page"
              pageJumpValue="2"
              pageJumpMax={5}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPrevious={() => setContextMessage('Collector pagination · previous page')}
              onNext={() => setContextMessage('Collector pagination · next page')}
              onPageSizeChange={value => setContextMessage(`Collector page size · ${value}`)}
              onPageJumpChange={value => setContextMessage(`Collector page jump · ${value}`)}
              pageJumpInputProps={{
                'data-hz-ui-lab-collector-page-jump': 'shared',
                'data-collector-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-collector-page-size': 'shared',
                'data-collector-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
            />
          </div>
          <div data-hz-ui-lab-alert-center-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 4 · 9-16 / 31"
              pageSizeLabel="Center page size"
              pageSizeValue="8"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Center page"
              pageJumpValue="2"
              pageJumpMax={4}
              pageJumpInputProps={{
                'data-hz-ui-lab-alert-center-page-jump': 'shared',
                'data-alert-center-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-alert-center-page-size': 'shared',
                'data-alert-center-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPageJumpChange={value => setContextMessage(`Alert center page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Alert center page size · ${value}`)}
              onPrevious={() => setContextMessage('Alert center pagination · previous page')}
              onNext={() => setContextMessage('Alert center pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <div data-hz-ui-lab-alert-inhibit-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 4 · 16-30 / 48"
              pageSizeLabel="Inhibit page size"
              pageSizeValue="15"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Inhibit page"
              pageJumpValue="2"
              pageJumpMax={4}
              pageJumpInputProps={{
                'data-hz-ui-lab-alert-inhibit-page-jump': 'shared',
                'data-alert-inhibit-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-alert-inhibit-page-size': 'shared',
                'data-alert-inhibit-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPageJumpChange={value => setContextMessage(`Alert inhibit page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Alert inhibit page size · ${value}`)}
              onPrevious={() => setContextMessage('Alert inhibit pagination · previous page')}
              onNext={() => setContextMessage('Alert inhibit pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <HzInlineFeedback
            tone="warning"
            title="Select inhibit rules before deleting"
            meta="Angular no-select warning"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-no-select-delete="angular-warning"
            data-alert-inhibit-no-select-delete-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Inhibit delete confirm feedback"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-delete-feedback="angular-delete-notify"
            data-alert-inhibit-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            description="backend-message"
            meta="Angular inhibit delete failure keeps the delete-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-delete-failure="angular-delete-fail-notification"
            data-alert-inhibit-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-inhibit-delete-feedback-title="common.notify.delete-fail"
            data-alert-inhibit-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Inhibit enable toggle feedback"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-enable-feedback="angular-edit-notify"
            data-alert-inhibit-enable-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular inhibit enable failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-enable-failure="angular-edit-fail-notification"
            data-alert-inhibit-enable-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-inhibit-enable-feedback-title="common.notify.edit-fail"
            data-alert-inhibit-enable-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            description="backend-message"
            meta="Angular inhibit create failure keeps the new-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-save-failure="angular-new-fail-notification"
            data-alert-inhibit-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-inhibit-save-feedback-title="common.notify.new-fail"
            data-alert-inhibit-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular inhibit edit failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-save-failure="angular-edit-fail-notification"
            data-alert-inhibit-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-inhibit-save-feedback-title="common.notify.edit-fail"
            data-alert-inhibit-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="info"
            title="Matched noise-control inhibit rules"
            meta="Entity inhibit management can switch between matched rules and all rules"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-match-mode="angular-entity-noise-controls"
            data-alert-inhibit-match-mode-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Rule created outside matched view"
            meta="Switch to all rules to review or edit the newly created inhibit"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-created-outside-matched="angular-authoring-notice"
            data-alert-inhibit-created-outside-matched-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Inhibit prefilled from entity alerts"
            meta="Shared labels from firing entity alerts fill source, target, and equal labels"
            variant="embedded"
            data-hz-ui-lab-alert-inhibit-entity-prefill="angular-alert-common-labels"
            data-alert-inhibit-entity-prefill-owner="hertzbeat-ui-inline-feedback"
          />
          <div data-hz-ui-lab-alert-silence-pagination="shared">
            <HzPaginationBar
              summary="Page 3 / 5 · 31-45 / 64"
              pageSizeLabel="Silence page size"
              pageSizeValue="15"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Silence page"
              pageJumpValue="3"
              pageJumpMax={5}
              pageJumpInputProps={{
                'data-hz-ui-lab-alert-silence-page-jump': 'shared',
                'data-alert-silence-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-alert-silence-page-size': 'shared',
                'data-alert-silence-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPageJumpChange={value => setContextMessage(`Alert silence page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Alert silence page size · ${value}`)}
              onPrevious={() => setContextMessage('Alert silence pagination · previous page')}
              onNext={() => setContextMessage('Alert silence pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <HzInlineFeedback
            tone="warning"
            title="Select silence rules before deleting"
            meta="Angular no-select warning"
            variant="embedded"
            data-hz-ui-lab-alert-silence-no-select-delete="angular-warning"
            data-alert-silence-no-select-delete-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="success"
            title="Delete Success!"
            meta="Silence delete confirm feedback"
            variant="embedded"
            data-hz-ui-lab-alert-silence-delete-feedback="angular-delete-notify"
            data-alert-silence-delete-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Delete Failed!"
            description="backend-message"
            meta="Angular silence delete failure keeps the delete-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-silence-delete-failure="angular-delete-fail-notification"
            data-alert-silence-delete-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-silence-delete-feedback-title="common.notify.delete-fail"
            data-alert-silence-delete-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Silence enable toggle feedback"
            variant="embedded"
            data-hz-ui-lab-alert-silence-enable-feedback="angular-edit-notify"
            data-alert-silence-enable-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular silence enable failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-silence-enable-failure="angular-edit-fail-notification"
            data-alert-silence-enable-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-silence-enable-feedback-title="common.notify.edit-fail"
            data-alert-silence-enable-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Add Success!"
            meta="Silence create modal save feedback"
            variant="embedded"
            data-hz-ui-lab-alert-silence-save-feedback="angular-new-notify"
            data-alert-silence-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Add Failed!"
            description="backend-message"
            meta="Angular silence create failure keeps the new-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-silence-save-failure="angular-new-fail-notification"
            data-alert-silence-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-silence-save-feedback-title="common.notify.new-fail"
            data-alert-silence-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="success"
            title="Edit Success!"
            meta="Silence edit modal save feedback"
            variant="embedded"
            data-hz-ui-lab-alert-silence-save-feedback="angular-edit-notify"
            data-alert-silence-save-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            description="backend-message"
            meta="Angular silence edit failure keeps the edit-fail title and backend detail"
            variant="embedded"
            data-hz-ui-lab-alert-silence-save-failure="angular-edit-fail-notification"
            data-alert-silence-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-silence-save-feedback-title="common.notify.edit-fail"
            data-alert-silence-save-feedback-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Edit Failed!"
            meta="Silence edit detail load feedback"
            variant="embedded"
            data-hz-ui-lab-alert-silence-edit-load-feedback="angular-edit-fail"
            data-alert-silence-edit-load-feedback-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="warning"
            title="Name and labels are required"
            meta="Angular silence required validation only"
            variant="embedded"
            data-hz-ui-lab-alert-silence-required-validation="angular-name-labels-only"
            data-alert-silence-required-validation-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Matched noise-control rules"
            meta="Entity silence management can switch between matched rules and all rules"
            variant="embedded"
            data-hz-ui-lab-alert-silence-match-mode="angular-entity-noise-controls"
            data-alert-silence-match-mode-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Rule created outside matched view"
            meta="Switch to all rules to review or edit the newly created silence"
            variant="embedded"
            data-hz-ui-lab-alert-silence-created-outside-matched="angular-authoring-notice"
            data-alert-silence-created-outside-matched-owner="hertzbeat-ui-inline-feedback"
          />
          <HzInlineFeedback
            tone="info"
            title="Silence prefilled from entity alerts"
            meta="Shared labels from firing entity alerts become the default silence condition"
            variant="embedded"
            data-hz-ui-lab-alert-silence-entity-prefill="angular-alert-common-labels"
            data-alert-silence-entity-prefill-owner="hertzbeat-ui-inline-feedback"
          />
          <div data-hz-ui-lab-alert-notice-pagination="shared">
            <HzPaginationBar
              summary="Page 2 / 4 · 16-30 / 52"
              pageSizeLabel="Notice page size"
              pageSizeValue="15"
              pageSizeOptions={[
                { value: '8', label: '8' },
                { value: '15', label: '15' },
                { value: '25', label: '25' }
              ]}
              pageJumpLabel="Notice page"
              pageJumpValue="2"
              pageJumpMax={4}
              pageJumpInputProps={{
                'data-hz-ui-lab-alert-notice-page-jump': 'shared',
                'data-alert-notice-pagination-page-jump-owner': 'hertzbeat-ui-input'
              } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']}
              pageSizeSelectProps={{
                'data-hz-ui-lab-alert-notice-page-size': 'shared',
                'data-alert-notice-pagination-page-size-owner': 'hertzbeat-ui-select'
              } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']}
              previousLabel="Previous page"
              nextLabel="Next page"
              onPageJumpChange={value => setContextMessage(`Alert notice page jump · ${value}`)}
              onPageSizeChange={value => setContextMessage(`Alert notice page size · ${value}`)}
              onPrevious={() => setContextMessage('Alert notice pagination · previous page')}
              onNext={() => setContextMessage('Alert notice pagination · next page')}
              className="border-x-0 border-t-0"
            />
          </div>
          <div
            className="grid min-h-10 grid-cols-[132px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-alert-notice-token-normalizer="angular-on-change"
            data-alert-notice-receiver-token-normalizer-owner="route-form-field"
          >
            <HzDataMetaText variant="type">Notice token</HzDataMetaText>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <HzDataMetaText display="block" casing="plain">WeCom key= {'->'} token</HzDataMetaText>
              <HzDataMetaText display="block" casing="plain">Ding access_token= {'->'} token</HzDataMetaText>
              <HzDataMetaText display="block" casing="plain">Lark hook/ {'->'} token</HzDataMetaText>
            </div>
          </div>
          <div
            className="grid min-h-10 grid-cols-[132px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-alert-notice-template-query="backend-paginated"
            data-alert-notice-template-query-owner="route-query-contract"
          >
            <HzDataMetaText variant="type">Template query</HzDataMetaText>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <HzDataMetaText display="block" casing="plain">preset + name + pageIndex + pageSize</HzDataMetaText>
              <HzDataMetaText display="block" casing="plain">rule options keep all templates</HzDataMetaText>
            </div>
          </div>
          <HzInlineFeedback
            tone="info"
            title="Notice rule saves receiver and template names"
            meta="Payload mirrors Angular receiverName/templateName derivation before save"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-display-names="angular-save-payload"
            data-alert-notice-rule-display-names-owner="route-payload-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule edit saves detail display names"
            meta="Edit saves fall back to the rule detail receiverName and templateName when paged option lists do not contain the selected ids"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-edit-display-names="angular-detail-options"
            data-alert-notice-rule-edit-display-names-owner="route-payload-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule edit fields seed detail options"
            meta="Edit forms keep the current receiver and template visible from detail data before the paged option lists are loaded"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-edit-option-seeding="angular-detail-options"
            data-alert-notice-rule-edit-option-seeding-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule edit loads detail before opening"
            meta="Row edit mirrors Angular onEditOneNoticeRule: fetch the rule detail by id, then seed receiver and template options"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-edit-detail="angular-detail-fetch"
            data-alert-notice-rule-edit-detail-owner="route-detail-fetch-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule save uses modal OK loading"
            meta="Rule save mirrors Angular nzOkLoading while create or edit requests are pending"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-save-loading="angular-nz-ok-loading"
            data-alert-notice-rule-save-loading-owner="route-modal-ok-contract"
          />
          <HzInlineFeedback
            tone="critical"
            title="Notice rule save failure keeps notify title"
            meta="Angular rule save failures use common.notify.new-fail/edit-fail as title and backend msg as detail"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-save-failure="angular-notify-title-detail"
            data-alert-notice-rule-save-failure-owner="route-action-feedback-contract"
            data-alert-notice-rule-save-failure-title="common.notify.edit-fail"
            data-alert-notice-rule-save-failure-detail="backend-message"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule table template display follows template id"
            meta="Angular shows the preset-template fallback whenever templateId is empty, even if stale templateName data is present"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-template-display="angular-template-id-fallback"
            data-alert-notice-rule-template-display-owner="route-table-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule receiver display follows Angular arrays"
            meta="The legacy table interpolates receiverName arrays directly, so multiple receivers display as comma-separated values without added spaces"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-receiver-display="angular-array-interpolation"
            data-alert-notice-rule-receiver-display-owner="route-table-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule search submits on Enter and clear"
            meta="The Angular toolbar searches on keydown.enter and the field cleared event; Next keeps both through the shared cold search row"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-search-submit="angular-enter-and-clear"
            data-alert-notice-rule-search-submit-owner="cold-search-row"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice receiver and template search submit on Enter and clear"
            meta="The remaining alert-notice toolbar searches preserve Angular keydown.enter and cleared-event submission through the same cold search row"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-search-submit="angular-enter-and-clear"
            data-alert-notice-receiver-search-submit-owner="cold-search-row"
            data-hz-ui-lab-alert-notice-template-search-submit="angular-enter-and-clear"
            data-alert-notice-template-search-submit-owner="cold-search-row"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice toolbar sync reloads tables"
            meta="Receiver, rule, and template refresh buttons preserve the Angular sync-table reload contract through the shared refresh tick"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-sync="angular-load-table"
            data-alert-notice-receiver-sync-owner="route-refresh-contract"
            data-hz-ui-lab-alert-notice-rule-sync="angular-load-table"
            data-alert-notice-rule-sync-owner="route-refresh-contract"
            data-hz-ui-lab-alert-notice-template-sync="angular-load-table"
            data-alert-notice-template-sync-owner="route-refresh-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule single switches stay unframed"
            meta="Single Boolean controls keep only the switch track, label, and focus state"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-single-switch-frame="none"
            data-alert-notice-rule-single-switch-frame-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule custom period starts with all days"
            meta="Turning on custom period mirrors Angular dayCheckOptions: Sunday through Saturday stay selected until the operator removes days"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-period-default-days="angular-all-days"
            data-alert-notice-rule-period-default-days-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule custom period keeps independent state"
            meta="Angular stores isLimit separately from the selected weekday array, so a custom period can be open while all seven weekdays remain selected"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-period-limit-state="angular-independent-isLimit"
            data-alert-notice-rule-period-limit-state-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule new forms keep time empty"
            meta="New Angular NoticeRule leaves periodStart and periodEnd unset until the operator chooses a time window"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-time-default="angular-empty-new-rule"
            data-alert-notice-rule-time-default-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule period and time are optional"
            meta="Angular only blocks missing name, receivers, and labels when forwarding is scoped; empty weekday and time values do not invalidate the modal form"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-optional-period-time="angular-form-validity"
            data-alert-notice-rule-optional-period-time-owner="route-validation-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule templates follow receiver type"
            meta="When a receiver is selected, Angular keeps only the preset option and templates matching that receiver type"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-template-type-filter="angular-selected-receiver-type"
            data-alert-notice-rule-template-type-filter-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice rule multi-receiver template type mirrors switchReceiver"
            meta="When multiple receivers are selected, the Angular switchReceiver active type drives the template option set"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-template-active-type="angular-switch-receiver"
            data-alert-notice-rule-template-active-type-owner="route-form-contract"
          />
          <div
            className="grid min-h-10 grid-cols-[132px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-alert-notice-rule-single-switch-visual="unframed-switch"
            data-alert-notice-rule-single-switch-frame="none"
            data-alert-notice-rule-single-switch-frame-owner="route-form-contract"
          >
            <HzDataMetaText variant="type">Forward all</HzDataMetaText>
            <AlertNoticeRuleSwitch
              row="filter-all"
              checked={noticeRuleFilterAllDemo}
              label="转发所有"
              testId="ui-lab-alert-notice-rule-filter-all"
              onCheckedChange={setNoticeRuleFilterAllDemo}
            />
          </div>
          <HzInlineFeedback
            tone="success"
            title="Notice rule table switches use edit feedback"
            meta="Table filter-all and enable switches preserve row display names and use Angular edit notifications"
            variant="embedded"
            data-hz-ui-lab-alert-notice-rule-table-switch-update="angular-edit-notify"
            data-alert-notice-rule-table-switch-update-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Receiver test send is backend-owned"
            meta="Matches Angular: test send posts the receiver draft and lets the API return success or failure"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-test-validation="angular-backend-owned"
            data-alert-notice-receiver-test-validation-owner="route-mutation-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Receiver defaults to email"
            meta="New receivers mirror Angular's NoticeReceiver constructor and reveal the email field immediately"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-default-type="angular-email"
            data-alert-notice-receiver-default-type-owner="route-form-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Notice deletes use Angular notify keys"
            meta="Receiver, rule, and template deletes use common.notify.delete-success and common.notify.delete-fail"
            variant="embedded"
            data-hz-ui-lab-alert-notice-delete-feedback="angular-delete-notify"
            data-alert-notice-delete-feedback-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="critical"
            title="Notice deletes require confirmation"
            meta="Receiver, rule, and template row deletes preserve Angular modal.confirm before the delete mutation"
            variant="embedded"
            data-hz-ui-lab-alert-notice-delete-confirm="angular-modal-confirm"
            data-alert-notice-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
          />
          <HzInlineFeedback
            tone="success"
            title="Notice saves use Angular notify keys"
            meta="Receiver, rule, and template create/edit saves use common.notify.new-* and common.notify.edit-*"
            variant="embedded"
            data-hz-ui-lab-alert-notice-save-feedback="angular-new-edit-notify"
            data-alert-notice-save-feedback-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="success"
            title="Receiver save includes next step"
            meta="Receiver create/edit success keeps Angular's policy-next notification body"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-success-next="angular-policy-next"
            data-alert-notice-receiver-success-next-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="warning"
            title="Receiver transport save failure closes editor"
            meta="Angular receiver save closes the modal on transport errors while business-code failures stay in the form"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-save-failure-close="angular-transport-error-close"
            data-alert-notice-receiver-save-failure-close-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="critical"
            title="Notice receiver save failure keeps notify title"
            meta="Angular receiver save failures use common.notify.new-fail/edit-fail as title and backend msg as detail"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-save-failure="angular-notify-title-detail"
            data-alert-notice-receiver-save-failure-owner="route-action-feedback-contract"
            data-alert-notice-receiver-save-failure-title="common.notify.edit-fail"
            data-alert-notice-receiver-save-failure-detail="backend-message"
          />
          <HzInlineFeedback
            tone="critical"
            title="Notice edit load failures use Angular notify keys"
            meta="Receiver, rule, and template edit detail loads fall back to common.notify.edit-fail"
            variant="embedded"
            data-hz-ui-lab-alert-notice-edit-load-feedback="angular-edit-fail"
            data-alert-notice-edit-load-feedback-owner="route-action-feedback-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Receiver edit loads detail before opening"
            meta="Row edit mirrors Angular onEditOneNoticeReceiver: fetch the receiver detail by id, then seed the modal draft"
            variant="embedded"
            data-hz-ui-lab-alert-notice-receiver-edit-detail="angular-detail-fetch"
            data-alert-notice-receiver-edit-detail-owner="route-detail-fetch-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Template edit loads detail before opening"
            meta="Custom template edit mirrors Angular onEditOneNoticeTemplate: fetch the template by id, then seed the modal draft"
            variant="embedded"
            data-hz-ui-lab-alert-notice-template-edit-detail="angular-detail-fetch"
            data-alert-notice-template-edit-detail-owner="route-detail-fetch-contract"
          />
          <HzInlineFeedback
            tone="critical"
            title="Notice template save failure keeps notify title"
            meta="Angular template save failures use common.notify.new-fail/edit-fail as title and backend msg as detail"
            variant="embedded"
            data-hz-ui-lab-alert-notice-template-save-failure="angular-notify-title-detail"
            data-alert-notice-template-save-failure-owner="route-action-feedback-contract"
            data-alert-notice-template-save-failure-title="common.notify.edit-fail"
            data-alert-notice-template-save-failure-detail="backend-message"
          />
          <HzInlineFeedback
            tone="info"
            title="Preset template viewer uses return footer"
            meta="Preset template view mirrors Angular nzCancelText=common.button.return with nzOkText=null"
            variant="embedded"
            data-hz-ui-lab-alert-notice-template-viewer-return="angular-cancel-return"
            data-alert-notice-template-viewer-return-owner="route-modal-footer-contract"
            data-alert-notice-template-viewer-ok="none"
          />
          <HzInlineFeedback
            tone="warning"
            title="Notice template type starts blank"
            meta="New templates mirror Angular's required select placeholder before save"
            variant="embedded"
            data-hz-ui-lab-alert-notice-template-type-required="angular-required-select"
            data-alert-notice-template-type-required-owner="route-validation-contract"
          />
          <HzInlineFeedback
            tone="info"
            title="Notice template Telegram label"
            meta="Template rows and template type picker use Angular's Telegram label instead of receiver bot copy"
            variant="embedded"
            data-hz-ui-lab-alert-notice-template-telegram-label="angular-template-telegram"
            data-alert-notice-template-telegram-label-owner="route-i18n-contract"
          />
          <div
            className="grid gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-3"
            data-hz-ui-lab-alert-notice-template-code-editor="shared"
            data-alert-notice-template-code-editor-owner="hertzbeat-ui-code-editor"
            data-alert-notice-template-viewer-code-editor="readonly-code-editor"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <HzDataMetaText variant="type">Template body</HzDataMetaText>
              <HzDataMetaText display="block" casing="plain">editor and viewer use shared CodeMirror frame</HzDataMetaText>
            </div>
            <HzCodeEditor
              data-alert-notice-template-code-editor="template-content"
              value={'<b>${content}</b>\\n${labels.severity}'}
              language="html"
              readOnly
              minHeight="120px"
              ariaLabel="Notice template content preview"
            />
          </div>
          <div
            className="grid min-h-10 grid-cols-[132px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-alert-notice-delete-clamp="angular-update-page-index"
            data-alert-notice-delete-page-clamp-owner="route-state-contract"
          >
            <HzDataMetaText variant="type">Notice delete</HzDataMetaText>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <HzDataMetaText display="block" casing="plain">receiver/rule/template clamp page after delete</HzDataMetaText>
              <HzDataMetaText display="block" casing="plain">matches Angular updatePageIndex(1)</HzDataMetaText>
            </div>
          </div>
          <div
            className="flex min-h-8 items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-data-meta-text="shared"
          >
            <HzDataMetaText>MYSQL</HzDataMetaText>
            <HzDataMetaText variant="unit">ms</HzDataMetaText>
            <HzDataMetaText spacing="inline">owner=shared</HzDataMetaText>
            <HzDataMetaText variant="unit" spacing="compact">s</HzDataMetaText>
            <HzDataMetaText display="block" casing="plain">3 / 8 rows</HzDataMetaText>
          </div>
          <div
            className="grid min-h-10 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-data-cell-text="shared"
          >
            <div className="min-w-0">
              <HzDataCellText variant="title" display="block">mysql-prod-01</HzDataCellText>
              <HzDataCellText variant="copy" display="block" spacing="stack-tight">127.0.0.1:3306</HzDataCellText>
            </div>
            <HzDataCellText variant="meta" display="block" spacing="stack" casing="plain" tone="success">team=platform</HzDataCellText>
            <HzDataCellText variant="type" tone="muted">MYSQL</HzDataCellText>
          </div>
          <div
            className="grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_minmax(0,1.4fr)] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-trace-data-cell-text="shared"
          >
            <HzDataCellText variant="timestamp" data-hz-ui-lab-trace-data-cell="start">2026-05-23 22:15:00</HzDataCellText>
            <HzDataCellText variant="title" data-hz-ui-lab-trace-data-cell="service">hertzbeat-api</HzDataCellText>
            <HzDataCellText variant="value" data-hz-ui-lab-trace-data-cell="duration">118ms</HzDataCellText>
            <HzDataCellText variant="identifier" display="block" width="trace-id" data-hz-ui-lab-trace-data-cell="trace-id">trace-20260523</HzDataCellText>
          </div>
          <div
            className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3"
            data-hz-ui-lab-trace-table-row-action="shared"
          >
            <HzTableRowActionButton
              width="root-span"
              data-hz-ui-lab-trace-row-action-owner="hertzbeat-ui-table-row-action-button"
            >
              POST /api/monitors/detect
            </HzTableRowActionButton>
            <HzStatusBadge tone="success" size="xs">OK</HzStatusBadge>
          </div>
          <div
            className="flex items-center gap-3 border-b border-[var(--hz-ui-line-soft)] px-3 py-2"
            data-hz-ui-lab-disabled-action-shell="shared"
          >
            <HzDisabledActionShell
              title="Missing trace id"
              data-hz-ui-lab-disabled-action-owner="hertzbeat-ui-disabled-action-shell"
            >
              <HzButton size="md" disabled>View logs</HzButton>
            </HzDisabledActionShell>
          </div>
          <HzEmptyState
            data-hz-ui-lab-trace-table-empty-state="shared"
            data-signal-table-empty-state-owner="hertzbeat-ui-empty-state"
            title="No matching traces"
            description="Widen the time range or clear trace filters."
            layout="table-panel"
          />
          <HzFieldInsights
            field="collector"
            selectedValue={contextMessage}
            values={collectorFieldStats}
            onShowContext={() => setContextMessage('上下文窗口: collector-a · logs/traces · 15m before/after')}
            onDrilldown={() => addFilterClause(createFieldClause('collector', 'collector-a', 'IN'))}
          />
          <div className="grid min-w-0 border-t border-[var(--hz-ui-line-faint)] 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <HzQueryHistory
              title="Query history"
              items={queryHistoryItems}
              onRestore={item => setQuery(stringifyFilterValue(item.query))}
              onCompare={item => setContextMessage(`对比窗口: ${item.id} · ${stringifyFilterValue(item.query)}`)}
              actions={<HzButton size="sm" intent="ghost">Pin run</HzButton>}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <div className="grid min-w-0">
              <HzSavedViewCompare
                title="Saved view compare"
                baseline={{
                  label: 'Baseline',
                  meta: '2 filters',
                  items: ['resource.type IN mysql, linux', 'status != down']
                }}
                candidate={{
                  label: 'Open alerts',
                  meta: '1 filter',
                  items: ['status IN warning, collecting']
                }}
                deltas={savedViewCompareDeltas}
                actions={<HzButton size="sm" intent="ghost">Apply diff</HzButton>}
                className="border-x-0 border-y-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
              />
              <HzInvestigationNotes
                title="Investigation notes"
                notes={investigationNotes}
                actions={<HzButton size="sm" intent="ghost">Add note</HzButton>}
                className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)]"
              />
            </div>
          </div>
          <div className="grid min-w-0 border-t border-[var(--hz-ui-line-faint)] 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <HzCommandPalette
              title="Command palette"
              query="collector-a"
              placeholder="Search commands, pages, entities"
              items={commandPaletteItems}
              onSelect={item => setContextMessage(`命令准备: ${item.id}`)}
              actions={<HzButton size="sm" intent="ghost">Cmd K</HzButton>}
              className="border-x-0 border-y-0 2xl:border-r 2xl:border-[var(--hz-ui-line-soft)]"
            />
            <HzContextHandoff
              title="Context handoff"
              context="mysql-prod-01 · collector-a · last 15m"
              targets={contextHandoffTargets}
              onOpen={target => setContextMessage(`上下文跳转: ${target.id}`)}
              actions={<HzButton size="sm" intent="ghost">Copy context</HzButton>}
              className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-soft)] 2xl:border-t-0"
            />
          </div>
          <HzFoundationGuide className="border-x-0 border-b-0 border-t border-[var(--hz-ui-line-faint)]" />
          <div className="border-t border-[var(--hz-ui-line-faint)]">
            <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--hz-ui-line-soft)] px-3 py-2">
              <div className="text-[13px] font-semibold text-[#f3f6fb]">Template catalog</div>
              <HzButton size="sm" intent="ghost" onClick={() => setTypePickerOpen(true)}>
                <Plus size={13} />
                Pick type
              </HzButton>
            </div>
            <HzTemplatePicker
              categories={monitorTypeCategories}
              selectedId={selectedType}
              onSelect={setSelectedType}
              search={typeSearch}
              onSearchChange={setTypeSearch}
              title="Grouped templates"
              action={<span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#727b8c]">source</span>}
              className="border-0"
            />
          </div>
        </section>
        <aside className="min-w-0 bg-[var(--hz-ui-canvas)]" data-ui-lab-yaml-column="rail">
          <HzMutationBar
            title="YAML draft"
            status={mutationStatus}
            dirtyFields={mutationStatus === 'clean' ? [] : ['app-mysql.yml', 'metrics.basic.fields']}
            validationIssues={yamlValidationIssues}
            feedback={<HzInlineFeedback tone={yamlFeedbackTone} title={yamlFeedbackTitle} description={yamlFeedbackDescription} variant="embedded" />}
            onSave={saveYamlDraft}
            onDiscard={discardYamlDraft}
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <HzDangerConfirm
                  open={dangerConfirmOpen}
                  title="Reset YAML draft"
                  description="This clears local edits in the UI lab and restores the default MySQL template."
                  triggerLabel="Reset"
                  confirmLabel="Reset draft"
                  cancelLabel="Keep editing"
                  onOpenChange={setDangerConfirmOpen}
                  onConfirm={resetYamlDraft}
                />
                <div
                  data-hz-ui-lab-monitor-delete-confirm="shared"
                  data-hz-ui-lab-monitor-delete-page-recovery="shared"
                  data-hz-ui-lab-monitor-delete-failure-closes-dialog="shared"
                  data-hz-ui-lab-monitor-delete-confirm-closable="angular-nz-closable-false"
                  data-hz-ui-lab-monitor-delete-confirm-ok="angular-nz-ok-danger-primary"
                  data-monitor-delete-confirm-closable-contract="angular-nz-closable-false"
                  data-monitor-delete-confirm-ok-contract="angular-nz-ok-danger-primary"
                  data-monitor-delete-confirm-modal-owner="hertzbeat-ui-confirm-dialog"
                  data-hz-ui-lab-setting-define-confirm="angular-save-delete-visibility"
                  data-hz-ui-lab-setting-define-confirm-title="angular-title-copy"
                  data-hz-ui-lab-setting-define-confirm-closable="angular-nz-closable-false"
                  data-hz-ui-lab-setting-define-confirm-ok="angular-nz-ok-danger-primary"
                  data-hz-ui-lab-setting-define-visibility-loading="angular-save-loading"
                  data-hz-ui-lab-setting-define-startup-reload-failure="angular-fire-and-forget"
                  data-setting-define-template-visibility-loading-contract="angular-save-loading"
                  data-setting-define-template-visibility-loading-owner="setting-define-controller"
                  data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"
                  data-setting-define-startup-reload-failure-owner="startup-service"
                  data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"
                >
                  <HzButton size="sm" intent="danger" onClick={() => setDeleteConfirmOpen(true)}>
                    Delete monitors
                  </HzButton>
                  <HzConfirmDialog
                    open={deleteConfirmOpen}
                    tone="critical"
                    kicker="Monitor center"
                    title="Delete selected monitors"
                    bodyRhythm="stack"
                    cancelLabel="Cancel"
                    confirmLabel="Delete selected"
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={() => {
                      setDeleteConfirmOpen(false);
                      setContextMessage('Monitor delete confirmation accepted in UI lab');
                    }}
                    data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                    data-monitor-delete-confirm-closable="angular-nz-closable-false"
                    data-monitor-delete-confirm-ok="angular-nz-ok-danger-primary"
                  >
                    <div data-monitors-delete-confirm="cold-modal">
                      <p>This confirmation shell is shared by monitor batch actions.</p>
                      <HzInlineFeedback tone="critical" title="2 monitors selected" />
                    </div>
                  </HzConfirmDialog>
                  <HzConfirmDialog
                    open
                    tone="critical"
                    kicker="Monitor center"
                    title="Please confirm whether to cancel monitor in batches!"
                    bodyRhythm="stack"
                    cancelLabel="Cancel"
                    confirmLabel="OK"
                    onClose={() => undefined}
                    onConfirm={() => undefined}
                    data-hz-ui-lab-monitor-batch-response-confirm="angular-modal-confirm"
                    data-hz-ui-lab-monitor-batch-response-confirm-closable="angular-nz-closable-false"
                    data-hz-ui-lab-monitor-batch-response-confirm-ok="angular-nz-ok-danger-primary"
                    data-monitor-batch-response-confirm="angular-modal-confirm"
                    data-monitor-batch-response-confirm-owner="hertzbeat-ui-confirm-dialog"
                    data-monitor-batch-response-confirm-action="pause"
                    data-monitor-batch-response-confirm-count="2"
                    data-monitor-batch-response-confirm-closable="angular-nz-closable-false"
                    data-monitor-batch-response-confirm-ok="angular-nz-ok-danger-primary"
                  >
                    <div data-monitor-batch-response-confirm-body="angular-batch-confirm">
                      <HzInlineFeedback
                        tone="critical"
                        title="2 monitors selected"
                        data-monitor-batch-response-confirm-selected-owner="hertzbeat-ui-inline-feedback"
                      />
                    </div>
                  </HzConfirmDialog>
                </div>
              </div>
            }
            className="border-x-0 border-t-0"
          />
          <div
            data-hz-ui-lab-setting-define-route-state="angular-current-app-url-retained"
            data-hz-ui-lab-setting-define-theme-init="angular-theme-service-initial"
            data-hz-ui-lab-setting-define-theme-switch="angular-nz-switch-code-editor-theme"
            data-hz-ui-lab-setting-define-menu-filter="angular-monitor-select-list-label-only"
            data-hz-ui-lab-setting-define-menu-filtered="angular-hide-prometheus-system"
            data-hz-ui-lab-setting-define-menu-loading="angular-monitor-select-list-loading"
            data-hz-ui-lab-setting-define-load-failure="angular-console-only-shell"
            data-hz-ui-lab-setting-define-save-failure="angular-apply-fail-notification"
            data-hz-ui-lab-setting-define-delete-failure="angular-delete-fail-notification"
            data-hz-ui-lab-setting-define-visibility-failure="angular-apply-fail-notification"
            data-hz-ui-lab-setting-define-new-draft="angular-locale-comment-five-newlines"
            data-hz-ui-lab-setting-define-new-action="angular-current-app-reset-url-retained"
            data-hz-ui-lab-setting-define-menu-select="angular-router-navigate-app-query"
            data-hz-ui-lab-setting-define-menu-select-query="angular-replace-with-app-only"
            data-hz-ui-lab-setting-define-delete-success-edit-state="angular-preserve-is-editing"
            data-hz-ui-lab-setting-define-save-visibility="angular-code-diff-independent-of-editing"
            data-hz-ui-lab-setting-define-save-reload="angular-load-app-define-content-after-save"
            data-hz-ui-lab-setting-define-startup-reload="angular-startup-load-after-success"
            data-hz-ui-lab-setting-define-startup-reload-failure="angular-fire-and-forget"
            data-hz-ui-lab-setting-define-editor-options="angular-yaml-vs-folding-automatic-layout"
            data-hz-ui-lab-setting-define-editor-loading="angular-nz-code-editor-loading"
            data-setting-define-theme-contract="angular-theme-service-initial"
            data-setting-define-theme-owner="angular-theme-service"
            data-setting-define-theme-mode="dark-ops"
            data-setting-define-theme-switch-contract="angular-nz-switch-code-editor-theme"
            data-setting-define-theme-switch-owner="hertzbeat-ui-switch"
            data-setting-define-theme-switch-state="vs-dark"
            data-setting-define-menu-filter-contract="angular-monitor-select-list-label-only"
            data-setting-define-menu-filter-owner="hertzbeat-ui-template-picker"
            data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"
            data-setting-define-menu-filtered-owner="setting-define-controller"
            data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"
            data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"
            data-setting-define-menu-loading="false"
            data-setting-define-load-failure-contract="angular-console-only-shell"
            data-setting-define-load-failure-owner="setting-define-controller"
            data-setting-define-load-failure="none"
            data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"
            data-setting-define-new-draft-owner="setting-define-controller"
            data-setting-define-new-draft-state="new-template"
            data-setting-define-new-action-contract="angular-current-app-reset-url-retained"
            data-setting-define-new-action-owner="setting-define-controller"
            data-setting-define-new-action-state="available"
            data-setting-define-menu-select-contract="angular-router-navigate-app-query"
            data-setting-define-menu-select-owner="hertzbeat-ui-template-picker"
            data-setting-define-menu-select-query-contract="angular-replace-with-app-only"
            data-setting-define-menu-select-query-owner="setting-define-page-router"
            data-setting-define-confirm-closable-contract="angular-nz-closable-false"
            data-setting-define-confirm-ok-contract="angular-nz-ok-danger-primary"
            data-setting-define-delete-success-edit-state-contract="angular-preserve-is-editing"
            data-setting-define-save-visibility-contract="angular-code-diff-independent-of-editing"
            data-setting-define-save-reload-contract="angular-load-app-define-content-after-save"
            data-setting-define-save-reload-owner="setting-define-controller"
            data-setting-define-save-reload-scope="existing-template"
            data-setting-define-startup-reload-contract="angular-startup-load-after-success"
            data-setting-define-startup-reload-owner="startup-service"
            data-setting-define-startup-reload-scope="save-delete-visibility-success"
            data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"
            data-setting-define-startup-reload-failure-owner="startup-service"
            data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"
            data-setting-define-editor-option-owner="cold-code-editor"
            data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"
            data-setting-define-editor-loading-owner="cold-code-editor"
            data-setting-define-editor-loading="false"
            data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"
          >
            <HzTemplatePicker
              categories={yamlCategories}
              selectedId={selectedTemplate}
              search=""
              onSearchChange={() => undefined}
              title="Loading templates"
              loading
              labels={{
                loading: 'Loading template menu'
              }}
              className="border-x-0 border-t-0"
              data-hz-ui-lab-setting-define-menu-loading-demo="angular-monitor-select-list-loading"
            />
            <div className="mt-3" data-hz-ui-lab-setting-define-editor-loading-demo="angular-nz-code-editor-loading">
              <ColdCodeEditor
                data-ui-lab-code-editor-loading="cold-code-editor"
                data-setting-define-editor-loading="true"
                value={code}
                language="yaml"
                theme="vs-dark"
                loading
                loadingLabel="Loading template YAML"
                minHeight="96px"
                ariaLabel="Loading YAML source"
              />
            </div>
            <HzYamlWorkspace
              layout="rail"
              categories={yamlCategories}
              selectedId={selectedTemplate}
              onSelect={setSelectedTemplate}
              search={templateSearch}
              onSearchChange={setTemplateSearch}
              title={selectedTemplateItem?.label || 'Template'}
              filename={selectedTemplateItem?.meta || 'app.yml'}
              code={code}
              editor={
                <ColdCodeEditor
                  data-hz-ui="yaml-editor"
                  data-ui-lab-code-editor="cold-code-editor"
                  data-hz-ui-lab-setting-define-editor-theme="angular-vs-dark"
                  data-setting-define-editor-theme="vs-dark"
                  data-setting-define-editor-theme-owner="angular-nz-code-editor-theme"
                  data-setting-define-editor-folding="true"
                  data-setting-define-editor-automatic-layout="true"
                  data-setting-define-editor-loading="false"
                  value={code}
                  language="yaml"
                  theme="vs-dark"
                  minHeight="360px"
                  ariaLabel={`${selectedTemplateItem?.label || 'Template'} YAML source`}
                  onChange={changeYamlCode}
                />
              }
              feedback={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-[#9cc9aa]">schema valid · 12 fields · local draft</span>
                  <HzInlineFeedback
                    tone="critical"
                    title="Apply Failed!"
                    meta="Backend schema validation message"
                    variant="embedded"
                    data-hz-ui-lab-setting-define-save-failure="angular-apply-fail-notification"
                    data-setting-define-save-failure-owner="hertzbeat-ui-inline-feedback"
                    data-setting-define-save-feedback-title="common.notify.apply-fail"
                    data-setting-define-save-feedback-detail="backend-message"
                  />
                  <HzInlineFeedback
                    tone="critical"
                    title="Delete Failed!"
                    meta="Backend template in-use message"
                    variant="embedded"
                    data-hz-ui-lab-setting-define-delete-failure="angular-delete-fail-notification"
                    data-setting-define-delete-failure-owner="hertzbeat-ui-inline-feedback"
                    data-setting-define-delete-feedback-title="common.notify.delete-fail"
                    data-setting-define-delete-feedback-detail="backend-message"
                  />
                  <HzInlineFeedback
                    tone="critical"
                    title="Apply Failed!"
                    meta="Backend visibility policy message"
                    variant="embedded"
                    data-hz-ui-lab-setting-define-visibility-failure="angular-apply-fail-notification"
                    data-setting-define-visibility-failure-owner="hertzbeat-ui-inline-feedback"
                    data-setting-define-visibility-feedback-title="common.notify.apply-fail"
                    data-setting-define-visibility-feedback-detail="backend-message"
                  />
                </div>
              }
              actions={
                <>
                  <HzSwitch
                    checked
                    label="Dark mode"
                    aria-label="Dark mode"
                    data-hz-ui-lab-setting-define-theme-switch-demo="angular-nz-switch-code-editor-theme"
                    data-setting-define-theme-toggle="angular-nz-switch"
                    data-setting-define-theme-toggle-owner="hertzbeat-ui-switch"
                    data-setting-define-theme-toggle-state="vs-dark"
                  />
                <HzButton size="sm">Hide</HzButton>
                <HzButtonLink
                  href="/monitors?app=mysql"
                  size="sm"
                  data-hz-ui-lab-setting-define-monitor-link="angular-routerlink-monitors-app"
                  data-setting-define-monitor-link-contract="angular-routerlink-monitors-app"
                  data-setting-define-monitor-link-owner="hertzbeat-ui-button-link"
                  data-setting-define-monitor-link-app="mysql"
                >
                  <FileText size={13} />
                  app-mysql.yml
                </HzButtonLink>
                <HzButton
                  size="sm"
                  intent="danger"
                  data-hz-ui-lab-setting-define-delete-action-label="angular-current-app-id"
                  data-setting-define-delete-action-owner="hertzbeat-ui-button"
                  data-setting-define-delete-action-label="mysql"
                  aria-label="Delete mysql"
                  title="Delete mysql"
                >
                  Delete mysql
                </HzButton>
                <HzButton size="sm" intent="primary">
                  <Play size={13} />
                  Apply
                  </HzButton>
                  <HzButton
                    size="sm"
                    intent="primary"
                    aria-busy="true"
                    disabled
                    data-hz-ui-lab-setting-define-save-loading="angular-nz-loading"
                    data-setting-define-save-loading-owner="angular-nz-loading"
                    data-setting-define-save-pending="true"
                  >
                    <FileCode2 size={13} />
                    Applying
                  </HzButton>
                </>
              }
              className="min-h-[calc(100vh-281px)] border-0"
            />
          </div>
          <HzToastStack
            items={toastItems}
            className="pointer-events-none fixed bottom-4 right-4 z-40 w-[360px] max-w-[calc(100vw-32px)]"
          />
        </aside>
      </div>

      <HzInspectorDrawer
        open={inspectorOpen}
        variant="overlay"
        title="Selected resource"
        subtitle={`${selectedMonitor.name} · ${selectedMonitor.app} · ${selectedMonitor.collector} · last 15m`}
        status={<span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#c69b58]">{selectedMonitor.tone}</span>}
        facts={selectedInspectorFacts}
        sections={inspectorSections}
        actions={<HzButton size="sm" intent="ghost">Open entity</HzButton>}
        onClose={() => setInspectorOpen(false)}
      />

      <HzTraceDetailDrawer
        open={traceDetailOpen}
        trace={selectedTrace}
        facts={selectedTraceFacts}
        sections={[
          {
            id: 'trace-evidence',
            title: 'Trace evidence',
            description: 'Selected trace keeps service graph, span events, and waterfall aligned.',
            items: [
              {
                id: 'trace-service-edge',
                label: 'Service edge',
                value: 'api -> collector · mysql.collect',
                meta: '68ms',
                tone: 'warning'
              },
              {
                id: 'trace-span-event',
                label: 'Span event',
                value: 'mysql.connection.retry',
                meta: '68ms',
                tone: 'warning'
              },
              {
                id: 'trace-waterfall-scale',
                label: 'Waterfall scale',
                value: 'global start/end ratios',
                meta: 'shared',
                tone: 'info'
              }
            ]
          }
        ]}
        actions={<HzButton size="sm" intent="ghost">Open trace</HzButton>}
        onClose={() => setTraceDetailOpen(false)}
      />

      <HzTypePickerDialog
        open={typePickerOpen}
        title="新增监控"
        description="选择资源类型后再进入对应表单，不让默认 app=mysql 偷偷决定用户流程。"
        categories={monitorTypeCategories}
        selectedId={selectedType}
        search={typeSearch}
        onSearchChange={setTypeSearch}
        onSelect={setSelectedType}
        onClose={() => setTypePickerOpen(false)}
        searchInputProps={
          {
            'data-hz-ui-lab-monitor-app-picker-search': 'shared',
            'data-monitor-app-picker-search-owner': 'hertzbeat-ui-input',
            'data-monitor-app-picker-search-action': 'filter'
          } as React.ComponentProps<typeof HzTypePickerDialog>['searchInputProps']
        }
      />
    </HzExplorerFrame>
  );
}
