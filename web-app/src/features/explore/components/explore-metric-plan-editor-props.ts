/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { MetricPlan } from '@/platform/perses';
import type { MetricDiscoveryProps } from './metric-label-discovery';
export type MetricPlanEditorProps = MetricDiscoveryProps & {
  pristine?: boolean | undefined;
  plan: MetricPlan;
  onChange: (plan: MetricPlan) => void;
  activeRef: string;
  onActiveRefChange: (ref: string) => void;
};
