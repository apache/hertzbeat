/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BulletinMetricTreeMetricNode } from './bulletin-metric-tree-model';
import type { BulletinMetricDefinition, BulletinMonitor } from './bulletin-model';

export type BulletinDependencyKind = 'idle' | 'loading' | 'ready' | 'invalid' | 'unavailable' | 'error';
export type BulletinDependencySelection = 'unverified' | 'valid' | 'stale';

export type BulletinApplication = {
  value: string;
  label: string | null;
  hide: boolean | null;
};

/** Authoritative dependency evidence shared by editor presentation and save validation. */
export type BulletinDependencyProof = {
  kind: BulletinDependencyKind;
  fieldSelection: BulletinDependencySelection;
  monitorSelection: BulletinDependencySelection;
  apps: BulletinApplication[];
  monitors: BulletinMonitor[];
  metrics: BulletinMetricDefinition[];
  metricTree: BulletinMetricTreeMetricNode[];
};
