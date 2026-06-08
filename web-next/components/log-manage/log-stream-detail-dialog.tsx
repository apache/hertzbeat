'use client';

import { useI18n } from '@/components/providers/i18n-provider';
import * as React from 'react';
import { Copy, WrapText } from 'lucide-react';
import { HzActionGroup, HzAttributeDiagnostics, HzButton, HzButtonIcon, HzButtonLink, HzChipGroup, HzDataTable, HzDetailRows, HzDialogBodyLayout, HzInlineContextMark, HzInput, HzStateNotice, HzStatusBadge, HzTrendBar, HzTrendFrame } from '@hertzbeat/ui';
import { CodePane } from '../observability/code-pane';
import { OverlayDialog } from '../workbench/overlay-dialog';

type DetailRow = {
  title: string;
  copy: string;
  meta?: string;
};

type MetricsPreviewRow = DetailRow & {
  query?: string;
  family?: 'cpu' | 'memory' | 'other';
  familyLabel?: string;
  source?: 'pod' | 'node' | 'resource';
  sourceValue?: string;
  href?: string;
  bars?: Array<{
    key: string;
    heightPct: number;
    label: string;
    valueLabel: string;
  }>;
};

type DetailFact = {
  label: string;
  value: string;
  monospace?: boolean;
};

type AttributionDiagnostic = {
  key: string;
  label: string;
  value: string;
  state: 'present' | 'missing';
  meta: string;
};

type AttributeRow = {
  key: string;
  source: string;
  name: string;
  value: string;
};

type ContextRow = {
  key: string;
  relation: 'before' | 'selected' | 'after';
  relationLabel: string;
  time: string;
  severity: string;
  body: string;
  service: string;
};

type DetailSectionKey = 'overview' | 'json' | 'context' | 'metrics';
type LogStreamDetailDialogOverlayProps = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

const LOG_DETAIL_SECTION_IDS: Record<DetailSectionKey, string> = {
  overview: 'log-detail-section-overview',
  json: 'log-detail-section-json',
  context: 'log-detail-section-context',
  metrics: 'log-detail-section-metrics'
};

export function LogStreamDetailDialog({
  open,
  onClose,
  title,
  subtitle,
  traceId,
  selectionState,
  warning,
  facts = [],
  attributionDiagnostics = [],
  badges = [],
  metaItems = [],
  actions,
  rows,
  metricsRows = [],
  metricsHref,
  metricsPreviewRows = [],
  metricsPreviewLoading = false,
  metricsPreviewError,
  metricsPreviewEmpty,
  contextRows = [],
  contextLoading = false,
  contextError,
  contextHasMoreBefore = false,
  contextHasMoreAfter = false,
  onLoadMoreContext,
  attributeRows = [],
  renderAttributeAction,
  json,
  raw,
  onCopyJson,
  onCopyRaw,
  onCopyMetricQuery,
  overlayProps
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  traceId?: string;
  selectionState?: 'attached' | 'detached';
  warning?: React.ReactNode;
  facts?: DetailFact[];
  attributionDiagnostics?: AttributionDiagnostic[];
  badges?: string[];
  metaItems?: string[];
  actions?: React.ReactNode;
  rows: DetailRow[];
  metricsRows?: DetailRow[];
  metricsHref?: string;
  metricsPreviewRows?: MetricsPreviewRow[];
  metricsPreviewLoading?: boolean;
  metricsPreviewError?: string | null;
  metricsPreviewEmpty?: string | null;
  contextRows?: ContextRow[];
  contextLoading?: boolean;
  contextError?: string | null;
  contextHasMoreBefore?: boolean;
  contextHasMoreAfter?: boolean;
  onLoadMoreContext?: (direction: 'before' | 'after') => void;
  attributeRows?: AttributeRow[];
  renderAttributeAction?: (row: AttributeRow) => React.ReactNode;
  json?: string;
  raw?: string;
  onCopyJson?: (json: string) => void;
  onCopyRaw?: (raw: string) => void;
  onCopyMetricQuery?: (query: string) => void;
  overlayProps?: LogStreamDetailDialogOverlayProps;
}) {
  const { t } = useI18n();
  const [attributeSearch, setAttributeSearch] = React.useState('');
  const [jsonWrap, setJsonWrap] = React.useState(false);
  const [rawWrap, setRawWrap] = React.useState(false);
  const hasJsonCopy = Boolean(json && onCopyJson);
  const hasRawCopy = Boolean(raw && onCopyRaw);
  const normalizedAttributeSearch = attributeSearch.trim().toLowerCase();
  const visibleAttributeRows = normalizedAttributeSearch
    ? attributeRows.filter(row => [row.source, row.name, row.value].some(value => value.toLowerCase().includes(normalizedAttributeSearch)))
    : attributeRows;
  const metricsPreviewGroups = React.useMemo(() => {
    const sourceOrder: Array<NonNullable<MetricsPreviewRow['source']>> = ['pod', 'node', 'resource'];
    return sourceOrder
      .map(source => ({
        source,
        sourceValue: metricsPreviewRows.find(row => (row.source || 'resource') === source)?.sourceValue,
        rows: metricsPreviewRows.filter(row => (row.source || 'resource') === source)
      }))
      .filter(group => group.rows.length > 0);
  }, [metricsPreviewRows]);
  const showOverviewSection = Boolean(
    warning ||
    facts.length > 0 ||
    attributionDiagnostics.length > 0 ||
    badges.length > 0 ||
    metaItems.length > 0 ||
    actions ||
    raw ||
    rows.length > 0 ||
    attributeRows.length > 0
  );
  const showMetricsSection = metricsRows.length > 0;
  const showContextSection = contextLoading || Boolean(contextError) || contextRows.length > 0;
  const showJsonSection = Boolean(json);
  const detailSections = ([
    {
      key: 'overview',
      id: LOG_DETAIL_SECTION_IDS.overview,
      label: t('log.manage.stream.detail.section.overview'),
      visible: showOverviewSection
    },
    {
      key: 'json',
      id: LOG_DETAIL_SECTION_IDS.json,
      label: t('log.manage.stream.detail.section.json'),
      visible: showJsonSection
    },
    {
      key: 'context',
      id: LOG_DETAIL_SECTION_IDS.context,
      label: t('log.manage.stream.detail.section.context'),
      visible: showContextSection
    },
    {
      key: 'metrics',
      id: LOG_DETAIL_SECTION_IDS.metrics,
      label: t('log.manage.stream.detail.section.metrics'),
      visible: showMetricsSection
    }
  ] satisfies Array<{ key: DetailSectionKey; id: string; label: string; visible: boolean }>).filter(section => section.visible);

  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      kicker={title}
      title={subtitle || title}
      placement="right"
      maxWidthClassName="max-w-[720px]"
      overlayProps={overlayProps}
    >
      <HzDialogBodyLayout
        data-log-stream-detail-dialog="true"
        data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout"
        data-log-stream-detail-trace-id={traceId}
        data-log-stream-detail-selection={selectionState}
      >
        {detailSections.length > 1 ? (
          <HzActionGroup
            data-log-stream-detail-section-nav="true"
            data-log-stream-detail-section-nav-owner="hertzbeat-ui-action-group"
            density="inline"
            aria-label={t('log.manage.stream.detail.section.nav')}
          >
            {detailSections.map(section => (
              <HzButtonLink
                key={section.key}
                data-log-stream-detail-section-nav-item={section.key}
                data-log-stream-detail-section-nav-item-owner="hertzbeat-ui-button-link"
                href={`#${section.id}`}
                size="xs"
              >
                {section.label}
              </HzButtonLink>
            ))}
          </HzActionGroup>
        ) : null}
        {showOverviewSection ? (
          <section
            id={LOG_DETAIL_SECTION_IDS.overview}
            className="grid min-w-0 gap-3"
            data-log-stream-detail-section="overview"
            data-log-stream-detail-section-owner="hertzbeat-ui-section"
          >
            {warning ? (
              <HzStateNotice
                data-log-stream-detail-warning="attached-state-warning"
                data-log-stream-detail-warning-owner="hertzbeat-ui-state-notice"
                tone="warning"
                title={warning}
                variant="embedded"
                className="rounded-[6px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)]"
              />
            ) : null}
            {facts.length > 0 ? (
              <HzDetailRows
                data-log-stream-detail-facts="true"
                data-log-stream-detail-facts-owner="hertzbeat-ui-detail-rows"
                rows={facts.map(fact => ({
                  key: `${fact.label}-${fact.value}`,
                  title: fact.label,
                  copy: <span className={fact.monospace ? 'font-mono text-[12px]' : undefined}>{fact.value}</span>
                }))}
              />
            ) : null}
            {attributionDiagnostics.length > 0 ? (
              <HzAttributeDiagnostics
                data-log-stream-detail-attribution-diagnostics="hertzbeat-attribute-diagnostics"
                data-log-stream-detail-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"
                title={t('log.manage.stream.detail.attribution-title')}
                namespaceLabel="hertzbeat.*"
                rows={attributionDiagnostics.map(row => ({
                  key: row.key,
                  label: row.label,
                  value: row.value,
                  meta: row.meta,
                  state: row.state,
                  stateLabel: row.state === 'present'
                    ? t('log.manage.stream.detail.attribution-present')
                    : t('log.manage.stream.detail.attribution-missing'),
                  tone: row.state === 'present' ? 'success' : 'critical',
                  rowProps: { 'data-log-stream-detail-attribution-diagnostic-state': row.state }
                }))}
              />
            ) : null}
            {badges.length > 0 || metaItems.length > 0 ? (
              <HzChipGroup
                data-log-stream-detail-toolbar="true"
                data-log-stream-detail-toolbar-owner="hertzbeat-ui-toolbar-chips"
              >
                {badges.map(badge => (
                  <HzStatusBadge
                    key={badge}
                    data-log-stream-detail-toolbar-badge-owner="hertzbeat-ui-status-badge"
                    tone="neutral"
                    size="xs"
                  >
                    {badge}
                  </HzStatusBadge>
                ))}
                {metaItems.map(item => (
                  <HzInlineContextMark
                    key={item}
                    data-log-stream-detail-toolbar-meta-owner="hertzbeat-ui-inline-context-mark"
                    active={false}
                    className="h-6 max-w-[260px] text-[11px]"
                  >
                    {item}
                  </HzInlineContextMark>
                ))}
              </HzChipGroup>
            ) : null}
            {actions ? (
              <HzActionGroup
                data-log-stream-detail-actions-owner="hertzbeat-ui-action-group"
                data-log-stream-detail-actions="dialog-actions"
                density="inline"
              >
                {actions}
              </HzActionGroup>
            ) : null}
            {raw ? (
              <div
                className="grid min-w-0 gap-2"
                data-log-stream-detail-body-section="true"
                data-log-stream-detail-body-wrap-state={rawWrap ? 'wrapped' : 'scroll'}
              >
                <HzActionGroup
                  data-log-stream-detail-body-toolbar="body-actions"
                  data-log-stream-detail-body-toolbar-owner="hertzbeat-ui-action-group"
                  density="inline"
                >
                  <div className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
                    {t('log.manage.stream.detail.body.title')}
                  </div>
                  <HzButton
                    data-log-stream-detail-body-wrap-action="toggle"
                    data-log-stream-detail-body-wrap-owner="hertzbeat-ui-button"
                    data-log-stream-detail-body-wrap-active={rawWrap ? 'true' : 'false'}
                    size="sm"
                    intent="secondary"
                    onClick={() => setRawWrap(value => !value)}
                    aria-label={t('log.manage.stream.detail.wrap-body.aria')}
                    aria-pressed={rawWrap}
                  >
                    <HzButtonIcon
                      icon={WrapText}
                      data-log-stream-detail-body-wrap-icon="wrap-text"
                      data-log-stream-detail-body-wrap-icon-owner="hertzbeat-ui-button-icon"
                    />
                    {t('log.manage.stream.detail.wrap-body')}
                  </HzButton>
                </HzActionGroup>
                <CodePane className={rawWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}>{raw}</CodePane>
              </div>
            ) : null}
            {rows.length > 0 ? (
              <HzDetailRows
                data-log-stream-detail-row-list="shared-detail-rows"
                data-log-stream-detail-row-list-owner="hertzbeat-ui-detail-rows"
                rows={rows.map(row => ({
                  key: `${row.title}-${row.meta ?? ''}`,
                  title: row.title,
                  copy: row.copy,
                  meta: row.meta
                }))}
              />
            ) : null}
          </section>
        ) : null}
        {metricsRows.length > 0 ? (
          <section
            id={LOG_DETAIL_SECTION_IDS.metrics}
            className="grid min-w-0 gap-2"
            data-log-stream-detail-section="metrics"
            data-log-stream-detail-section-owner="hertzbeat-ui-section"
            data-log-stream-detail-metrics-shell="metrics-correlation"
          >
            <HzDetailRows
              data-log-stream-detail-metrics="correlation"
              data-log-stream-detail-metrics-owner="hertzbeat-ui-detail-rows"
              heading={t('log.manage.stream.detail.metrics.title')}
              boundary="top"
              rows={metricsRows.map(row => ({
                key: `${row.title}-${row.meta ?? ''}`,
                title: row.title,
                copy: <span className="font-mono text-[12px]">{row.copy}</span>,
                meta: row.meta
              }))}
            />
            {metricsHref ? (
              <HzButtonLink
                data-log-stream-detail-metrics-link="open-metrics"
                data-log-stream-detail-metrics-link-owner="hertzbeat-ui-button-link"
                href={metricsHref}
                size="sm"
                className="justify-self-start"
              >
                {t('log.manage.stream.detail.metrics.open')}
              </HzButtonLink>
            ) : null}
            {metricsPreviewLoading ? (
              <HzStateNotice
                data-log-stream-detail-metrics-preview-loading="true"
                data-log-stream-detail-metrics-preview-loading-owner="hertzbeat-ui-state-notice"
                title={t('log.manage.stream.detail.metrics.preview-loading')}
                tone="neutral"
                variant="embedded"
              />
            ) : metricsPreviewError ? (
              <HzStateNotice
                data-log-stream-detail-metrics-preview-error="true"
                data-log-stream-detail-metrics-preview-error-owner="hertzbeat-ui-state-notice"
                title={metricsPreviewError}
                tone="warning"
                variant="embedded"
              />
            ) : metricsPreviewRows.length > 0 ? (
              <div
                data-log-stream-detail-metrics-preview="source-backed-series"
                data-log-stream-detail-metrics-preview-owner="hertzbeat-ui-trend-frame"
                className="grid min-w-0 gap-3"
              >
                <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
                  {t('log.manage.stream.detail.metrics.preview-title')}
                </div>
                {metricsPreviewGroups.map(group => (
                  <section
                    key={group.source}
                    data-log-stream-detail-metrics-preview-group={group.source}
                    data-log-stream-detail-metrics-preview-group-owner="hertzbeat-ui-trend-frame"
                    data-log-stream-detail-metrics-preview-group-resource={group.sourceValue}
                    className="grid min-w-0 gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
                      <span>{t(`log.manage.stream.detail.metrics.preview-group.${group.source}`)}</span>
                      {group.sourceValue ? (
                        <span className="truncate font-mono tracking-normal text-[#a8b0bf]">{group.sourceValue}</span>
                      ) : null}
                    </div>
                    {group.rows.map(row => (
                      <div
                        key={`${row.title}-${row.meta ?? ''}`}
                        className="grid min-w-0 gap-2 border-y border-[var(--hz-ui-line-soft)] px-3 py-2"
                        data-log-stream-detail-metrics-preview-row={row.family || 'other'}
                        data-log-stream-detail-metrics-preview-row-source={row.source || 'resource'}
                        data-log-stream-detail-metrics-preview-row-owner="hertzbeat-ui-trend-frame"
                      >
                        <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f99ab]">
                              {row.title}
                            </div>
                            {row.meta ? (
                              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#727b8c]">
                                {row.meta}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex min-w-0 items-center justify-end gap-2">
                            <div className="font-mono text-[12px] text-[#dbe4f0]">{row.copy}</div>
                            {row.href ? (
                              <HzButtonLink
                                data-log-stream-detail-metrics-preview-row-link="open-series"
                                data-log-stream-detail-metrics-preview-row-link-owner="hertzbeat-ui-button-link"
                                href={row.href}
                                size="xs"
                              >
                                {t('log.manage.stream.detail.metrics.preview-open-series')}
                              </HzButtonLink>
                            ) : null}
                            {row.query && onCopyMetricQuery ? (
                              <HzButton
                                data-log-stream-detail-metrics-preview-row-copy="query"
                                data-log-stream-detail-metrics-preview-row-copy-owner="hertzbeat-ui-button"
                                size="xs"
                                intent="secondary"
                                onClick={() => onCopyMetricQuery(row.query || '')}
                                aria-label={t('log.manage.stream.detail.metrics.preview-copy-query.aria')}
                              >
                                <HzButtonIcon
                                  icon={Copy}
                                  data-log-stream-detail-metrics-preview-row-copy-icon="copy"
                                  data-log-stream-detail-metrics-preview-row-copy-icon-owner="hertzbeat-ui-button-icon"
                                />
                                {t('log.manage.stream.detail.metrics.preview-copy-query')}
                              </HzButton>
                            ) : null}
                          </div>
                        </div>
                        <HzTrendFrame
                          data-log-stream-detail-metrics-preview-trend="compact-bars"
                          data-log-stream-detail-metrics-preview-trend-owner="hertzbeat-ui-trend-frame"
                          data-log-stream-detail-metrics-preview-trend-family={row.family || 'other'}
                          className="h-12"
                        >
                          {(row.bars || []).map(bar => (
                            <HzTrendBar
                              key={bar.key}
                              data-log-stream-detail-metrics-preview-trend-bar="real-sample"
                              data-log-stream-detail-metrics-preview-trend-bar-owner="hertzbeat-ui-trend-bar"
                              heightPct={bar.heightPct}
                              title={`${row.familyLabel || row.family || 'other'} · ${bar.label} · ${bar.valueLabel}`}
                            />
                          ))}
                        </HzTrendFrame>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            ) : metricsPreviewEmpty ? (
              <HzStateNotice
                data-log-stream-detail-metrics-preview-empty="true"
                data-log-stream-detail-metrics-preview-empty-owner="hertzbeat-ui-state-notice"
                title={metricsPreviewEmpty}
                tone="neutral"
                variant="embedded"
              />
            ) : null}
          </section>
        ) : null}
        {contextLoading || contextError || contextRows.length > 0 ? (
          <section
            id={LOG_DETAIL_SECTION_IDS.context}
            className="grid min-w-0 gap-2"
            data-log-stream-detail-section="context"
            data-log-stream-detail-section-owner="hertzbeat-ui-section"
            data-log-stream-detail-context-shell="context-tab"
          >
            {contextLoading ? (
              <HzStateNotice
                data-log-stream-detail-context-loading="true"
                data-log-stream-detail-context-loading-owner="hertzbeat-ui-state-notice"
                title={t('log.manage.stream.detail.context.loading')}
                tone="neutral"
                variant="embedded"
              />
            ) : contextError ? (
              <HzStateNotice
                data-log-stream-detail-context-error="true"
                data-log-stream-detail-context-error-owner="hertzbeat-ui-state-notice"
                title={contextError}
                tone="warning"
                variant="embedded"
              />
            ) : (
              <>
                <HzDataTable
                  data-log-stream-detail-context="surrounding-logs"
                  data-log-stream-detail-context-owner="hertzbeat-ui-data-table"
                  variant="embedded"
                  rows={contextRows}
                  getRowKey={row => row.key}
                  columns={[
                    {
                      key: 'relation',
                      header: t('log.manage.stream.detail.context.column.relation'),
                      width: '104px',
                      render: row => (
                        <HzStatusBadge
                          data-log-stream-detail-context-relation={row.relation}
                          data-log-stream-detail-context-relation-owner="hertzbeat-ui-status-badge"
                          tone={row.relation === 'selected' ? 'critical' : 'neutral'}
                          size="xs"
                        >
                          {row.relationLabel}
                        </HzStatusBadge>
                      )
                    },
                    {
                      key: 'time',
                      header: t('log.manage.stream.detail.context.column.time'),
                      width: '160px',
                      render: row => <span className="font-mono text-[12px]">{row.time}</span>
                    },
                    {
                      key: 'severity',
                      header: t('log.manage.stream.detail.context.column.severity'),
                      width: '92px',
                      render: row => row.severity
                    },
                    {
                      key: 'body',
                      header: t('log.manage.stream.detail.context.column.body'),
                      render: row => <span className="block min-w-0 truncate font-mono text-[12px]">{row.body}</span>
                    },
                    {
                      key: 'service',
                      header: t('log.manage.stream.detail.context.column.service'),
                      width: '120px',
                      render: row => row.service
                    }
                  ]}
                />
                {contextHasMoreBefore || contextHasMoreAfter ? (
                  <HzActionGroup
                    data-log-stream-detail-context-more="true"
                    data-log-stream-detail-context-more-owner="hertzbeat-ui-action-group"
                    density="inline"
                  >
                    {contextHasMoreBefore ? (
                      <HzButton
                        data-log-stream-detail-context-load-more="before"
                        data-log-stream-detail-context-load-more-owner="hertzbeat-ui-button"
                        size="sm"
                        intent="secondary"
                        onClick={() => onLoadMoreContext?.('before')}
                      >
                        {t('log.manage.stream.detail.context.more-before')}
                      </HzButton>
                    ) : null}
                    {contextHasMoreAfter ? (
                      <HzButton
                        data-log-stream-detail-context-load-more="after"
                        data-log-stream-detail-context-load-more-owner="hertzbeat-ui-button"
                        size="sm"
                        intent="secondary"
                        onClick={() => onLoadMoreContext?.('after')}
                      >
                        {t('log.manage.stream.detail.context.more-after')}
                      </HzButton>
                    ) : null}
                  </HzActionGroup>
                ) : null}
              </>
            )}
          </section>
        ) : null}
        {attributeRows.length > 0 ? (
          <div
            className="grid min-w-0 gap-2"
            data-log-stream-detail-section-subpart="overview-attributes"
            data-log-stream-detail-attributes-shell="searchable-attributes"
          >
            <HzInput
              data-log-stream-detail-attribute-search="true"
              data-log-stream-detail-attribute-search-owner="hertzbeat-ui-input"
              value={attributeSearch}
              onChange={event => setAttributeSearch(event.target.value)}
              placeholder={t('log.manage.stream.detail.attribute-search.placeholder')}
              aria-label={t('log.manage.stream.detail.attribute-search.aria')}
              width="default"
            />
            {visibleAttributeRows.length > 0 ? (
              <HzDataTable
                data-log-stream-detail-attributes="log-attributes"
                data-log-stream-detail-attributes-owner="hertzbeat-ui-data-table"
                variant="embedded"
                rows={visibleAttributeRows}
                getRowKey={row => row.key}
                columns={[
                  {
                    key: 'source',
                    header: t('log.manage.attributes.column.source'),
                    width: '112px',
                    render: row => row.source
                  },
                  {
                    key: 'name',
                    header: t('log.manage.attributes.column.name'),
                    width: '220px',
                    render: row => <span className="font-mono text-[12px]">{row.name}</span>
                  },
                  {
                    key: 'value',
                    header: t('log.manage.attributes.column.value'),
                    render: row => <span className="font-mono text-[12px]">{row.value}</span>
                  },
                  ...(renderAttributeAction
                    ? [
                        {
                          key: 'filter',
                          header: t('log.manage.attributes.column.filter'),
                          width: '108px',
                          render: (row: AttributeRow) => renderAttributeAction(row)
                        }
                      ]
                    : [])
                ]}
              />
            ) : (
              <HzStateNotice
                data-log-stream-detail-attributes-empty="filtered"
                data-log-stream-detail-attributes-empty-owner="hertzbeat-ui-state-notice"
                title={t('log.manage.stream.detail.attribute-search.empty')}
                tone="neutral"
                variant="embedded"
              />
            )}
          </div>
        ) : null}
        {json ? (
          <section
            id={LOG_DETAIL_SECTION_IDS.json}
            className="grid min-w-0 gap-2"
            data-log-stream-detail-section="json"
            data-log-stream-detail-section-owner="hertzbeat-ui-section"
            data-log-stream-detail-json-section="true"
            data-log-stream-detail-json-wrap-state={jsonWrap ? 'wrapped' : 'scroll'}
          >
            <HzActionGroup
              data-log-stream-detail-json-toolbar="json-copy-actions"
              data-log-stream-detail-json-toolbar-owner="hertzbeat-ui-action-group"
              density="inline"
            >
              {hasJsonCopy ? (
                <HzButton
                  data-log-stream-detail-json-copy-action="json"
                  data-log-stream-detail-json-copy-owner="hertzbeat-ui-button"
                  size="sm"
                  intent="secondary"
                  onClick={() => onCopyJson?.(json)}
                  aria-label={t('log.manage.stream.detail.copy-json.aria')}
                >
                  <HzButtonIcon
                    icon={Copy}
                    data-log-stream-detail-json-copy-icon="copy"
                    data-log-stream-detail-json-copy-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.stream.detail.copy-json')}
                </HzButton>
              ) : null}
              {hasRawCopy ? (
                <HzButton
                  data-log-stream-detail-raw-copy-action="raw"
                  data-log-stream-detail-raw-copy-owner="hertzbeat-ui-button"
                  size="sm"
                  intent="secondary"
                  onClick={() => {
                    if (raw) onCopyRaw?.(raw);
                  }}
                  aria-label={t('log.manage.stream.detail.copy-raw.aria')}
                >
                  <HzButtonIcon
                    icon={Copy}
                    data-log-stream-detail-raw-copy-icon="copy"
                    data-log-stream-detail-raw-copy-icon-owner="hertzbeat-ui-button-icon"
                  />
                  {t('log.manage.stream.detail.copy-raw')}
                </HzButton>
              ) : null}
              <HzButton
                data-log-stream-detail-json-wrap-action="toggle"
                data-log-stream-detail-json-wrap-owner="hertzbeat-ui-button"
                data-log-stream-detail-json-wrap-active={jsonWrap ? 'true' : 'false'}
                size="sm"
                intent="secondary"
                onClick={() => setJsonWrap(value => !value)}
                aria-label={t('log.manage.stream.detail.wrap-json.aria')}
                aria-pressed={jsonWrap}
              >
                <HzButtonIcon
                  icon={WrapText}
                  data-log-stream-detail-json-wrap-icon="wrap-text"
                  data-log-stream-detail-json-wrap-icon-owner="hertzbeat-ui-button-icon"
                />
                {t('log.manage.stream.detail.wrap-json')}
              </HzButton>
            </HzActionGroup>
            <CodePane className={jsonWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}>{json}</CodePane>
          </section>
        ) : null}
      </HzDialogBodyLayout>
    </OverlayDialog>
  );
}
