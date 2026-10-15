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

import { buildBulletinMetricTree } from '../model/bulletin-metric-tree-model';
import { BulletinMonitorPaginationProof, bulletinMonitorProofPolicy } from '../model/bulletin-dependency-policy';
import { loadMonitorAppHierarchy, loadMonitorApps, loadMonitors, type Monitor } from '@/features/monitor';
import type { SupportedLocale } from '@/core/i18n/i18n';

export function loadBulletinApps(locale: SupportedLocale, signal?: AbortSignal) {
  return loadMonitorApps(locale, signal);
}

export async function loadBulletinMetricTree(app: string, locale: string, signal: AbortSignal) {
  return buildBulletinMetricTree(await loadMonitorAppHierarchy(app, locale, signal));
}

export async function loadAllBulletinMonitors(app: string, signal?: AbortSignal): Promise<Monitor[]> {
  if (!app) return [];
  const proof = new BulletinMonitorPaginationProof();
  let pageIndex = 0;
  do {
    const page = await loadMonitors(
      {
        search: '',
        app,
        status: bulletinMonitorProofPolicy.status,
        labels: '',
        sort: null,
        order: null,
        pageIndex,
        pageSize: bulletinMonitorProofPolicy.pageSize
      },
      signal
    );
    proof.accept(page, pageIndex);
    pageIndex += 1;
  } while (pageIndex < proof.totalPages);
  return proof.finish();
}
