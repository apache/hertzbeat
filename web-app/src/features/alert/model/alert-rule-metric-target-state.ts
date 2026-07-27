/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorAppHierarchyNode } from '@/features/monitor';

type AlertRuleMetricTargetFailure = 'unavailable' | 'error';

type AlertRuleMetricTargetApplication = {
  category?: string;
  label: string | null;
  value: string;
};

export type TargetApplicationsState =
  | { kind: 'idle' | 'loading' }
  | { kind: AlertRuleMetricTargetFailure }
  | { kind: 'ready'; apps: AlertRuleMetricTargetApplication[] };

export type TargetHierarchyState =
  | { kind: 'idle' | 'loading' }
  | { kind: AlertRuleMetricTargetFailure }
  | { kind: 'ready'; hierarchy: MonitorAppHierarchyNode };

export type AlertRuleMetricTargetState = {
  apps: TargetApplicationsState;
  hierarchy: TargetHierarchyState;
};
