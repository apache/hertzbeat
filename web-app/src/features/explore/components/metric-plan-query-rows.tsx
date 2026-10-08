/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
