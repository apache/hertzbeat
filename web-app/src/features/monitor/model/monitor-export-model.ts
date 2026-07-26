/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { safeDownloadFilename, type BrowserDownloadArtifact } from '@/shared/browser-download';

export const monitorExportFormats = ['JSON', 'EXCEL'] as const;

export type MonitorExportFormat = (typeof monitorExportFormats)[number];
export type MonitorExportScope = { kind: 'selected'; ids: number[] } | { kind: 'all' };
export type MonitorExportArtifact = BrowserDownloadArtifact;

const monitorExportFallbackNames: Record<MonitorExportFormat, string> = {
  JSON: 'hertzbeat-monitors.json',
  EXCEL: 'hertzbeat-monitors.xlsx'
};

export function monitorExportFilename(contentDisposition: string | null, format: MonitorExportFormat) {
  return safeDownloadFilename(contentDisposition, monitorExportFallbackNames[format]);
}
