/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { HertzBeatDashboardDocument } from '@/platform/perses';
import type { SignalDashboardRecord } from './signal-dashboard-record';

export type DashboardEditor = {
  mode: 'new' | 'edit' | 'copy' | 'import' | 'upgrade' | 'append';
  document: HertzBeatDashboardDocument;
  original?: SignalDashboardRecord | undefined;
};
export type DashboardEditorState = {
  draft: DashboardEditor | undefined;
  busy: boolean;
  error: 'writeFailed' | 'conflict' | 'invalidDocument' | undefined;
};
