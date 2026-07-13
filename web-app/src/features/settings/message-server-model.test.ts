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
  buildEmailServerPayload,
  buildSmsServerPayload,
  createEmailServerDraft,
  createSmsServerDraft,
  messageServerStatus,
  smsProviderDefinitions,
  validateEmailServerDraft,
  validateSmsServerDraft
} from './message-server-model';

describe('message server model', () => {
  it('builds an audit-free email payload and validates SMTP bounds', () => {
    const draft = { ...createEmailServerDraft(), emailHost: ' smtp.example.test ', emailPort: 587, emailUsername: ' ops@example.test ', emailPassword: 'secret', emailSsl: false, emailStarttls: true };
    expect(validateEmailServerDraft(draft)).toEqual([]);
    expect(buildEmailServerPayload(draft)).toEqual({ type: 0, emailHost: 'smtp.example.test', emailPort: 587, emailUsername: 'ops@example.test', emailPassword: 'secret', emailSsl: false, emailStarttls: true, enable: false });
    expect(validateEmailServerDraft({ ...draft, emailPort: 0 })).toEqual(['emailPort']);
  });

  it('defines the six master SMS providers with only provider-owned fields', () => {
    expect(smsProviderDefinitions.map(definition => definition.type)).toEqual(['tencent', 'alibaba', 'unisms', 'smslocal', 'aws', 'twilio']);
    expect(smsProviderDefinitions.find(definition => definition.type === 'twilio')?.fields.map(field => field.key)).toEqual(['accountSid', 'authToken', 'twilioPhoneNumber']);
  });

  it('validates only the selected SMS provider and preserves the provider map payload', () => {
    const draft = createSmsServerDraft();
    expect(validateSmsServerDraft(draft)).toEqual(['secretId', 'secretKey', 'appId', 'signName', 'templateId']);
    const configured = { ...draft, type: 'smslocal' as const, smslocal: { apiKey: ' local-key ' } };
    expect(validateSmsServerDraft(configured)).toEqual([]);
    expect(buildSmsServerPayload(configured)).toMatchObject({ enable: false, type: 'smslocal', smslocal: { apiKey: 'local-key' }, tencent: { secretId: '' } });
  });

  it('requires the UniSMS secret only for HMAC and reports honest disabled/unconfigured states', () => {
    const draft = { ...createSmsServerDraft(), type: 'unisms' as const, unisms: { accessKeyId: 'id', accessKeySecret: '', signature: 'sig', templateId: 'tpl', authMode: 'simple' as const } };
    expect(validateSmsServerDraft(draft)).toEqual([]);
    expect(validateSmsServerDraft({ ...draft, unisms: { ...draft.unisms, authMode: 'hmac' } })).toEqual(['accessKeySecret']);
    expect(messageServerStatus(false, [])).toBe('disabled');
    expect(messageServerStatus(true, ['emailHost'])).toBe('unconfigured');
  });
});
