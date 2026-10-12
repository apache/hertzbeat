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

import { ApiMessageError } from '@/core/http/api-message';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ApiMessagePost = typeof import('@/core/http/api-message').apiMessagePost;

const { apiMessageGet, apiMessagePost } = vi.hoisted(() => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn<ApiMessagePost>()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet,
  apiMessagePost
}));

import {
  loadEmailServerConfig,
  loadSmsServerConfig,
  MessageServerContractError,
  classifyMessageServerReadError,
  saveEmailServerConfig,
  saveSmsServerConfig
} from './message-server-api';

describe('message server API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses configured and missing evidence from only the frozen endpoints', async () => {
    const email = {
      status: 'configured',
      revision: 'email-r1',
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
      revision: 'sms-r1',
      config: {
        enable: true,
        type: 'twilio',
        options: backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
        configuredSecrets: ['authToken']
      }
    };
    apiMessageGet
      .mockResolvedValueOnce(email)
      .mockResolvedValueOnce({ status: 'missing', revision: 'missing', config: null })
      .mockResolvedValueOnce(sms);

    await expect(loadEmailServerConfig()).resolves.toEqual(email);
    await expect(loadEmailServerConfig()).resolves.toEqual({ status: 'missing', revision: 'missing', config: null });
    await expect(loadSmsServerConfig()).resolves.toEqual({
      ...sms,
      config: {
        ...sms.config,
        options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' }
      }
    });
    expect(apiMessageGet.mock.calls).toEqual([['/api/config/email'], ['/api/config/email'], ['/api/config/sms']]);
  });

  it('maps the backend SMS options DTO to only the selected provider without inventing secret values', async () => {
    apiMessageGet.mockResolvedValue({
      status: 'configured',
      revision: 'sms-r1',
      config: {
        enable: true,
        type: 'twilio',
        options: backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
        configuredSecrets: ['authToken']
      }
    });

    await expect(loadSmsServerConfig()).resolves.toEqual({
      status: 'configured',
      revision: 'sms-r1',
      config: {
        enable: true,
        type: 'twilio',
        options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' },
        configuredSecrets: ['authToken']
      }
    });
  });

  it('classifies invalid, permission, unavailable, and ordinary read failures distinctly', () => {
    expect(classifyMessageServerReadError(new MessageServerContractError())).toBe('invalid');
    expect(classifyMessageServerReadError(new ApiMessageError('redacted', { status: 403 }))).toBe('permission');
    expect(classifyMessageServerReadError(new ApiMessageError('redacted', { status: 503 }))).toBe('unavailable');
    expect(classifyMessageServerReadError(new ApiMessageError('redacted', { status: 409 }))).toBe('error');
  });

  it('accepts an existing configuration whose required secret was explicitly cleared', async () => {
    const email = {
      status: 'configured',
      revision: 'email-r1',
      config: {
        type: 0,
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPort: 587,
        emailSsl: false,
        emailStarttls: true,
        enable: false,
        configuredSecrets: []
      }
    };
    apiMessageGet.mockResolvedValue(email);
    await expect(loadEmailServerConfig()).resolves.toEqual(email);
  });

  it.each([
    { status: 'missing', config: {} },
    {
      status: 'configured',
      config: {
        type: 0,
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPassword: 'must-not-return',
        emailPort: 587,
        emailSsl: false,
        emailStarttls: true,
        enable: true,
        configuredSecrets: ['emailPassword']
      }
    },
    {
      status: 'configured',
      config: {
        enable: true,
        type: 'twilio',
        options: {
          ...backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
          authToken: 'must-not-return'
        },
        configuredSecrets: ['authToken']
      }
    },
    {
      status: 'configured',
      config: {
        enable: true,
        type: 'smslocal',
        options: backendSmsOptions({ accessKeyId: 'wrong-provider' }),
        configuredSecrets: ['apiKey']
      }
    }
  ])('rejects invalid or secret-bearing read evidence %#', async value => {
    apiMessageGet.mockResolvedValueOnce(value);
    const request = 'emailHost' in (value.config ?? {}) ? loadEmailServerConfig() : loadSmsServerConfig();
    await expect(request).rejects.toBeInstanceOf(MessageServerContractError);
  });

  it('posts only caller-built frozen payloads without placing secrets in URLs', async () => {
    const emailEvidence = {
      status: 'configured',
      revision: 'email-r2',
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
    const smsEvidence = {
      status: 'configured',
      revision: 'sms-r2',
      config: {
        enable: true,
        type: 'twilio',
        options: backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
        configuredSecrets: ['authToken']
      }
    };
    apiMessagePost.mockResolvedValueOnce(emailEvidence).mockResolvedValueOnce(smsEvidence);
    const email = {
      type: 0,
      emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test',
      emailPassword: 'new-secret',
      emailPort: 587,
      emailSsl: false,
      emailStarttls: true,
      enable: true
    };
    const sms = {
      enable: true,
      type: 'twilio' as const,
      options: { accountSid: 'account', twilioPhoneNumber: '+15550000000', authToken: 'new-token' }
    };

    await expect(saveEmailServerConfig(email, 'email-r1')).resolves.toEqual(emailEvidence);
    await expect(saveSmsServerConfig(sms, 'sms-r1')).resolves.toEqual({
      ...smsEvidence,
      config: {
        ...smsEvidence.config,
        options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' }
      }
    });

    expect(apiMessagePost).toHaveBeenNthCalledWith(1, '/api/config/email', {
      ...email,
      expectedRevision: 'email-r1'
    });
    expect(apiMessagePost).toHaveBeenNthCalledWith(2, '/api/config/sms', {
      ...sms,
      expectedRevision: 'sms-r1'
    });
    expect(apiMessagePost.mock.calls.map(call => String(call[0])).join(' ')).not.toMatch(/new-secret|new-token/);
  });

  it('uses the frozen missing revision for first creation', async () => {
    const missing = { status: 'missing', revision: 'missing', config: null };
    apiMessagePost.mockResolvedValue(missing);

    await expect(
      saveEmailServerConfig(
        {
          type: 0,
          emailHost: 'smtp.example.test',
          emailUsername: 'ops@example.test',
          emailPort: 587,
          emailSsl: false,
          emailStarttls: true,
          enable: false
        },
        'missing'
      )
    ).resolves.toEqual(missing);
    await expect(saveSmsServerConfig({ enable: false, type: 'smslocal', options: {} }, 'missing')).resolves.toEqual(
      missing
    );
    expect(apiMessagePost.mock.calls.map(call => call[1])).toEqual([
      expect.objectContaining({ expectedRevision: 'missing' }),
      expect.objectContaining({ expectedRevision: 'missing' })
    ]);
  });

  it.each(['Update config success', { status: 'configured', config: null }])(
    'rejects legacy or malformed mutation result %#',
    async response => {
      apiMessagePost.mockResolvedValue(response);
      await expect(
        saveEmailServerConfig(
          {
            type: 0,
            emailHost: 'smtp.example.test',
            emailUsername: 'ops@example.test',
            emailPort: 587,
            emailSsl: false,
            emailStarttls: true,
            enable: true
          },
          'email-r1'
        )
      ).rejects.toBeInstanceOf(MessageServerContractError);
    }
  );

  it('rejects secret-bearing mutation evidence', async () => {
    apiMessagePost.mockResolvedValue({
      status: 'configured',
      config: {
        enable: true,
        type: 'twilio',
        options: {
          ...backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
          authToken: 'echoed'
        },
        configuredSecrets: ['authToken']
      }
    });
    await expect(
      saveSmsServerConfig(
        {
          enable: true,
          type: 'twilio',
          options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' }
        },
        'sms-r1'
      )
    ).rejects.toBeInstanceOf(MessageServerContractError);
  });
});

function backendSmsOptions(patch: Record<string, string | null> = {}) {
  return {
    appId: null,
    signName: null,
    templateId: null,
    accessKeyId: null,
    templateCode: null,
    signature: null,
    authMode: null,
    region: null,
    accountSid: null,
    twilioPhoneNumber: null,
    ...patch
  };
}
