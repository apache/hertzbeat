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
  alertIntegrationSourceGroups,
  alertIntegrationIconPath,
  buildAlertIngressContract,
  buildAlertIntegrationTokenSettingsPath,
  canManageAlertIntegrationTokens,
  joinPublicCallbackUrl,
  type AlertIntegrationGuide
} from './alert-integration-model';

describe('alert integration presentation model', () => {
  it('maps only validated backend icon keys through the finite local allowlist', () => {
    expect(alertIntegrationIconPath('hertzbeat')).toBe('/assets/logo.svg');
    expect(alertIntegrationIconPath('prometheus')).toBe('/assets/img/integration/prometheus.svg');
    expect(alertIntegrationIconPath('zabbix')).toBe('/assets/img/integration/zabbix.svg');
  });

  it('groups sources by honest readiness without changing backend order inside each group', () => {
    const verification = { status: 'unverified' as const, startedAt: null, verifiedAt: null };
    const sources = [
      { ...guide, source: 'webhook', readiness: 'ready' as const, verification },
      { ...guide, source: 'skywalking', readiness: 'configuration_required' as const, verification },
      { ...guide, source: 'zabbix', readiness: 'ready' as const, verification },
      { ...guide, source: 'blocked', readiness: 'guide_blocked' as const, verification }
    ];

    expect(alertIntegrationSourceGroups(sources)).toEqual([
      { readiness: 'ready', sources: [sources[0], sources[2]] },
      { readiness: 'configuration_required', sources: [sources[1]] },
      { readiness: 'guide_blocked', sources: [sources[3]] }
    ]);
  });

  it('keeps the backend ingress path without guessing a public host from the browser', () => {
    expect(buildAlertIngressContract(guide)).toEqual({
      endpoint: '/api/alerts/report',
      ingressPath: '/api/alerts/report',
      publicBaseUrlConfigured: false,
      requestHeaders: 'Content-Type: application/json\nAuthorization: Bearer {token}'
    });
  });

  it('joins the configured public base URL without losing a reverse-proxy base path', () => {
    expect(joinPublicCallbackUrl('https://hertzbeat.example.test/ops', '/api/alerts/report')).toBe(
      'https://hertzbeat.example.test/ops/api/alerts/report'
    );
    expect(buildAlertIngressContract(guide, 'https://hertzbeat.example.test/ops/')).toMatchObject({
      endpoint: 'https://hertzbeat.example.test/ops/api/alerts/report',
      ingressPath: '/api/alerts/report',
      publicBaseUrlConfigured: true
    });
  });

  it('renders vendor-native managed-token headers without inventing bearer support', () => {
    expect(
      buildAlertIngressContract({
        ...guide,
        source: 'huaweicloud-ces',
        requiredHeaders: { 'X-HertzBeat-Token': '{token}' }
      }).requestHeaders
    ).toBe('Content-Type: application/json\nX-HertzBeat-Token: {token}');
    expect(
      buildAlertIngressContract({ ...guide, source: 'volcengine', requiredHeaders: { Token: '{token}' } })
        .requestHeaders
    ).toBe('Content-Type: application/json\nToken: {token}');
  });

  it('hands token generation the API writer scope and exact integration return context', () => {
    const path = buildAlertIntegrationTokenSettingsPath('alertmanager');
    const url = new URL(path, 'https://hertzbeat.local');

    expect(url.pathname).toBe('/settings/tokens');
    expect(url.searchParams.get('scope')).toBe('api-admin');
    expect(url.searchParams.get('returnTo')).toBe('/alerts/integrations/alertmanager');
  });

  it('keeps token management administrative while every role may read a guide', () => {
    expect(canManageAlertIntegrationTokens(['ADMIN'])).toBe(true);
    expect(canManageAlertIntegrationTokens(['USER'])).toBe(false);
    expect(canManageAlertIntegrationTokens(['GUEST'])).toBe(false);
    expect(canManageAlertIntegrationTokens([])).toBe(false);
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

  it('keeps the Chinese alert integration workflow localized instead of falling back to English', () => {
    [...alertIntegrationUiKeys, ...zhCnInstructionKeys].forEach(key => {
      const value = readLocaleKey(zhCN, key);
      expect(value, key).toEqual(expect.any(String));
      expect(value, key).toMatch(/\p{Script=Han}/u);
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
  'alert.integration.limit.huaweicloud-ces.confirmation_may_be_billable',
  'alert.integration.limit.volcengine.event_recovery_unavailable',
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
  'alert.integration.skywalking.step.create_token',
  'alert.integration.skywalking.step.configure_webhook',
  'alert.integration.skywalking.step.verify_lifecycle',
  'alert.integration.uptime-kuma.step.create_token',
  'alert.integration.uptime-kuma.step.configure_webhook',
  'alert.integration.uptime-kuma.step.verify_lifecycle',
  'alert.integration.tencent.step.create_token',
  'alert.integration.tencent.step.configure_template',
  'alert.integration.tencent.step.verify_lifecycle',
  'alert.integration.alibabacloud-sls.step.create_token',
  'alert.integration.alibabacloud-sls.step.configure_action',
  'alert.integration.alibabacloud-sls.step.verify_lifecycle',
  'alert.integration.huaweicloud-ces.step.create_token',
  'alert.integration.huaweicloud-ces.step.configure_subscription',
  'alert.integration.huaweicloud-ces.step.verify_subscription',
  'alert.integration.volcengine.step.create_token',
  'alert.integration.volcengine.step.configure_callback',
  'alert.integration.volcengine.step.verify_lifecycle',
  'alert.integration.zabbix.step.create_token',
  'alert.integration.zabbix.step.configure_media_type',
  'alert.integration.zabbix.step.verify_problem_and_recovery'
];

const alertIntegrationUiKeys = [
  'alertIntegrations.states.loading',
  'alertIntegrations.states.permission',
  'alertIntegrations.states.unavailable',
  'alertIntegrations.states.contract',
  'alertIntegrations.states.error',
  'alertIntegrations.states.not-found',
  'alertIntegrations.readiness.configuration_required',
  'alertIntegrations.readiness.guide_blocked',
  'alertIntegrations.menu',
  'alertIntegrations.description',
  'alertIntegrations.sourcesLabel',
  'alertIntegrations.sourceGroups.ready',
  'alertIntegrations.sourceGroups.configuration_required',
  'alertIntegrations.sourceGroups.guide_blocked',
  'alertIntegrations.payloadShape',
  'alertIntegrations.endpoint',
  'alertIntegrations.requestHeaders',
  'alertIntegrations.generateToken',
  'alertIntegrations.dataFlow',
  'alertIntegrations.endpointConfiguredHint',
  'alertIntegrations.endpointRelativeHint',
  'alertIntegrations.requiredFields',
  'alertIntegrations.steps',
  'alertIntegrations.snippets',
  'alertIntegrations.limitations',
  'alertIntegrations.copy',
  'alertIntegrations.copied',
  'alertIntegrations.copyFailed',
  'alertIntegrations.workspace.prepare',
  'alertIntegrations.workspace.configure',
  'alertIntegrations.workspace.verify',
  'alertIntegrations.verification.unverified',
  'alertIntegrations.verification.unverifiedHint',
  'alertIntegrations.verification.waiting',
  'alertIntegrations.verification.waitingHint',
  'alertIntegrations.verification.verified',
  'alertIntegrations.verification.verifiedHint',
  'alertIntegrations.verification.start',
  'alertIntegrations.verification.restart',
  'alertIntegrations.verification.starting',
  'alertIntegrations.verification.startFailed',
  'alertIntegrations.verification.verifiedRail',
  'alertIntegrations.zabbix.parameters',
  'alertIntegrations.zabbix.script'
];

const zhCnInstructionKeys = backendLocaleKeys.filter(key => !key.startsWith('alert.integration.source.'));

function readLocaleKey(locale: object, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (value, segment) =>
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[segment] : undefined,
      locale
    );
}
