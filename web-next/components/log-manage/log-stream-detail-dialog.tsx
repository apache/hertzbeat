'use client';

import { useI18n } from '@/components/providers/i18n-provider';
import * as React from 'react';
import { HzActionGroup, HzAttributeDiagnostics, HzChipGroup, HzDetailRows, HzDialogBodyLayout, HzInlineContextMark, HzStateNotice, HzStatusBadge } from '@hertzbeat/ui';
import { CodePane } from '../observability/code-pane';
import { OverlayDialog } from '../workbench/overlay-dialog';

type DetailRow = {
  title: string;
  copy: string;
  meta?: string;
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
  json
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
  json?: string;
}) {
  const { t } = useI18n();

  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      kicker={title}
      title={subtitle || title}
      placement="right"
      maxWidthClassName="max-w-[720px]"
    >
      <HzDialogBodyLayout
        data-log-stream-detail-dialog="true"
        data-log-stream-detail-dialog-body-owner="hertzbeat-ui-dialog-body-layout"
        data-log-stream-detail-trace-id={traceId}
        data-log-stream-detail-selection={selectionState}
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
        {json ? <CodePane>{json}</CodePane> : null}
      </HzDialogBodyLayout>
    </OverlayDialog>
  );
}
