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

export type PersonalLayoutRequest = {
  expectedRevision: string;
  schemaVersion: 1;
  mode: 'auto' | 'custom';
  columns: 12;
  items: { group: string; x: number; y: number; w: number; h: number; collapsed: boolean; order: number }[];
  historyDock: { collapsed: boolean; height: number };
};
export type AgentPersonalWorkspacePreview = {
  kind: 'FAVORITE' | 'LAYOUT';
  monitorId: string | null;
  application: string | null;
  metricsName: string | null;
  favorite: boolean | null;
  expectedRevision: string | null;
  request: PersonalLayoutRequest | null;
};

function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function keys(v: Record<string, unknown>, list: string[]) {
  return Object.keys(v).length === list.length && Object.keys(v).every(k => list.includes(k));
}
function integer(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
}
function revision(v: unknown) {
  return (
    typeof v === 'string' &&
    (v === 'missing' || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v))
  );
}
function dock(v: unknown) {
  return record(v) && keys(v, ['collapsed', 'height']) && typeof v.collapsed === 'boolean' && integer(v.height, 8, 20);
}
function itemIdentity(v: Record<string, unknown>) {
  return (
    keys(v, ['group', 'x', 'y', 'w', 'h', 'collapsed', 'order']) &&
    typeof v.group === 'string' &&
    /^[A-Za-z0-9_.:-]{1,128}$/.test(v.group) &&
    typeof v.collapsed === 'boolean' &&
    integer(v.order, 0, 127)
  );
}
function itemGeometry(v: Record<string, unknown>) {
  return (
    integer(v.x, 0, 12) &&
    integer(v.y, 0, 999) &&
    integer(v.w, 4, 12) &&
    [4, 6, 8, 12].includes(v.w) &&
    v.x + v.w <= 12 &&
    integer(v.h, v.collapsed ? 4 : 8, 24)
  );
}
function item(v: unknown): v is PersonalLayoutRequest['items'][number] {
  return record(v) && itemIdentity(v) && itemGeometry(v);
}
function overlap(a: PersonalLayoutRequest['items'][number], b: PersonalLayoutRequest['items'][number]) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function items(v: unknown) {
  if (!Array.isArray(v) || v.length > 128 || !v.every(item)) return false;
  if (new Set(v.map(x => x.group)).size !== v.length || new Set(v.map(x => x.order)).size !== v.length) return false;
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++) {
      if (overlap(v[i]!, v[j]!)) return false;
    }
  return true;
}
export function isPersonalLayoutRequest(v: unknown): v is PersonalLayoutRequest {
  return (
    record(v) &&
    keys(v, ['expectedRevision', 'schemaVersion', 'mode', 'columns', 'items', 'historyDock']) &&
    revision(v.expectedRevision) &&
    v.schemaVersion === 1 &&
    v.columns === 12 &&
    ['auto', 'custom'].includes(String(v.mode)) &&
    dock(v.historyDock) &&
    items(v.items)
  );
}
function favorite(v: Record<string, unknown>) {
  return (
    typeof v.monitorId === 'string' &&
    /^[1-9][0-9]{0,18}$/.test(v.monitorId) &&
    typeof v.metricsName === 'string' &&
    /^[A-Za-z0-9_.:-]{1,100}$/.test(v.metricsName) &&
    typeof v.favorite === 'boolean' &&
    v.application === null &&
    v.expectedRevision === null &&
    v.request === null
  );
}
function layout(v: Record<string, unknown>) {
  if (
    v.monitorId !== null ||
    v.metricsName !== null ||
    v.favorite !== null ||
    typeof v.application !== 'string' ||
    !/^[a-z0-9_.:-]{1,128}$/.test(v.application) ||
    !revision(v.expectedRevision)
  )
    return false;
  if (v.request === null) return v.expectedRevision !== 'missing';
  return isPersonalLayoutRequest(v.request) && v.request.expectedRevision === v.expectedRevision;
}
export function isAgentPersonalWorkspacePreview(v: unknown): v is AgentPersonalWorkspacePreview {
  if (
    !record(v) ||
    !keys(v, ['kind', 'monitorId', 'application', 'metricsName', 'favorite', 'expectedRevision', 'request'])
  )
    return false;
  if (v.kind === 'FAVORITE') return favorite(v);
  return v.kind === 'LAYOUT' && layout(v);
}
