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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet: http.apiMessageGet
}));

import { loadAlertIntegrationCatalog, loadAlertIntegrationGuide } from './alert-integration-api';

describe('alert integration API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the catalog with only the AbortSignal request option', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue({ items: [catalogItem] });

    await expect(loadAlertIntegrationCatalog(signal)).resolves.toEqual({ items: [catalogItem] });

    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/alerts/integrations', { signal });
    expect(http.apiMessageGet.mock.calls[0]?.[1]).not.toHaveProperty('headers');
  });

  it('encodes the catalog-owned source and never adds authorization request data', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue(guide);

    await expect(loadAlertIntegrationGuide('webhook/next', signal)).rejects.toMatchObject({
      name: 'AlertIntegrationContractError'
    });

    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/alerts/integrations/webhook%2Fnext', { signal });
    expect(http.apiMessageGet.mock.calls[0]?.[1]).not.toHaveProperty('headers');
  });
});

const catalogItem = {
  source: 'webhook',
  displayNameKey: 'alert.integration.source.webhook',
  iconKey: 'hertzbeat',
  readiness: 'ready',
  limitations: []
};

const guide = {
  source: 'webhook/next',
  displayNameKey: 'alert.integration.source.webhook-next',
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
