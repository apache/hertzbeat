/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import detailSource from './use-monitor-detail-controller.ts?raw';
import editorResourceQueriesSource from './use-monitor-editor-resource-queries.ts?raw';
import favoriteMutationSource from './use-monitor-favorite-mutation.ts?raw';
import listSource from './use-monitor-list-controller.ts?raw';
import listCommandsSource from './use-monitor-list-commands.ts?raw';
import metricDataSource from './use-monitor-metric-data.ts?raw';
import metricSource from './use-monitor-metric-workbench-controller.ts?raw';
import { monitorQueryKeys } from './monitor-query-keys';

const listQuery = {
  search: 'checkout',
  app: 'website',
  status: '1',
  labels: 'env:prod',
  pageIndex: 2,
  pageSize: 20
};
const time = { window: { from: 1_000, to: 2_000 }, refreshRevision: 3 };
const historySource = {
  id: 7,
  instance: '127.0.0.1:8080',
  name: 'checkout',
  app: 'website',
  scrape: 'static' as const
};

describe('Monitor Query Key factory', () => {
  it('keeps equivalent resource inputs stable', () => {
    expect(monitorQueryKeys.list(listQuery)).toEqual(monitorQueryKeys.list({ ...listQuery }));
    expect(monitorQueryKeys.apps()).toEqual(monitorQueryKeys.apps());
    expect(monitorQueryKeys.detail(7)).toEqual(monitorQueryKeys.detail(7));
    expect(monitorQueryKeys.collectors()).toEqual(monitorQueryKeys.collectors());
    expect(monitorQueryKeys.appDefines('website')).toEqual(monitorQueryKeys.appDefines('website'));
    expect(monitorQueryKeys.sdDefines('http')).toEqual(monitorQueryKeys.sdDefines('http'));
    expect(monitorQueryKeys.metricCatalog(7, 'website', 'http')).toEqual(
      monitorQueryKeys.metricCatalog(7, 'website', 'http')
    );
    expect(monitorQueryKeys.favorites(7)).toEqual(monitorQueryKeys.favorites(7));
    expect(monitorQueryKeys.realtime(7, 'summary', 'responseTime', time)).toEqual(
      monitorQueryKeys.realtime(7, 'summary', 'responseTime', { ...time, window: { ...time.window } })
    );
    expect(monitorQueryKeys.history(historySource, 'summary.responseTime', '30m', time)).toEqual(
      monitorQueryKeys.history({ ...historySource }, 'summary.responseTime', '30m', {
        ...time,
        window: { ...time.window }
      })
    );
  });

  it('includes every list filter and page input', () => {
    for (const [field, value] of [
      ['search', 'orders'],
      ['app', 'jvm'],
      ['status', '0'],
      ['labels', 'zone:a'],
      ['pageIndex', 3],
      ['pageSize', 50]
    ] as const) {
      expect(monitorQueryKeys.list({ ...listQuery, [field]: value })).not.toEqual(monitorQueryKeys.list(listQuery));
    }
  });

  it('separates editor and metric resources by every result-changing input', () => {
    expect(monitorQueryKeys.detail(8)).not.toEqual(monitorQueryKeys.detail(7));
    expect(monitorQueryKeys.appDefines('jvm')).not.toEqual(monitorQueryKeys.appDefines('website'));
    expect(monitorQueryKeys.sdDefines('ssh')).not.toEqual(monitorQueryKeys.sdDefines('http'));

    const catalog = monitorQueryKeys.metricCatalog(7, 'website', 'http');
    expect(monitorQueryKeys.metricCatalog(8, 'website', 'http')).not.toEqual(catalog);
    expect(monitorQueryKeys.metricCatalog(7, 'jvm', 'http')).not.toEqual(catalog);
    expect(monitorQueryKeys.metricCatalog(7, 'website', 'ssh')).not.toEqual(catalog);
    expect(monitorQueryKeys.favorites(8)).not.toEqual(monitorQueryKeys.favorites(7));
  });

  it('includes metric identity and the shared time window revision', () => {
    const realtime = monitorQueryKeys.realtime(7, 'summary', 'responseTime', time);
    for (const candidate of [
      monitorQueryKeys.realtime(8, 'summary', 'responseTime', time),
      monitorQueryKeys.realtime(7, 'cpu', 'responseTime', time),
      monitorQueryKeys.realtime(7, 'summary', 'max', time),
      monitorQueryKeys.realtime(7, 'summary', 'responseTime', { ...time, window: { from: 999, to: 2_000 } }),
      monitorQueryKeys.realtime(7, 'summary', 'responseTime', { ...time, window: { from: 1_000, to: 2_001 } }),
      monitorQueryKeys.realtime(7, 'summary', 'responseTime', { ...time, refreshRevision: 4 })
    ])
      expect(candidate).not.toEqual(realtime);

    const history = monitorQueryKeys.history(historySource, 'summary.responseTime', '30m', time);
    for (const candidate of [
      monitorQueryKeys.history({ ...historySource, id: 8 }, 'summary.responseTime', '30m', time),
      monitorQueryKeys.history({ ...historySource, instance: '127.0.0.1:9090' }, 'summary.responseTime', '30m', time),
      monitorQueryKeys.history({ ...historySource, name: 'orders' }, 'summary.responseTime', '30m', time),
      monitorQueryKeys.history({ ...historySource, app: 'prometheus' }, 'summary.responseTime', '30m', time),
      monitorQueryKeys.history({ ...historySource, scrape: 'http_sd' }, 'summary.responseTime', '30m', time),
      monitorQueryKeys.history(historySource, 'summary.max', '30m', time),
      monitorQueryKeys.history(historySource, 'summary.responseTime', '1h', time),
      monitorQueryKeys.history(historySource, 'summary.responseTime', '30m', {
        ...time,
        window: { from: 999, to: 2_000 }
      }),
      monitorQueryKeys.history(historySource, 'summary.responseTime', '30m', { ...time, refreshRevision: 4 })
    ])
      expect(candidate).not.toEqual(history);
  });

  it('owns every production controller key and reuses shared resources', () => {
    for (const source of [
      detailSource,
      editorResourceQueriesSource,
      favoriteMutationSource,
      listSource,
      metricDataSource,
      metricSource
    ]) {
      expect(source).toContain("from './monitor-query-keys'");
      expect(source).not.toMatch(/queryKey:\s*\[/);
      expect(source).not.toMatch(/\b(?:const|function)\s+(?:monitorKey|monitorSharedTimeKey|\w+QueryKey)\b/);
    }
    expect(detailSource).toContain('monitorQueryKeys.detail(id)');
    expect(editorResourceQueriesSource).toContain('monitorQueryKeys.detail(input.id)');
    expect(listSource).toContain('monitorQueryKeys.apps()');
    expect(editorResourceQueriesSource).toContain('monitorQueryKeys.apps()');
    expect(metricDataSource).toContain('queryKey: monitorQueryKeys.favorites(monitor?.id)');
    expect(favoriteMutationSource).toContain('setQueryData(monitorQueryKeys.favorites(operation.monitorId)');
  });

  it('retires operation ownership before later layout work can publish stale completion', () => {
    for (const source of [favoriteMutationSource, listCommandsSource]) {
      expect(source).toContain('useLayoutEffect');
      expect(source).not.toMatch(/\buseEffect\s*\(/);
    }
  });
});
