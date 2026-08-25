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
import { LogResult } from '../components/log-result';
import { materializeLogInvestigation } from '../model/explore-agent-handoff';
import type { LogExploreQuery } from '../model/explore-model';
import type { LogHistoryEvidence } from '../model/explore-signal-contract';

export function ExploreLogPanel({
  data,
  statistics,
  query,
  openPath,
  evidenceCurrent
}: {
  data: LogHistoryEvidence['page'];
  statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
  query: LogExploreQuery;
  openPath: (path: string) => void;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  const sharedTime = useSharedTimeOptional();
  const evidence = useMemo(
    () =>
      evidenceCurrent
        ? {
            totalElements: data.totalElements,
            number: data.number,
            size: data.size,
            contentCount: data.content.length
          }
        : undefined,
    [data.content.length, data.number, data.size, data.totalElements, evidenceCurrent]
  );
  const investigation = useMemo(
    () => materializeLogInvestigation(query, evidence, sharedTime?.window),
    [evidence, query, sharedTime?.window]
  );
  usePublishShellInvestigation(investigation);
  return (
    <ExploreResultFrame>
      <LogResult
        data={data}
        statistics={statistics}
        query={query}
        t={t}
        navigate={openPath}
        evidenceCurrent={evidenceCurrent}
      />
    </ExploreResultFrame>
  );
}
