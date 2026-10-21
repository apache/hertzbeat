/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { MetricView } from '@/platform/perses';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import { MetricResult } from '../components/metric-result';
import { buildCrossSignalPath, mergeExploreQuery, querySubmissionTimePatch } from '../model/explore-model';
import type { MetricExploreQuery } from '../model/explore-query';
import type { ExploreCurrentResultState } from '../model/explore-result-model';

type Props = {
  query: MetricExploreQuery;
  result: Extract<ExploreCurrentResultState, { kind: 'metric' }>;
  retry: () => Promise<void>;
  openPath: (path: string) => void;
  evidenceCurrent: boolean;
  onViewChange?: ((view: MetricView) => void) | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};

export function ExploreMetricResult({
  query,
  result,
  retry,
  openPath,
  evidenceCurrent,
  onTimeWindowChange,
  onViewChange
}: Props) {
  const { t } = useTranslation();
  const canOpenLogs = evidenceCurrent && (query.serviceName || query.entityId);
  const openLogs = () =>
    openPath(
      buildCrossSignalPath(mergeExploreQuery(query, querySubmissionTimePatch(query, result.window)), 'logs', {})
    );
  return (
    <MetricResult
      data={result.data}
      state={result.state}
      retry={retry}
      t={t}
      query={query}
      timeWindow={result.window}
      revision={result.revision}
      onTimeWindowChange={evidenceCurrent ? onTimeWindowChange : undefined}
      onOpenLogs={canOpenLogs ? openLogs : undefined}
      onViewChange={onViewChange}
    />
  );
}
