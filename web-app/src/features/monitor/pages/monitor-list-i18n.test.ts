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

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Monitor list locale coverage', () => {
  it('provides the label filter copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.labels.filter).toBeTruthy();
      expect(locale.monitor.export.all).toBeTruthy();
      expect(locale.monitor.export.selected).toBeTruthy();
      expect(locale.monitor.export.success).toBeTruthy();
      expect(locale.monitor.export.failure.forbidden).toBeTruthy();
      expect(locale.monitor.export.failure.unavailable).toBeTruthy();
      expect(locale.monitor.export.failure.error).toBeTruthy();
      expect(locale.monitor.import.action).toBeTruthy();
      expect(locale.monitor.import.title).toBeTruthy();
      expect(locale.monitor.import.validation.unsupported).toBeTruthy();
      expect(locale.monitor.import.failure.forbidden).toBeTruthy();
      expect(locale.monitor.import.failure.unavailable).toBeTruthy();
      expect(locale.monitor.import.failure.error).toBeTruthy();
      expect(locale.monitorMetrics.autoRefresh.label).toBeTruthy();
      expect(locale.monitorMetrics.autoRefresh.seconds).toBeTruthy();
      expect(locale.monitorMetrics.autoRefresh.off).toBeTruthy();
      expect(locale.monitorMetrics.favorites).toBeTruthy();
      expect(locale.monitorMetrics.favoriteEmpty).toBeTruthy();
      expect(locale.monitorMetrics.favoriteSelect).toBeTruthy();
      expect(locale.monitorMetrics.favoriteUnavailable).toBeTruthy();
      expect(locale.monitor.grafana.title).toBeTruthy();
      expect(locale.monitor.grafana.delete).toBeTruthy();
      expect(locale.monitor.grafana.deleteConfirm).toBeTruthy();
      expect(locale.monitor.grafana.deleteFailure).toBeTruthy();
      expect(locale.monitor.grafana.cleanupFailure).toBeTruthy();
      expect(locale.monitorActions.rowEnableConfirm).toBeTruthy();
      expect(locale.monitorActions.rowPauseConfirm).toBeTruthy();
      expect(locale.monitorActions.selectedEnableConfirm_one).toBeTruthy();
      expect(locale.monitorActions.selectedEnableConfirm_other).toBeTruthy();
      expect(locale.monitorActions.selectedPauseConfirm_one).toBeTruthy();
      expect(locale.monitorActions.selectedPauseConfirm_other).toBeTruthy();
      expect(locale.monitorActions.clearSelection).toBeTruthy();
      expect(locale.monitor.help).toBeTruthy();
      expect(locale.monitor.copyEndpoint).toBeTruthy();
      expect(locale.monitor.copyEndpointSuccess).toBeTruthy();
      expect(locale.monitor.copyEndpointFailure).toBeTruthy();
      expect(Object.keys(locale.monitor.categories).sort()).toEqual([
        'bigdata',
        'cache',
        'cn',
        'custom',
        'db',
        'llm',
        'mid',
        'network',
        'os',
        'program',
        'server',
        'service',
        'webserver'
      ]);
      expect(Object.values(locale.monitor.categories).every(Boolean)).toBe(true);
      expect(locale.monitor.editor.grafanaImport).toBeTruthy();
      expect(locale.monitor.editor.grafanaImportSuccess).toBeTruthy();
      expect(locale.monitor.editor.grafanaImportFailure).toBeTruthy();
    }
  });
});
