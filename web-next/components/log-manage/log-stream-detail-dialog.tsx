'use client';

import * as React from 'react';
import { CodePane } from '../observability/code-pane';
import { RowList } from '../workbench/workbench-page';
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
  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      kicker={title}
      title={subtitle || title}
      placement="right"
      maxWidthClassName="max-w-[720px]"
    >
      <div
        className="grid gap-4"
        data-log-stream-detail-dialog="true"
        data-log-stream-detail-trace-id={traceId}
        data-log-stream-detail-selection={selectionState}
      >
        {warning ? (
          <div className="rounded-[6px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-3 py-2 text-xs text-[var(--warning)]">
            {warning}
          </div>
        ) : null}
        {facts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2" data-log-stream-detail-facts="true">
            {facts.map(fact => (
              <div
                key={`${fact.label}-${fact.value}`}
                className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{fact.label}</div>
                <div className={`mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]${fact.monospace ? ' font-mono text-[12px]' : ''}`}>
                  {fact.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {attributionDiagnostics.length > 0 ? (
          <div
            className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-3"
            data-log-stream-detail-attribution-diagnostics="hertzbeat-attribute-diagnostics"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">归因诊断</div>
              <div className="text-[10px] font-semibold text-[var(--ops-text-tertiary)]">hertzbeat.*</div>
            </div>
            <div className="grid gap-2">
              {attributionDiagnostics.map(row => (
                <div
                  key={row.key}
                  data-log-stream-detail-attribution-diagnostic-state={row.state}
                  className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 text-[11px]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono font-semibold text-[var(--ops-text-primary)]">{row.label}</span>
                    <span className="block truncate text-[var(--ops-text-secondary)]">{row.value} · {row.meta}</span>
                  </span>
                  <span
                    className={`inline-flex h-5 items-center justify-center rounded-[3px] border px-1.5 font-semibold ${
                      row.state === 'present'
                        ? 'border-[rgba(96,181,134,0.36)] bg-[rgba(96,181,134,0.1)] text-[rgba(120,220,160,0.95)]'
                        : 'border-[rgba(216,111,91,0.36)] bg-[rgba(216,111,91,0.1)] text-[rgba(244,154,168,0.95)]'
                    }`}
                  >
                    {row.state === 'present' ? '已提供' : '缺失'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {badges.length > 0 || metaItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" data-log-stream-detail-toolbar="true">
            {badges.map(badge => (
              <span
                key={badge}
                className="rounded-[999px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-secondary)]"
              >
                {badge}
              </span>
            ))}
            {metaItems.map(item => (
              <span key={item} className="text-[11px] text-[var(--ops-text-secondary)]">
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        <RowList rows={rows} />
        {json ? <CodePane>{json}</CodePane> : null}
      </div>
    </OverlayDialog>
  );
}
