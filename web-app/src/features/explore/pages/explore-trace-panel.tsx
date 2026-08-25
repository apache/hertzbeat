/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePublishShellInvestigation } from '@/shared/investigation';
import { useSharedTimeOptional } from '@/shared/time';

import { ExploreResultFrame } from '../components/explore-state-panel';
import { TraceResult } from '../components/trace-result';
import { useTraceDetailController } from '../controller/use-trace-detail-controller';
import { materializeTraceInvestigation } from '../model/explore-agent-handoff';
import type { TraceExploreQuery } from '../model/explore-model';
import type { ExplorePageResult, TraceRow } from '../model/explore-signal-contract';

export function ExploreTracePanel({
  data,
  query,
  openPath,
  evidenceCurrent
}: {
  data: ExplorePageResult<TraceRow>;
  query: TraceExploreQuery;
  openPath: (path: string) => void;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  const trace = useTraceDetailController(query, openPath, evidenceCurrent);
  const sharedTime = useSharedTimeOptional();
  const readyTraceId = trace.state.kind === 'ready' ? trace.state.detail.traceId : undefined;
  const readySpanId = trace.state.kind === 'ready' ? trace.state.selected?.spanId : undefined;
  const investigation = useMemo(
    () =>
      materializeTraceInvestigation(
        query,
        readyTraceId ? { traceId: readyTraceId, spanId: readySpanId ?? undefined } : undefined,
        sharedTime?.window
      ),
    [query, readySpanId, readyTraceId, sharedTime?.window]
  );
  usePublishShellInvestigation(investigation);
  return (
    <ExploreResultFrame>
      <TraceResult data={data} t={t} trace={trace} evidenceCurrent={evidenceCurrent} />
    </ExploreResultFrame>
  );
}
