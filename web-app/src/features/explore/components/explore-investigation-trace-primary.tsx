import type { SpanFilterControls } from '../model/explore-span-filter';
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Typography } from 'antd';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HertzBeatTracingGanttChartResult,
  type HertzBeatPersesPrimitiveMessages,
  type HertzBeatTraceGanttQueryOutcome
} from '@/platform/perses';
import type { InvestigationPersesResults } from '../model/explore-investigation-contract';
import { investigationDurationNanoToMillis } from '../model/explore-investigation-model';
import { InvestigationSpanInspector, SpanAttributeDetails } from './explore-investigation-span-inspector';
import { LOADED_SPAN_LIMIT } from '../model/trace-operation-statistics';
import { formatTraceDuration } from './trace-display';
import styles from './explore-investigation-trace.module.css';

type GanttPanel = NonNullable<InvestigationPersesResults['gantt']> & {
  outcome: Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>;
};
type Props = SpanFilterControls & {
  panel: GanttPanel;
  selectedSpanId?: string | undefined;
  inspectorInitiallyOpen?: boolean | undefined;
  evidenceCurrent: boolean;
  evidenceIdentity?: string | undefined;
  messages: HertzBeatPersesPrimitiveMessages;
  onSelectSpan: (spanId: string) => void;
  onOpenLogs?: (() => void) | undefined;
};

export function InvestigationTracePrimary(props: Props) {
  const { t } = useTranslation();
  const detail = props.panel.outcome.data;
  const spans = detail.spans ?? [];
  const selected = spans.find(span => span.spanId === props.selectedSpanId);
  const { open, focusRevision, container, select, close } = useInspectorControls(props);
  return (
    <div
      ref={container}
      className={styles.traceBody}
      data-trace-waterfall
      style={{ '--trace-row-count': spans.length } as CSSProperties}
    >
      <div className={styles.tracePrimary}>
        <HertzBeatTracingGanttChartResult
          className={styles.ganttRuntime}
          variant="fill"
          title={
            detail.rootSpanName ?? detail.representativeSpan?.spanName ?? t('exploreInvestigation.sections.traces')
          }
          ariaLabel={t('exploreInvestigation.sections.traces')}
          messages={props.messages}
          query={{ ...props.panel.query, ...(props.selectedSpanId ? { spanId: props.selectedSpanId } : {}) }}
          outcome={props.panel.outcome}
          runtimeIdentity={props.evidenceIdentity}
          onSpanSelect={select}
        />
        <div className={styles.inspectorSlot} data-investigation-inspector-slot data-open={open && !!selected}>
          {open && selected ? (
            <InvestigationSpanInspector
              onAddSpanFilter={props.evidenceCurrent ? props.onAddSpanFilter : undefined}
              onApplySpanFilters={props.evidenceCurrent ? props.onApplySpanFilters : undefined}
              spanFilterDisabledReason={props.spanFilterDisabledReason}
              spanFilterPending={props.spanFilterPending}
              span={selected}
              spans={spans}
              focusRevision={focusRevision}
              onSelect={select}
              onClose={close}
              onOpenLogs={props.onOpenLogs}
              logsDisabled={!props.evidenceCurrent}
            />
          ) : (
            <aside className={styles.inspectorPlaceholder}>{t('exploreInvestigation.trace.selectSpan')}</aside>
          )}
        </div>
      </div>
    </div>
  );
}

export function TraceSummary({
  detail,
  partial = false,
  compact
}: {
  detail: GanttPanel['outcome']['data'];
  partial?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const duration = detail.durationNanos == null ? undefined : investigationDurationNanoToMillis(detail.durationNanos);
  const operation =
    detail.rootSpanName ?? detail.representativeSpan?.spanName ?? t('explore.perses.traceTable.unnamedSpan');
  return (
    <div className={styles.traceSummary} data-compact={compact}>
      <strong title={operation}>{operation}</strong>
      <span>
        {t('exploreInvestigation.trace.spanCount')}: {detail.spans?.length ?? 0}
      </span>
      <span>
        {t('exploreInvestigation.trace.duration')}: <span>{formatTraceDuration(duration)}</span>
      </span>
      <span>
        {t('exploreInvestigation.trace.errorCount')}: {detail.errorSpanCount}
      </span>
      <Typography.Text className={styles.traceId ?? ''} copyable={{ text: detail.traceId }}>
        <code title={detail.traceId}>{detail.traceId}</code>
      </Typography.Text>
      <TraceSampleStatus partial={partial} loaded={detail.spans.length} />
      {detail.rootState !== 'unique' || detail.missingParentCount ? (
        <span>
          {t('exploreInvestigation.trace.partialEvidence', {
            roots: detail.rootSpanCount,
            missing: detail.missingParentCount
          })}
        </span>
      ) : null}
    </div>
  );
}

function TraceSampleStatus({ partial, loaded }: { partial: boolean; loaded: number }) {
  const { t } = useTranslation();
  const capped = loaded >= LOADED_SPAN_LIMIT;
  if (!partial && !capped) return null;
  return (
    <Typography.Text type="warning" role="note">
      {t('exploreInvestigation.trace.operationStatistics.' + (capped ? 'capped' : 'partial'))}
    </Typography.Text>
  );
}

export function TraceSpanAttributes({
  detail,
  selectedSpanId
}: {
  detail: GanttPanel['outcome']['data'];
  selectedSpanId?: string | undefined;
}) {
  const { t } = useTranslation();
  const selected = detail.spans?.find(span => span.spanId === selectedSpanId);
  if (!selected) return <p>{t('exploreInvestigation.trace.selectSpan')}</p>;
  return (
    <section aria-label={t('exploreInvestigation.trace.spanInspector')}>
      <h3>{selected.spanName ?? t('explore.perses.traceTable.unnamedSpan')}</h3>
      <SpanAttributeDetails span={selected} />
    </section>
  );
}

function useInspectorControls(props: Props) {
  const [open, setOpen] = useState(props.inspectorInitiallyOpen ?? false);
  const [focusRevision, setFocusRevision] = useState(0);
  const trigger = useRef<HTMLElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const restoreRequested = useRef(false);
  useEffect(() => {
    if (open || !restoreRequested.current) return;
    restoreRequested.current = false;
    const fallback = container.current?.querySelector<HTMLElement>(`[data-span-trigger="${props.selectedSpanId}"]`);
    (trigger.current?.isConnected ? trigger.current : fallback)?.focus();
  }, [open, props.selectedSpanId]);
  const select = (spanId: string | undefined) => {
    if (!spanId) return;
    if (document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute('data-span-trigger')) {
      trigger.current = document.activeElement;
      setFocusRevision(value => value + 1);
    }
    setOpen(true);
    props.onSelectSpan(spanId);
  };
  const close = () => {
    restoreRequested.current = true;
    setOpen(false);
  };
  return { open, focusRevision, container, select, close };
}
