/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type DashboardCountEvidence =
  { kind: 'loading' | 'permission' | 'unavailable' | 'error' } | { kind: 'ready'; count: number };

export type DashboardActivityModel = {
  monitors: DashboardCountEvidence;
  alerts: DashboardCountEvidence;
  services: DashboardCountEvidence;
  firstUse: boolean;
  refreshing: boolean;
  refresh: () => Promise<unknown>;
  targets: { monitors: string; alerts: string; services: string; signals: string };
};
