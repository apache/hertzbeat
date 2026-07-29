/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
