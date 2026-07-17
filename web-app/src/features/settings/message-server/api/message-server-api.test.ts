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

const { apiMessageGet, apiMessagePost } = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet, apiMessagePost }));

import {
  loadEmailServerConfig,
  loadSmsServerConfig,
  MessageServerContractError,
  saveEmailServerConfig,
  saveSmsServerConfig
} from './message-server-api';

describe('message server API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses configured and missing evidence from only the frozen endpoints', async () => {
    const email = {
      status: 'configured',
      config: {
        type: 0,
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPort: 587,
        emailSsl: false,
        emailStarttls: true,
        enable: true,
        configuredSecrets: ['emailPassword']
      }
    };
    const sms = {
      status: 'configured',
      config: {
        enable: true,
        type: 'twilio',
        options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' },
        configuredSecrets: ['authToken']
      }
    };
    apiMessageGet.mockResolvedValueOnce(email).mockResolvedValueOnce({ status: 'missing', config: null })
      .mockResolvedValueOnce(sms);

    await expect(loadEmailServerConfig()).resolves.toEqual(email);
    await expect(loadEmailServerConfig()).resolves.toEqual({ status: 'missing', config: null });
    await expect(loadSmsServerConfig()).resolves.toEqual(sms);
    expect(apiMessageGet.mock.calls).toEqual([
      ['/api/config/email'], ['/api/config/email'], ['/api/config/sms']
    ]);
  });

  it('accepts an existing configuration whose required secret was explicitly cleared', async () => {
    const email = { status: 'configured', config: { type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true,
      enable: false, configuredSecrets: [] } };
    apiMessageGet.mockResolvedValue(email);
    await expect(loadEmailServerConfig()).resolves.toEqual(email);
  });

  it.each([
    { status: 'missing', config: {} },
    { status: 'configured', config: { type: 0, emailHost: 'smtp.example.test', emailUsername: 'ops@example.test',
      emailPassword: 'must-not-return', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true,
      configuredSecrets: ['emailPassword'] } },
    { status: 'configured', config: { enable: true, type: 'twilio',
      options: { accountSid: 'account', twilioPhoneNumber: '+15550000000', authToken: 'must-not-return' },
      configuredSecrets: ['authToken'] } },
    { status: 'configured', config: { enable: true, type: 'smslocal', options: { accessKeyId: 'wrong-provider' },
      configuredSecrets: ['apiKey'] } }
  ])('rejects invalid or secret-bearing read evidence %#', async value => {
    apiMessageGet.mockResolvedValueOnce(value);
    const request = 'emailHost' in (value.config ?? {}) ? loadEmailServerConfig() : loadSmsServerConfig();
    await expect(request).rejects.toBeInstanceOf(MessageServerContractError);
  });

  it('posts only caller-built frozen payloads without placing secrets in URLs', async () => {
    apiMessagePost.mockResolvedValueOnce({ status: 'configured', config: { type: 0,
      emailHost: 'smtp.example.test', emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false,
      emailStarttls: true, enable: true, configuredSecrets: ['emailPassword'] } })
      .mockResolvedValueOnce({ status: 'configured', config: { enable: true, type: 'twilio',
        options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' }, configuredSecrets: ['authToken'] } });
    const email = { type: 0, emailHost: 'smtp.example.test', emailUsername: 'ops@example.test',
      emailPassword: 'new-secret', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true };
    const sms = { enable: true, type: 'twilio' as const,
      options: { accountSid: 'account', twilioPhoneNumber: '+15550000000', authToken: 'new-token' } };

    await saveEmailServerConfig(email);
    await saveSmsServerConfig(sms);

    expect(apiMessagePost).toHaveBeenNthCalledWith(1, '/api/config/email', email);
    expect(apiMessagePost).toHaveBeenNthCalledWith(2, '/api/config/sms', sms);
    expect(apiMessagePost.mock.calls.map(call => String(call[0])).join(' ')).not.toMatch(/new-secret|new-token/);
  });

  it('rejects a successful HTTP save envelope with invalid Message data', async () => {
    apiMessagePost.mockResolvedValue({ status: 'configured', config: { enable: true, type: 'twilio',
      options: { accountSid: 'account', twilioPhoneNumber: '+15550000000', authToken: 'echoed' },
      configuredSecrets: ['authToken'] } });
    await expect(saveSmsServerConfig({ enable: true, type: 'twilio',
      options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' } }))
      .rejects.toBeInstanceOf(MessageServerContractError);
  });
});
