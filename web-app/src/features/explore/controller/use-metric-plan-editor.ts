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

import { useState } from 'react';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { ExploreQuery } from '../model/explore-query';
import { useMetricLabelSuggestions } from './use-metric-label-suggestions';
import { encodeMetricPlan, metricPlanFromQuery, type MetricPlan } from '@/platform/perses';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { metricMatcherLocks } from '../model/metric-label-matchers';
import { temporalAggregationValue } from '../model/explore-parity-filter-model';

export function useMetricPlanEditor(
  submission: ExploreSubmissionViewModel,
  query?: ExploreQuery,
  window?: ExactTimeWindow
) {
  const [selectedRef, setSelectedRef] = useState('a');
  const [selectedLabel, setSelectedLabel] = useState('');
  const parsed = readPlan(submission);
  const activeRow = parsed?.queries.find(row => row.refId === selectedRef) ?? parsed?.queries[0];
  const scoped = metricDiscoveryScope(query, submission, activeRow);
  const labelKeys = useMetricLabelSuggestions(scoped, window);
  const labelValues = useMetricLabelSuggestions(selectedLabel ? scoped : undefined, window, selectedLabel || undefined);
  if (submission.draft.signal !== 'metrics') return undefined;
  if (!parsed) return { invalid: true as const };
  const plan = parsed;
  const activeRef = plan.queries.some(row => row.refId === selectedRef) ? selectedRef : plan.queries[0]!.refId;
  const onChange = (next: MetricPlan) => submission.updateField({ field: 'metricPlan', value: encodeMetricPlan(next) });
  return {
    invalid: false as const,
    plan,
    pristine: !submission.draft.metricPlan && !submission.draft.query && Object.keys(submission.errors).length === 0,
    activeRef,
    onActiveRefChange: (ref: string) => {
      setSelectedRef(ref);
      if (ref !== activeRef) setSelectedLabel('');
    },
    labelKeys,
    labelValues,
    discoveryIdentity: JSON.stringify([
      activeRef,
      scoped ? { ...scoped, metricFilter: undefined, metricView: undefined } : undefined,
      window
    ]),
    lockedLabels: metricMatcherLocks(scoped),
    selectedLabel,
    onSelectedLabelChange: setSelectedLabel,
    onChange,
    select: (metric: string) =>
      onChange({ ...plan, queries: plan.queries.map(row => (row.refId === activeRef ? { ...row, metric } : row)) })
  };
}

function readPlan(submission: ExploreSubmissionViewModel) {
  const draft = submission.draft;
  if (draft.signal !== 'metrics') return undefined;
  try {
    return metricPlanFromQuery({
      ...draft,
      temporalAggregation: temporalAggregationValue(draft.temporalAggregation),
      step: draft.stepSeconds
    });
  } catch {
    return undefined;
  }
}

function metricDiscoveryScope(
  query: ExploreQuery | undefined,
  submission: ExploreSubmissionViewModel,
  row: MetricPlan['queries'][number] | undefined
) {
  if (query?.signal !== 'metrics' || !row) return undefined;
  const draft = submission.draft;
  return {
    ...query,
    serviceName: draft.serviceName || undefined,
    serviceNamespace: draft.serviceNamespace || undefined,
    environment: draft.environment || undefined,
    instance: draft.instance || undefined,
    endpoint: draft.endpoint || undefined,
    query: row.metric,
    metricFilter: row.metricFilter
  };
}
