/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogRow } from '../model/explore-signal-contract';
import { InspectorContent, type InspectorMode } from './explore-log-inspector-content';
import { useEvidenceCopy } from './explore-evidence-copy';
import { traceActionReason } from './log-trace-action';
import { InspectorHeader } from './explore-log-inspector-header';
import { logInspectorFields } from './explore-log-inspector-model';
import styles from './explore-log-inspector.module.css';

const copyStatusKeys = {
  copied: 'explore.perses.logCopied',
  failed: 'explore.perses.logCopyFailed'
} as const;

type Props = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    context?: ReactNode;
    scopeHint?: string | undefined;
    logColumns?: LogColumnControls | undefined;
    id: string;
    row: LogRow;
    pending?: boolean | undefined;
    calculatedValues?: Record<string, string | number | boolean | null> | undefined;
    selectedIndex: number | undefined;
    rowCount: number;
    pageIndex?: number | undefined;
    totalPages?: number | undefined;
    evidenceCurrent: boolean;
    onSelectIndex: (index: number) => void;
    onInvestigate?: (() => void) | undefined;
    onOpenTrace?: (() => void) | undefined;
    onClose: () => void;
  };

export function ExploreLogInspector(props: Props) {
  const { t } = useTranslation();
  const inspectorRef = useRef<HTMLElement>(null);
  useEffect(() => inspectorRef.current?.focus(), []);
  const [mode, setMode] = useState<InspectorMode>('fields');
  const activeMode = mode === 'context' && props.context == null ? 'fields' : mode;
  const json = useMemo(() => JSON.stringify(props.row, null, 2), [props.row]);
  const fields = useMemo(() => logInspectorFields(props.row), [props.row]);
  const { copy, status, sequence } = useEvidenceCopy(json);
  return (
    <aside
      ref={inspectorRef}
      tabIndex={-1}
      id={props.id}
      className={styles.inspector}
      role="dialog"
      aria-modal="false"
      aria-label={t('explore.perses.logInspector')}
      aria-busy={props.pending || undefined}
      data-card-depth="1"
      onKeyDown={event => {
        if (event.key === 'Escape') return closeOnEscape(event, props.onClose);
        if (event.target !== event.currentTarget) return;
        const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (offset === 0 || props.selectedIndex == null) return;
        event.preventDefault();
        event.stopPropagation();
        const next = props.selectedIndex + offset;
        props.onSelectIndex(next);
      }}
    >
      <InspectorHeader
        {...props}
        traceReason={traceActionReason(props.row.traceId, props.evidenceCurrent, Boolean(props.onOpenTrace))}
        onCopy={() => void copy()}
      />
      {props.scopeHint && <p className={styles.scopeHint}>{props.scopeHint}</p>}
      <CalculatedInspectorValues values={props.calculatedValues} />
      <InspectorContent
        context={props.context}
        logColumns={props.logColumns}
        mode={activeMode}
        onModeChange={setMode}
        json={json}
        fields={fields}
        row={props.row}
        allowCalculatedField={props.evidenceCurrent}
        onAnalyzeLogField={props.onAnalyzeLogField}
        logAnalysisDisabledReason={props.evidenceCurrent ? props.logAnalysisDisabledReason : 'unavailable'}
        logFilterDraft={props.logFilterDraft}
        logFilterScope={props.logFilterScope}
        logFilterPending={props.logFilterPending}
        onApplyLogFilters={props.evidenceCurrent ? props.onApplyLogFilters : undefined}
        onAddLogFilter={props.evidenceCurrent ? props.onAddLogFilter : undefined}
      />
      <span
        key={sequence}
        className={styles.liveStatus}
        role="status"
        aria-label={t('explore.perses.copyStatus')}
        aria-live="polite"
        aria-atomic="true"
      >
        {status === 'idle' ? '' : t(copyStatusKeys[status])}
      </span>
    </aside>
  );
}

function CalculatedInspectorValues({ values }: { values: Props['calculatedValues'] }) {
  if (!values) return null;
  return (
    <dl>
      {Object.entries(values).map(([name, value]) => (
        <div key={name}>
          <dt>#{name}</dt>
          <dd>{value == null ? '—' : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function closeOnEscape(event: React.KeyboardEvent, close: () => void) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  close();
}
