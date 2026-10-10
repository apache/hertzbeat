/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';

export const SIGNAL_DASHBOARD_VERSION = 'hertzbeat-perses-v1';
export const dashboardKeySchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/u);
export const dashboardRevisionSchema = z.number().int().nonnegative().safe();
export const signalDashboardRecordSchema = z
  .object({
    id: z.number().int().positive().safe().optional(),
    dashboardKey: dashboardKeySchema,
    title: z.string(),
    description: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    layout: z.string().nullable().optional(),
    widgets: z.string().nullable().optional(),
    variables: z.string().nullable().optional(),
    panelMap: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    document: z.unknown().optional(),
    revision: dashboardRevisionSchema.nullable().optional(),
    createTime: z.string().nullable().optional(),
    updateTime: z.string().nullable().optional()
  })
  .passthrough();
export type SignalDashboardRecord = z.infer<typeof signalDashboardRecordSchema>;

type DashboardRead =
  | { kind: 'document'; original: SignalDashboardRecord; document: HertzBeatDashboardDocument }
  | { kind: 'legacy'; original: SignalDashboardRecord; document: HertzBeatDashboardDocument | undefined }
  | { kind: 'unavailable'; original: SignalDashboardRecord; reason: 'unsupportedDocument' };

export function readSignalDashboard(original: SignalDashboardRecord): DashboardRead {
  if (original.document == null) return { kind: 'legacy', original, document: convertEmptyLegacy(original) };
  try {
    const document = parseHertzBeatDashboardDocument(original.document);
    if (original.version !== SIGNAL_DASHBOARD_VERSION || document.metadata.name !== original.dashboardKey) {
      throw new Error('Unsupported dashboard identity or version');
    }
    return { kind: 'document', original, document };
  } catch {
    return { kind: 'unavailable', original, reason: 'unsupportedDocument' };
  }
}

function emptyFragment(value: string | null | undefined, shape: 'array' | 'object', required = false): boolean {
  if (value == null) return !required;
  try {
    const parsed: unknown = JSON.parse(value);
    return shape === 'array'
      ? Array.isArray(parsed) && parsed.length === 0
      : !!parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0;
  } catch {
    return false;
  }
}

function convertEmptyLegacy(record: SignalDashboardRecord): HertzBeatDashboardDocument | undefined {
  if (
    record.version !== 'v1' ||
    !emptyFragment(record.layout, 'array', true) ||
    !emptyFragment(record.widgets, 'array', true) ||
    !emptyFragment(record.variables, 'array') ||
    !emptyFragment(record.panelMap, 'object')
  )
    return undefined;
  const tags = record.tags ? record.tags.split(',') : [];
  if (tags.join(',') !== (record.tags ?? '')) return undefined;
  try {
    return parseHertzBeatDashboardDocument({
      kind: 'Dashboard',
      metadata: { name: record.dashboardKey, project: 'hertzbeat', ...(tags.length ? { tags } : {}) },
      spec: {
        display: { name: record.title, ...(record.description == null ? {} : { description: record.description }) },
        duration: '30m',
        variables: [],
        panels: {},
        layouts: [{ kind: 'Grid', spec: { items: [] } }]
      }
    });
  } catch {
    return undefined;
  }
}
