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

import enUS from '@/assets/i18n/en-us.json';
import jaJP from '@/assets/i18n/ja-jp.json';
import ptBR from '@/assets/i18n/pt-br.json';
import zhCN from '@/assets/i18n/zh-cn.json';
import zhTW from '@/assets/i18n/zh-tw.json';

import {
  alertIntegrationIconPath,
  buildAlertIngressContract,
  buildAlertIntegrationTokenSettingsPath,
  type AlertIntegrationGuide
} from './alert-integration-model';

describe('alert integration presentation model', () => {
  it('maps only validated backend icon keys through the finite local allowlist', () => {
    expect(alertIntegrationIconPath('hertzbeat')).toBe('/assets/logo.svg');
    expect(alertIntegrationIconPath('prometheus')).toBe('/assets/img/integration/prometheus.svg');
    expect(alertIntegrationIconPath('zabbix')).toBe('/assets/img/integration/zabbix.svg');
  });

  it('builds the runnable contract only from current origin and validated backend evidence', () => {
    expect(buildAlertIngressContract('https://hertzbeat.example:9443/path', guide)).toEqual({
      endpoint: 'https://hertzbeat.example:9443/api/alerts/report',
      authorizationHeader: 'Authorization: Bearer {token}'
    });
  });

  it('hands token generation the API writer scope and exact integration return context', () => {
    const path = buildAlertIntegrationTokenSettingsPath('alertmanager');
    const url = new URL(path, 'https://hertzbeat.local');

    expect(url.pathname).toBe('/settings/tokens');
    expect(url.searchParams.get('scope')).toBe('api-admin');
    expect(url.searchParams.get('returnTo')).toBe('/alerts/integrations/alertmanager');
  });

  it('resolves every backend display, step, acknowledgement, and limitation key in all five locales', () => {
    [enUS, jaJP, ptBR, zhCN, zhTW].forEach(locale => {
      backendLocaleKeys.forEach(key => {
        const value = readLocaleKey(locale, key);
        expect(value, key).toEqual(expect.any(String));
        expect(value).not.toBe(key);
      });
    });
  });
});

const guide: AlertIntegrationGuide = {
  source: 'webhook',
  displayNameKey: 'alert.integration.source.webhook',
  iconKey: 'hertzbeat',
  method: 'POST',
  ingressPath: '/api/alerts/report',
  payloadShape: 'single_alert',
  requiredHeaders: { Authorization: 'Bearer {token}' },
  requiredFields: ['labels'],
  steps: ['alert.integration.webhook.step.create_token'],
  snippets: [],
  acknowledgement: 'alert.integration.ack.accepted_for_processing',
  readiness: 'ready',
  limitations: []
};

const backendLocaleKeys = [
  ...[
    'webhook',
    'prometheus',
    'alertmanager',
    'skywalking',
    'uptime-kuma',
    'zabbix',
    'tencent',
    'alibabacloud-sls',
    'huaweicloud-ces',
    'volcengine'
  ].map(source => `alert.integration.source.${source}`),
  'alert.integration.ack.accepted_for_processing',
  'alert.integration.limit.bearer_configuration_required',
  'alert.integration.limit.zabbix.authorization_missing',
  'alert.integration.limit.zabbix.response_contract_mismatch',
  'alert.integration.limit.zabbix.recovery_time_semantics',
  'alert.integration.step.configure_bearer_capable_callback',
  'alert.integration.webhook.step.create_token',
  'alert.integration.webhook.step.configure_request',
  'alert.integration.webhook.step.verify_alert',
  'alert.integration.prometheus.step.create_token',
  'alert.integration.prometheus.step.configure_alertmanager_target',
  'alert.integration.prometheus.step.verify_alert',
  'alert.integration.alertmanager.step.create_token',
  'alert.integration.alertmanager.step.configure_webhook',
  'alert.integration.alertmanager.step.verify_alert',
  'alert.integration.zabbix.step.correct_guide_required'
];

function readLocaleKey(locale: object, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (value, segment) =>
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[segment] : undefined,
      locale
    );
}
