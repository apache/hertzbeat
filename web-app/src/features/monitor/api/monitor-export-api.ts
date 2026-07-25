/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiFetch } from '@/core/http/http-client';

import {
  monitorExportFilename,
  type MonitorExportFormat,
  type MonitorExportScope
} from '../model/monitor-export-model';

export type MonitorExportArtifact = { data: Blob; filename: string };
export type MonitorExportFailureKind = 'forbidden' | 'unavailable' | 'error';

export class MonitorExportError extends Error {
  constructor(readonly kind: MonitorExportFailureKind) {
    super('Monitor export failed');
    this.name = 'MonitorExportError';
  }
}

export async function requestMonitorExport(
  scope: MonitorExportScope,
  format: MonitorExportFormat,
  signal?: AbortSignal
): Promise<MonitorExportArtifact> {
  let response: Response;
  try {
    response = await apiFetch(buildMonitorExportPath(scope, format), { signal });
  } catch {
    throw new MonitorExportError('unavailable');
  }
  if (!response.ok) throw new MonitorExportError(classifyExportStatus(response.status));
  if (isJsonContentType(response.headers.get('Content-Type'))) {
    // Export failures may use an HTTP 200 JSON envelope. Never surface or
    // persist its server-provided body because it can contain private detail.
    throw new MonitorExportError('error');
  }
  let data: Blob;
  try {
    data = await response.blob();
  } catch {
    throw new MonitorExportError('unavailable');
  }
  if (data.size === 0) throw new MonitorExportError('error');
  return {
    data,
    filename: monitorExportFilename(response.headers.get('Content-Disposition'), format)
  };
}

export function buildMonitorExportPath(scope: MonitorExportScope, format: MonitorExportFormat) {
  const params = new URLSearchParams();
  if (scope.kind === 'selected') {
    if (scope.ids.length === 0) throw new Error('Selected monitor export requires ids');
    scope.ids.forEach(id => params.append('ids', String(id)));
  }
  params.set('type', format);
  const endpoint = scope.kind === 'all' ? '/api/monitors/export/all' : '/api/monitors/export';
  return `${endpoint}?${params.toString()}`;
}

function classifyExportStatus(status: number): MonitorExportFailureKind {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 0 || status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'error';
}

function isJsonContentType(value: string | null) {
  const mediaType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType?.endsWith('/json') || mediaType?.endsWith('+json');
}
