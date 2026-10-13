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

import { MetricLabelDiscovery } from './metric-label-discovery';
import { MetricPlanSourceRow } from './explore-metric-plan-source-row';
import type { MetricPlanEditorProps } from './explore-metric-plan-editor-props';

export function MetricPlanQueryRows(props: MetricPlanEditorProps) {
  return props.plan.queries.map(row => (
    <MetricPlanSourceRow
      key={row.refId}
      {...props}
      row={row}
      discoveryControls={row.refId === props.activeRef ? <MetricPlanDiscovery {...props} /> : undefined}
    />
  ));
}
function MetricPlanDiscovery(props: MetricPlanEditorProps) {
  const row = props.plan.queries.find(item => item.refId === props.activeRef);
  if (!row || !props.labelKeys) return null;
  return (
    <MetricLabelDiscovery
      key={props.discoveryIdentity ?? props.activeRef}
      {...props}
      filter={row.metricFilter ?? ''}
      onFilter={metricFilter =>
        props.onChange({
          ...props.plan,
          queries: props.plan.queries.map(item => (item.refId === row.refId ? { ...item, metricFilter } : item))
        })
      }
    />
  );
}
