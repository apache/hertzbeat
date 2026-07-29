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

import {
  AlertIntegrationContractError,
  parseAlertIntegrationCatalog,
  parseAlertIntegrationGuide
} from './alert-integration-schema';

const catalog = {
  items: [
    {
      source: 'webhook',
      displayNameKey: 'alert.integration.source.webhook',
      iconKey: 'hertzbeat',
      readiness: 'ready',
      limitations: []
    },
    {
      source: 'zabbix',
      displayNameKey: 'alert.integration.source.zabbix',
      iconKey: 'zabbix',
      readiness: 'guide_blocked',
      limitations: [
        'alert.integration.limit.zabbix.authorization_missing',
        'alert.integration.limit.zabbix.response_contract_mismatch',
        'alert.integration.limit.zabbix.recovery_time_semantics'
      ]
    }
  ]
};

const guide = {
  source: 'webhook',
  displayNameKey: 'alert.integration.source.webhook',
  iconKey: 'hertzbeat',
  method: 'POST',
  ingressPath: '/api/alerts/report',
  payloadShape: 'single_alert',
  requiredHeaders: { Authorization: 'Bearer {token}' },
  requiredFields: ['labels', 'content', 'status', 'startAt'],
  steps: [
    'alert.integration.webhook.step.create_token',
    'alert.integration.webhook.step.configure_request',
    'alert.integration.webhook.step.verify_alert'
  ],
  snippets: ['{"status":"firing"}'],
  acknowledgement: 'alert.integration.ack.accepted_for_processing',
  readiness: 'ready',
  limitations: []
};

describe('alert integration backend contract', () => {
  it('parses exact catalog and detail fixtures from backend commit 4945f457c', () => {
    expect(parseAlertIntegrationCatalog(catalog).items.map(item => item.source)).toEqual(['webhook', 'zabbix']);
    expect(parseAlertIntegrationGuide(guide, 'webhook')).toEqual(guide);
  });

  it('rejects duplicate catalog sources, unknown readiness, and extra fields', () => {
    expect(() => parseAlertIntegrationCatalog({ items: [catalog.items[0], catalog.items[0]] })).toThrow(
      AlertIntegrationContractError
    );
    expect(() =>
      parseAlertIntegrationCatalog({
        items: [{ ...catalog.items[0], readiness: 'healthy' }]
      })
    ).toThrow(AlertIntegrationContractError);
    expect(() =>
      parseAlertIntegrationCatalog({
        items: [{ ...catalog.items[0], fabricated: true }]
      })
    ).toThrow(AlertIntegrationContractError);
    expect(() =>
      parseAlertIntegrationCatalog({
        items: [{ ...catalog.items[0], iconKey: 'unregistered-vendor' }]
      })
    ).toThrow(AlertIntegrationContractError);
    expect(() =>
      parseAlertIntegrationCatalog({
        items: [{ ...catalog.items[0], source: 'webhook/next' }]
      })
    ).toThrow(AlertIntegrationContractError);
    expect(() =>
      parseAlertIntegrationCatalog({
        items: [{ ...catalog.items[0], source: '-webhook' }]
      })
    ).toThrow(AlertIntegrationContractError);
    expect(() => parseAlertIntegrationCatalog({ items: [] })).toThrow(AlertIntegrationContractError);
  });

  it.each([
    ['absolute ingress', { ...guide, ingressPath: 'https://attacker.example/report' }],
    ['protocol-relative ingress', { ...guide, ingressPath: '//attacker.example/report' }],
    ['empty ingress segment', { ...guide, ingressPath: '/api//alerts/report' }],
    ['real bearer value', { ...guide, requiredHeaders: { Authorization: 'Bearer secret-value' } }],
    ['extra field', { ...guide, health: 'ready' }],
    ['wrong source', { ...guide, source: 'prometheus' }]
  ])('rejects unsafe %s detail evidence', (_label, value) => {
    expect(() => parseAlertIntegrationGuide(value, 'webhook')).toThrow(AlertIntegrationContractError);
  });
});
