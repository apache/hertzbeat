/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0. */

import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { TraceInvestigationViewState } from '../model/explore-investigation-contract';
import { TraceSummary } from './explore-investigation-trace-primary';
import { InvestigationContextBand } from './explore-investigation-view-primitives';
import styles from './explore-trace-detail-context.module.css';

type Props = {
  state: Extract<TraceInvestigationViewState, { kind: 'ready' }>;
  onBack: () => void;
  onRefresh: () => void;
};

export function ExploreTraceDetailContext({ state, onBack, onRefresh }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const detail = state.perses.gantt?.outcome;
  const selectedId = state.route.spanId ?? state.snapshot.selectedSpanId;
  const selected = state.snapshot.gantt.detail?.spans.find(span => span.spanId === selectedId);
  useLayoutEffect(() => {
    const context = ref.current;
    const workspace = context?.closest<HTMLElement>('[data-trace-presentation="drawer"]');
    if (!context || !workspace) return;
    const measure = () => workspace.style.setProperty('--trace-context-height', `${context.offsetHeight}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(context);
    measure();
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={styles.context} data-trace-detail-context>
      <InvestigationContextBand window={state.route.window} onBack={onBack} onRefresh={onRefresh} />
      {detail?.state === 'ready' ? (
        <TraceSummary detail={detail.data} partial={detail.truncated === true} compact />
      ) : (
        <code title={state.snapshot.traceId}>{state.snapshot.traceId}</code>
      )}
      <div className={styles.selection} data-trace-selected-identity>
        <strong title={selected?.spanName ?? undefined}>
          {selected?.spanName ?? t('exploreInvestigation.trace.selectSpan')}
        </strong>
        {selectedId && <code title={selectedId}>{selectedId}</code>}
      </div>
    </div>
  );
}
