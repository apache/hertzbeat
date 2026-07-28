/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { safeDownloadFilename, type BrowserDownloadArtifact } from '@/shared/browser-download';

export const alertRuleExportFormats = ['JSON', 'EXCEL', 'YAML'] as const;

export type AlertRuleExportFormat = (typeof alertRuleExportFormats)[number];
export type AlertRuleExportArtifact = BrowserDownloadArtifact;

const fallbackNames: Record<AlertRuleExportFormat, string> = {
  JSON: 'hertzbeat-alert-rules.json',
  EXCEL: 'hertzbeat-alert-rules.xlsx',
  YAML: 'hertzbeat-alert-rules.yaml'
};

export function alertRuleExportFilename(contentDisposition: string | null, format: AlertRuleExportFormat) {
  return safeDownloadFilename(contentDisposition, fallbackNames[format]);
}
