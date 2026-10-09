/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ReactNode } from 'react';
import type { HertzBeatPersesPrimitiveMessages } from '@/platform/perses';
import type { DashboardPanelQueryInput } from './dashboard-panel-query';
export type DashboardPanelRuntimeProps = DashboardPanelQueryInput & {
  panelId: string;
  actions?: { retry: () => void; cancel: () => void; cancelled: boolean } | undefined;
  timeZone?: string | undefined;
  refreshRevision: number;
  enabled: boolean;
  messages: HertzBeatPersesPrimitiveMessages & { inactive: ReactNode };
  className?: string | undefined;
};
