export interface ApiMessage<T> {
  code: number;
  msg?: string;
  data: T;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  pageIndex: number;
  pageSize: number;
}

export interface TraceListItem {
  traceId: string;
  rootSpanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  rootSpanName?: string | null;
  durationNanos?: number | null;
  status?: string | null;
  startTime?: number | string | null;
  errorSpanCount?: number;
}

export interface TraceOverview {
  totalTraceCount: number;
  errorTraceCount: number;
  latestObservedAt?: number | string | null;
  hasActiveTrace: boolean;
}

export interface TraceSpanEvent {
  timeUnixNano?: number | null;
  name?: string | null;
  attributes?: Record<string, unknown>;
}

export interface TraceSpanLink {
  traceId?: string | null;
  spanId?: string | null;
  traceState?: string | null;
  attributes?: Record<string, unknown>;
}

export interface TraceSpanNode {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  spanName?: string | null;
  serviceName?: string | null;
  status?: string | null;
  spanKind?: string | null;
  statusMessage?: string | null;
  traceState?: string | null;
  scopeName?: string | null;
  scopeVersion?: string | null;
  durationNanos?: number | null;
  startTime?: number | string | null;
  highlighted?: boolean;
  resourceAttributes?: Record<string, string>;
  spanAttributes?: Record<string, string>;
  events?: TraceSpanEvent[];
  links?: TraceSpanLink[];
}

export interface TraceDetail {
  traceId: string;
  rootSpanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  rootSpanName?: string | null;
  durationNanos?: number | null;
  status?: string | null;
  startTime?: number | string | null;
  errorSpanCount?: number;
  resourceAttributes?: Record<string, string>;
  spans: TraceSpanNode[];
}

export interface CodeNavigationHint {
  repositoryUrl?: string;
  provider?: string;
  defaultPath?: string;
  searchQuery?: string;
  label?: string;
}

export interface LogEntry {
  timeUnixNano?: number;
  severityText?: string;
  severityNumber?: number;
  body?: unknown;
  traceId?: string;
  spanId?: string;
  resource?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

export interface LogOverview {
  totalLogs: number;
  errorLogs: number;
  hasActiveLog?: boolean | null;
  latestObservedAt?: number | null;
  distinctTraceCount: number;
  droppedCount?: number | null;
  parseFailureCount?: number | null;
  entityMergeFailureCount?: number | null;
  templateBindingState?: string | null;
  boundTemplateCount?: number | null;
  collectorOnlineCount?: number | null;
  collectorTotalCount?: number | null;
}

export interface LogTrendStats {
  hourlyStats: Record<string, number>;
}

export interface LogTraceCoverage {
  traceCoverage: {
    withBothTraceAndSpan: number;
    withTrace: number;
    withoutTrace: number;
    withSpan: number;
  };
}

export interface Monitor {
  id: number;
  name: string;
  app: string;
  instance: string;
  scrape?: string;
  intervals?: number | null;
  scheduleType?: string | null;
  cronExpression?: string | null;
  status: number;
  type?: number;
  description?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  _displayStatus?: 'ACTIVE' | 'DISAPPEARED';
  _disappearTime?: number;
  _graceTimer?: unknown;
  gmtUpdate?: number;
  gmtCreate?: number;
}

export interface Param {
  id?: number;
  field?: string;
  type?: number;
  paramValue?: unknown;
  display?: boolean;
}

export interface MonitorDetailMetric {
  name: string;
  fields?: Array<{
    type?: number;
    field?: string;
    unit?: string;
  }>;
  visible?: boolean;
}

export interface ParamDefineOption {
  label?: string | Record<string, string>;
  value?: string;
}

export interface ParamDefine {
  field: string;
  name?: string | Record<string, string>;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string | Record<string, string>;
  range?: string;
  limit?: number;
  options?: ParamDefineOption[];
  keyAlias?: string;
  valueAlias?: string;
  hide?: boolean;
  depend?: Record<string, unknown[]>;
}

export interface MonitorHistoryValue {
  origin?: string;
  mean?: string;
  median?: string;
  min?: string;
  max?: string;
  time?: number;
}

export interface MonitorHistoryData {
  instance?: string;
  app?: string;
  metrics?: string;
  field?: {
    name?: string;
    type?: number;
    unit?: string;
    label?: boolean;
  };
  values?: Record<string, MonitorHistoryValue[]>;
}

export interface MonitorRealtimeMetricData {
  id?: number;
  app?: string;
  metrics?: string;
  time?: number;
  fields?: Array<{
    name?: string;
    unit?: string;
    label?: boolean;
  }>;
  valueRows?: Array<{
    labels?: Record<string, string>;
    values?: Array<{
      origin?: string;
      mean?: string;
      median?: string;
      min?: string;
      max?: string;
      time?: number;
    }>;
  }>;
}

export interface GrafanaDashboard {
  enabled: boolean;
  template?: string;
  url?: string;
}

export interface OtlpSignalOverview {
  signal: string;
  active: boolean;
  totalCount: number;
  latestObservedAt?: number | null;
  intakeMode?: string;
  summary?: string;
}

export interface OtlpRecentSignalEvent {
  signal: string;
  title?: string;
  detail?: string;
  observedAt?: number | null;
}

export interface OtlpBackendReadinessCheck {
  key: string;
  title: string;
  status?: string | null;
  summary?: string | null;
  detail?: string | null;
  checkedAt?: number | null;
}

export interface OtlpIngestionOverview {
  metrics: OtlpSignalOverview;
  logs: OtlpSignalOverview;
  traces: OtlpSignalOverview;
  activeSignalCount: number;
  latestObservedAt?: number | null;
  recentServiceCount: number;
  boundEntityCount: number;
  recentEvents: OtlpRecentSignalEvent[];
  readinessChecks?: OtlpBackendReadinessCheck[];
}

export interface OtlpSignalGuide {
  signal: string;
  protocol?: string;
  mode?: string;
  endpoint?: string;
  summary?: string;
  note?: string;
}

export interface OtlpIngestionGuide {
  httpProtocolLabel?: string;
  grpcProtocolLabel?: string;
  authHeaderName?: string;
  authHeaderExample?: string;
  grpcAuthorityExample?: string;
  signals: OtlpSignalGuide[];
  snippets?: Array<{
    key: string;
    protocol?: string;
    title: string;
    language?: string;
    content?: string;
  }>;
}

export interface OtlpBoundEntity {
  entityId: number;
  type?: string;
  name?: string;
  displayName?: string;
  namespace?: string;
  primaryIdentityKey?: string;
  primaryIdentityValue?: string;
  monitorBindCount: number;
}

export interface OtlpUnboundEntityCandidate {
  suggestedName?: string;
  suggestedType?: string;
  namespace?: string;
  environment?: string;
  primaryIdentityKey?: string;
  primaryIdentityValue?: string;
  signals?: string[];
  canonicalIdentities?: Record<string, string>;
  latestObservedAt?: number | null;
}

export interface OtlpEntityBindingSummary {
  canonicalIdentityKeys: string[];
  recentServices: string[];
  recentBoundEntities: OtlpBoundEntity[];
  recentUnboundCandidates?: OtlpUnboundEntityCandidate[];
  recentIdentitySamples?: Array<{
    key: string;
    value: string;
    signal: string;
  }>;
}

export interface OtlpMetricsConsole {
  query?: string;
  datasource?: string;
  queryMode?: string;
  context?: {
    entityId?: number | null;
    entityType?: string | null;
    entityName?: string | null;
    serviceName?: string | null;
    serviceNamespace?: string | null;
    environment?: string | null;
    operationName?: string | null;
    start?: number | null;
    end?: number | null;
  };
  stats?: {
    totalSeries: number;
    nonEmptySeries: number;
    latestObservedAt?: number | null;
  };
  emptyStateReason?: string | null;
  errorMessage?: string | null;
  results?: {
    status?: number;
    msg?: string | null;
    refId?: string;
    frames?: Array<{
      schema?: {
        fields?: Array<{
          name?: string;
          type?: string;
        }>;
        labels?: Record<string, string>;
        meta?: Record<string, unknown>;
      };
      data?: Array<Array<number | string | null>>;
    }>;
  };
}

export interface OtlpMetricsInventory {
  context?: OtlpMetricsConsole['context'];
  source?: string | null;
  total?: number;
  items?: Array<{
    metricName?: string | null;
    family?: string | null;
    timeSeriesCount?: number;
    latestObservedAt?: number | null;
    labels?: Record<string, string>;
  }>;
}

export interface OtlpRelatedMetrics {
  context?: OtlpMetricsConsole['context'];
  filter?: string | null;
  operationName?: string | null;
  source?: string | null;
  candidateCount?: number;
  resourceMatchers?: Array<{
    label?: string | null;
    operator?: string | null;
    value?: string | null;
  }>;
  candidates?: Array<{
    query?: string | null;
    source?: string | null;
    family?: string | null;
    reason?: string | null;
    matchedLabels?: string[];
    resourceMatch?: Record<string, string>;
  }>;
}

export interface AppCount {
  category: string;
  app: string;
  size: number;
  availableSize: number;
  unManageSize: number;
  unAvailableSize: number;
}

export interface DashboardSummary {
  apps: AppCount[];
}

export interface SingleAlert {
  id: number;
  fingerprint: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  content?: string;
  status?: string;
  startAt?: number | null;
  endAt?: number | null;
  activeAt?: number | null;
  triggerTimes?: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
}

export interface GroupAlert {
  id: number;
  groupKey?: string;
  status?: string;
  groupLabels?: Record<string, string>;
  commonLabels?: Record<string, string>;
  commonAnnotations?: Record<string, string>;
  alertFingerprints?: string[];
  alerts?: SingleAlert[];
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
}

export interface EntityNoiseControlRule {
  id?: number;
  name?: string;
  type?: 'silence' | 'inhibit';
  global?: boolean;
  matchedLabels?: string[];
  updatedAt?: number | string | null;
}

export interface EntityNoiseControlSummary {
  activeSilenceCount: number;
  matchingInhibitCount: number;
  activeSilences: EntityNoiseControlRule[];
  matchingInhibits: EntityNoiseControlRule[];
  possibleAlertSuppression: boolean;
}

export interface AlertSummary {
  total: number;
  dealNum: number;
  rate: number;
  priorityWarningNum: number;
  priorityCriticalNum: number;
  priorityEmergencyNum: number;
}

export interface Bulletin {
  id: number;
  name: string;
  monitorIds?: number[];
  app?: string | null;
  fields?: Record<string, string[]>;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface BulletinMetricField {
  key: string;
  unit?: string | null;
  value?: string | null;
}

export interface BulletinMetric {
  name: string;
  fields: BulletinMetricField[][];
}

export interface BulletinMetricsRow {
  monitorName: string;
  monitorId: number;
  host: string;
  metrics: BulletinMetric[];
}

export interface BulletinMetricsData {
  name?: string | null;
  content: BulletinMetricsRow[];
}

export interface EntitySummaryInfo {
  entity?: {
    id?: number;
    name?: string;
    displayName?: string;
    type?: string;
    status?: string;
    owner?: string;
    environment?: string;
    system?: string;
  };
  identityCount?: number;
  monitorCount?: number;
  relationCount?: number;
  activeAlertCount?: number;
  lastEvidenceAt?: number | null;
  definitionManaged?: boolean;
  definitionActivitySummary?: string | null;
}

export interface EntityDetailDto {
  entity?: {
    entity?: Entity;
    identities?: unknown[];
    monitorBinds?: unknown[];
    relations?: unknown[];
  };
  status?: unknown;
  evidenceSummary?: EntityEvidenceSummary;
  alertSummary?: EntityAlertSummary;
  monitorSummary?: EntityMonitorSummary;
  logSummary?: EntityLogSummary;
  traceSummary?: EntityTraceSummary & { latestSpanId?: string | null };
  unifiedEvidenceSummary?: EntityUnifiedEvidenceSummary;
  signalEvidence?: EntitySignalEvidenceBundle;
  responseHandoffs?: EntityResponseHandoffsInfo;
  boundMonitors?: Monitor[];
  activeAlerts?: unknown[];
  nextActions?: EntityNextAction[];
  noiseControlSummary?: EntityNoiseControlSummary;
}

export interface EntityResponseHandoffInfo {
  search?: string | null;
  status?: string | null;
  severity?: string | null;
  app?: string | null;
  content?: string | null;
  entityId?: number | string | null;
  entityType?: string | null;
  entityName?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  severityText?: string | null;
  query?: string | null;
  owner?: string | null;
  system?: string | null;
  environment?: string | null;
  start?: number | string | null;
  end?: number | string | null;
  source?: string | null;
  focus?: string | null;
  returnTo?: string | null;
  returnLabel?: string | null;
}

export interface EntityResponseHandoffsInfo {
  alerts?: EntityResponseHandoffInfo | null;
  monitors?: EntityResponseHandoffInfo | null;
  logs?: EntityResponseHandoffInfo | null;
  traces?: EntityResponseHandoffInfo | null;
  discovery?: EntityResponseHandoffInfo | null;
  editor?: EntityResponseHandoffInfo | null;
}

export interface EntitySignalEvidenceBundle {
  logSummary?: EntityLogSummary;
  traceSummary?: EntityTraceSummary & { latestSpanId?: string | null };
  metricEvidence?: unknown[];
  logEvidence?: unknown[];
  traceEvidence?: unknown[];
  logQueryHints?: unknown[];
  traceQueryHints?: unknown[];
  unifiedEvidenceSummary?: EntityUnifiedEvidenceSummary;
  triageRecommendation?: unknown;
}

export interface EntityUnifiedEvidenceSummary {
  activeSignalCount?: number;
  metricsActive?: boolean;
  logsActive?: boolean;
  tracesActive?: boolean;
  metricEvidenceCount?: number;
  logEvidenceCount?: number;
  traceEvidenceCount?: number;
  latestObservedAt?: number | string | null;
  activeSignals?: string[];
}

export interface EntityEvidenceSummary {
  activeAlertCount?: number;
  collectorLastSeenAt?: number | string | null;
  collectorOfflineCount?: number;
  collectorOnlineCount?: number;
  collectorTaskCount?: number;
  collectorTotalCount?: number;
  downMonitorCount?: number;
  healthyMonitorCount?: number;
  identityCount?: number;
  logHintCount?: number;
  lastEvidenceAt?: number | string | null;
}

export interface EntityAlertSummary {
  totalActiveAlerts?: number;
  latestStatusChangeAt?: number | string | null;
}

export interface EntityMonitorSummary {
  totalBoundMonitors?: number;
  latestStatusChangeAt?: number | string | null;
}

export interface EntityLogSummary {
  hintCount?: number;
  preferredQueryType?: string | null;
  preferredQueryTitle?: string | null;
  fallbackSearchTerm?: string | null;
}

export interface EntityTraceSummary {
  recentTraceCount?: number;
  recentErrorTraceCount?: number;
  latestObservedAt?: number | string | null;
  active?: boolean;
  latestTraceId?: string | null;
}

export interface EntityNextAction {
  actionType?: string;
  title?: string;
  summary?: string;
  actionLabel?: string;
  priority?: number;
}

export type EntityDefinitionFormat = 'yaml' | 'json' | 'curl';

export interface EntityDefinitionWorkspaceTemplate {
  id: string;
  name: string;
  format: 'yaml' | 'json';
  content: string;
  summary?: string;
  source?: string;
  kind?: string;
  creator?: string;
  updatedAt?: string | number;
}

export interface EntityDiscoveryGovernancePreset {
  id: string;
  name: string;
  owner?: string;
  system?: string;
  source?: string;
  environment?: string;
  status?: string;
  bulkOwner?: string;
  bulkSystem?: string;
  creator?: string;
  updatedAt?: string | number;
}

export interface EntityDiscoveryGovernanceActivity {
  id: string;
  happenedAt?: string | number;
  status: 'success' | 'warning' | 'info';
  action: string;
  summary: string;
  detail?: string;
  creator?: string;
}

export interface EntityDefinitionActivity {
  id: number;
  entityId?: number;
  activityType: string;
  format?: string | null;
  status: 'success' | 'warning' | 'error' | 'info';
  summary: string;
  detail?: string;
  creator?: string;
  gmtCreate?: number | string;
}

export interface EntityCatalogSuggestions {
  owners?: string[];
  namespaces?: string[];
  environments?: string[];
  systems?: string[];
  lifecycles?: string[];
  tiers?: string[];
  inheritFromRefs?: string[];
  entityRefs?: string[];
  languages?: string[];
  linkProviders?: string[];
}

export interface EntityDefinitionRequest {
  content: string;
  format?: EntityDefinitionFormat | 'auto';
}

export interface EntityOwnerRef {
  name?: string;
  type?: string;
}

export interface EntityLinkRef {
  name?: string;
  type?: string;
  provider?: string;
  url?: string;
}

export interface EntityContactRef {
  name?: string;
  type?: string;
  value?: string;
  contact?: string;
}

export interface Entity {
  id?: number;
  type?: string;
  name?: string;
  displayName?: string;
  subtype?: string;
  namespace?: string;
  environment?: string;
  status?: string;
  criticality?: string;
  owner?: string;
  additionalOwners?: EntityOwnerRef[];
  runbook?: string;
  lifecycle?: string;
  tier?: string;
  system?: string;
  componentOf?: string[];
  components?: string[];
  implementedBy?: string[];
  inheritFrom?: string;
  languages?: string[];
  source?: string;
  description?: string;
  labels?: Record<string, string>;
  tags?: string[];
  links?: EntityLinkRef[];
  contacts?: EntityContactRef[];
}

export interface EntityDto {
  entity: Entity;
  identities?: unknown[];
  monitorBinds?: unknown[];
  relations?: unknown[];
}

export interface AlertDefine {
  id: number;
  name?: string;
  type?: string;
  datasource?: string;
  expr?: string;
  period?: number;
  times?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enable?: boolean;
  template?: string;
  priority?: number;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface CollectorSummary {
  collector?: {
    name?: string;
    ip?: string;
    online?: boolean;
    status?: string | number;
    mode?: string | null;
    version?: string | null;
    gmtUpdate?: string | number | null;
  };
  pinMonitorNum?: number;
  dispatchMonitorNum?: number;
}

export interface Label {
  id: number;
  name: string;
  tagValue?: string | null;
  description?: string | null;
  type?: number | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface Plugin {
  id: number;
  name: string;
  enableStatus?: boolean;
  items?: Array<{ type?: string }>;
  paramCount?: number;
}

export interface StatusPageOrg {
  id?: number;
  name?: string;
  state?: number;
  description?: string;
  home?: string;
  logo?: string;
  feedback?: string;
  color?: string;
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
}

export interface StatusPageComponent {
  id?: number;
  orgId?: number;
  name?: string;
  description?: string;
  endpoint?: string;
  labels?: Record<string, string>;
  method?: number;
  status?: number;
  configState?: number;
  state?: number;
  latestTime?: number | string | null;
  history?: StatusPageHistory[];
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
}

export interface StatusPageHistory {
  id?: number;
  componentId?: number;
  state?: number;
  timestamp?: number | null;
  uptime?: number | null;
  abnormal?: number | null;
  unknowing?: number | null;
  normal?: number | null;
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
}

export interface StatusPageIncident {
  id?: number;
  orgId?: number;
  name?: string;
  title?: string;
  status?: number;
  state?: number;
  startTime?: number | null;
  endTime?: number | null;
  createTime?: number | string | null;
  updateTime?: number | string | null;
  creator?: string;
  modifier?: string;
  gmtCreate?: number | null;
  gmtUpdate?: number | null;
  components?: StatusPageComponent[];
  contents?: Array<{
    id?: number;
    incidentId?: number;
    message?: string;
    state?: number;
    timestamp?: number | null;
  }>;
}

export interface AuthToken {
  id: number;
  name?: string | null;
  tokenMask?: string | null;
  creator?: string | null;
  gmtCreate?: string | number | null;
  expireTime?: string | number | null;
  lastUsedTime?: string | number | null;
}

export interface SystemConfig {
  timeZoneId?: string | null;
  locale?: string | null;
  theme?: string | null;
}

export interface TimezoneOption {
  zoneId: string;
  offset: string;
  displayName: string;
}

export interface EmailNoticeSender {
  id?: number;
  emailHost?: string | null;
  emailPort?: number | null;
  emailUsername?: string | null;
  emailPassword?: string | null;
  emailSsl?: boolean;
  emailStarttls?: boolean;
  enable?: boolean;
}

export interface SmsNoticeSender {
  id?: number;
  type?: string | null;
  enable?: boolean;
  tencent?: Record<string, unknown>;
  alibaba?: Record<string, unknown>;
  unisms?: Record<string, unknown>;
  smslocal?: Record<string, unknown>;
  aws?: Record<string, unknown>;
  twilio?: Record<string, unknown>;
}

export interface ObjectStoreConfig {
  type?: 'FILE' | 'DATABASE' | 'OBS' | string;
  appDefineStoreType?: 'FILE' | 'DATABASE' | 'OBS' | string;
  config?: {
    accessKey?: string;
    secretKey?: string;
    bucketName?: string;
    endpoint?: string;
    savePath?: string;
  } | Record<string, unknown>;
}

export interface AlertGroupConverge {
  id: number;
  name?: string;
  enable?: boolean;
  groupLabels?: string[];
  groupWait?: number;
  groupInterval?: number;
  repeatInterval?: number;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface AlertSilence {
  id: number;
  name?: string;
  enable?: boolean;
  matchAll?: boolean;
  type?: number;
  times?: number;
  labels?: Record<string, string>;
  days?: number[];
  periodStart?: string | number | Date | null;
  periodEnd?: string | number | Date | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface AlertInhibit {
  id: number;
  name?: string;
  enable?: boolean;
  sourceLabels?: Record<string, string>;
  targetLabels?: Record<string, string>;
  equalLabels?: string[];
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface NoticeReceiver {
  id: number;
  name?: string;
  type?: number;
  email?: string;
  phone?: string;
  hookUrl?: string;
  hookAuthType?: string;
  hookAuthToken?: string;
  wechatId?: string;
  accessToken?: string;
  tgBotToken?: string;
  tgUserId?: string;
  tgMessageThreadId?: string;
  larkReceiveType?: number;
  userId?: string;
  chatId?: string;
  slackWebHookUrl?: string;
  corpId?: string;
  agentId?: number;
  appSecret?: string;
  partyId?: string;
  tagId?: string;
  discordChannelId?: string;
  discordBotToken?: string;
  smnAk?: string;
  smnSk?: string;
  smnProjectId?: string;
  smnRegion?: string;
  smnTopicUrn?: string;
  serverChanToken?: string;
  gotifyToken?: string;
  appId?: string;
  creator?: string;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface NoticeRule {
  id: number;
  name?: string;
  receiverId?: number[];
  receiverName?: string[];
  templateId?: number | null;
  templateName?: string | null;
  enable?: boolean;
  filterAll?: boolean;
  labels?: Record<string, string>;
  days?: number[];
  periodStart?: string | number | Date | null;
  periodEnd?: string | number | Date | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface NoticeTemplate {
  id: number;
  name?: string;
  type?: number;
  preset?: boolean;
  content?: string;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
}

export interface SystemConfig {
  timeZoneId?: string | null;
  locale?: string | null;
  theme?: string | null;
}

export interface TimezoneOption {
  zoneId: string;
  offset: string;
  displayName: string;
}

export interface EmailNoticeSender {
  id?: number;
  emailHost?: string | null;
  emailPort?: number | null;
  emailUsername?: string | null;
  emailPassword?: string | null;
  emailSsl?: boolean;
  emailStarttls?: boolean;
  enable?: boolean;
}

export interface SmsNoticeSender {
  id?: number;
  type?: string | null;
  enable?: boolean;
  tencent?: Record<string, unknown>;
  alibaba?: Record<string, unknown>;
  unisms?: Record<string, unknown>;
  smslocal?: Record<string, unknown>;
  aws?: Record<string, unknown>;
  twilio?: Record<string, unknown>;
}

export interface ObjectStoreConfig {
  type?: 'FILE' | 'DATABASE' | 'OBS' | string;
  appDefineStoreType?: 'FILE' | 'DATABASE' | 'OBS' | string;
  config?: {
    accessKey?: string;
    secretKey?: string;
    bucketName?: string;
    endpoint?: string;
    savePath?: string;
  } | Record<string, unknown>;
}
