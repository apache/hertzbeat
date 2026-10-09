/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { saveBrowserDownload } from '@/shared/browser-download/browser-download';
import type { SignalDashboardRecord } from './signal-dashboard-record';
export function exportDashboardRecord(record: SignalDashboardRecord) {
  saveBrowserDownload({
    data: new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }),
    filename: `dashboard-original-${record.dashboardKey}.json`
  });
}
