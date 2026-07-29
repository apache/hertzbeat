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
  activeSmsProviderValues,
  buildEmailServerPayload,
  buildSmsServerPayload,
  createEmailServerDraft,
  createSmsServerDraft,
  messageServerStatus,
  selectSmsProvider,
  setEmailSecretCleared,
  setSmsSecretCleared,
  smsProviderDefinitions,
  updateSmsProviderField,
  validateEmailServerDraft,
  validateSmsServerDraft
} from './message-server-model';
import { smsProviderTypes } from './message-server-contract';

describe('message server model', () => {
  it('keeps revision metadata out of editable drafts and secret payload decisions', () => {
    const draft = createEmailServerDraft({
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
    });

    expect(draft).not.toHaveProperty('revision');
    expect(buildEmailServerPayload(draft)).not.toHaveProperty('expectedRevision');
    expect(buildEmailServerPayload({ ...draft, emailPassword: 'replacement' })).toMatchObject({
      emailPassword: 'replacement'
    });
    expect(buildEmailServerPayload(setEmailSecretCleared(draft, true))).toMatchObject({
      clearSecrets: ['emailPassword']
    });
  });
  it('builds retain, replace, and explicit-clear email secret mutations', () => {
    const draft = {
      ...createEmailServerDraft({
        status: 'configured',
        revision: 'email-r1',
        config: {
          type: 0,
          emailHost: ' smtp.example.test ',
          emailPort: 587,
          emailUsername: ' ops@example.test ',
          emailSsl: false,
          emailStarttls: true,
          enable: true,
          configuredSecrets: ['emailPassword']
        }
      }),
      enable: false
    };
    expect(validateEmailServerDraft(draft)).toEqual([]);
    expect(buildEmailServerPayload(draft)).toEqual({
      type: 0,
      emailHost: 'smtp.example.test',
      emailPort: 587,
      emailUsername: 'ops@example.test',
      emailSsl: false,
      emailStarttls: true,
      enable: false
    });
    const replacement = buildEmailServerPayload({ ...draft, emailPassword: ' replacement ' });
    expect(replacement.emailPassword).toBe('replacement');
    expect(replacement).not.toHaveProperty('clearSecrets');
    const cleared = buildEmailServerPayload({ ...draft, clearSecrets: ['emailPassword'] });
    expect(cleared.clearSecrets).toEqual(['emailPassword']);
    expect(cleared).not.toHaveProperty('emailPassword');
    expect(validateEmailServerDraft({ ...draft, enable: true, clearSecrets: ['emailPassword'] })).toContain(
      'emailPassword'
    );
    expect(validateEmailServerDraft({ ...draft, enable: false, clearSecrets: ['emailPassword'] })).toEqual([]);
    expect(validateEmailServerDraft({ ...draft, emailPort: 0 })).toEqual(['emailPort']);
  });

  it('clears a pending email replacement without restoring configured secret material', () => {
    const replacement = {
      ...createEmailServerDraft(),
      emailPassword: 'replacement',
      configuredSecrets: ['emailPassword' as const]
    };
    const cleared = setEmailSecretCleared(replacement, true);
    expect(cleared.emailPassword).toBe('');
    expect(cleared.clearSecrets).toEqual(['emailPassword']);
    const retained = setEmailSecretCleared(cleared, false);
    expect(retained.emailPassword).toBe('');
    expect(retained.clearSecrets).toEqual([]);
  });

  it('defines the six master SMS providers with only provider-owned fields', () => {
    expect(smsProviderDefinitions.map(definition => definition.type)).toEqual([
      'tencent',
      'alibaba',
      'unisms',
      'smslocal',
      'aws',
      'twilio'
    ]);
    expect(
      smsProviderDefinitions.find(definition => definition.type === 'twilio')?.fields.map(field => field.key)
    ).toEqual(['accountSid', 'authToken', 'twilioPhoneNumber']);
  });

  it('reads and updates every provider through the typed active-draft boundary', () => {
    for (const type of smsProviderTypes) {
      const selected = selectSmsProvider(createSmsServerDraft(), type);
      const field = smsProviderDefinitions.find(definition => definition.type === type)?.fields[0];
      expect(field).toBeDefined();
      if (!field) continue;
      const updated = updateSmsProviderField(selected, field.key, 'updated');
      expect(activeSmsProviderValues(updated)[field.key]).toBe('updated');
      expect(updateSmsProviderField(updated, 'notOwned', 'ignored')).toBe(updated);
    }
  });

  it('does not clear a secret owned by another SMS provider', () => {
    const draft = selectSmsProvider(createSmsServerDraft(), 'twilio');
    expect(setSmsSecretCleared(draft, 'secretId', true)).toBe(draft);
  });

  it('validates only the selected SMS provider and sends only its allowlisted options', () => {
    const draft = createSmsServerDraft();
    expect(validateSmsServerDraft(draft)).toEqual(['secretId', 'secretKey', 'appId', 'signName', 'templateId']);
    const configured = {
      ...draft,
      type: 'smslocal' as const,
      smslocal: { apiKey: ' local-key ' },
      tencent: { secretId: 'leak', secretKey: 'leak', appId: 'leak', signName: 'leak', templateId: 'leak' }
    };
    expect(validateSmsServerDraft(configured)).toEqual([]);
    expect(buildSmsServerPayload(configured)).toEqual({
      enable: false,
      type: 'smslocal',
      options: { apiKey: 'local-key' }
    });
  });

  it('retains, replaces, and explicitly clears only active-provider SMS secrets', () => {
    const draft = createSmsServerDraft({
      status: 'configured',
      revision: 'sms-r1',
      config: {
        enable: true,
        type: 'unisms',
        options: { accessKeyId: 'id', signature: 'sig', templateId: 'tpl', authMode: 'hmac' },
        configuredSecrets: ['accessKeySecret']
      }
    });
    expect(validateSmsServerDraft(draft)).toEqual([]);
    expect(buildSmsServerPayload(draft)).toEqual({
      enable: true,
      type: 'unisms',
      options: { accessKeyId: 'id', authMode: 'hmac', signature: 'sig', templateId: 'tpl' }
    });
    expect(
      buildSmsServerPayload({ ...draft, unisms: { ...draft.unisms, accessKeySecret: ' new-secret ' } })
    ).toMatchObject({ options: { accessKeySecret: 'new-secret' } });
    expect(validateSmsServerDraft({ ...draft, clearSecrets: ['accessKeySecret'] })).toContain('accessKeySecret');
    expect(buildSmsServerPayload({ ...draft, enable: false, clearSecrets: ['accessKeySecret'] })).toMatchObject({
      clearSecrets: ['accessKeySecret']
    });
  });

  it('drops configured-secret ownership when the selected provider changes', () => {
    const configured = createSmsServerDraft({
      status: 'configured',
      revision: 'sms-r1',
      config: {
        enable: true,
        type: 'tencent',
        options: { appId: 'app', signName: 'sign', templateId: 'template' },
        configuredSecrets: ['secretId', 'secretKey']
      }
    });
    const switched = selectSmsProvider(configured, 'twilio');
    expect(switched.configuredSecrets).toEqual([]);
    expect(switched.clearSecrets).toEqual([]);
    expect(validateSmsServerDraft(switched)).toEqual(['accountSid', 'authToken', 'twilioPhoneNumber']);
  });

  it('requires the UniSMS secret only for HMAC and reports honest disabled/unconfigured states', () => {
    const draft = {
      ...createSmsServerDraft(),
      type: 'unisms' as const,
      unisms: {
        accessKeyId: 'id',
        accessKeySecret: '',
        signature: 'sig',
        templateId: 'tpl',
        authMode: 'simple' as const
      }
    };
    expect(validateSmsServerDraft(draft)).toEqual([]);
    expect(validateSmsServerDraft({ ...draft, unisms: { ...draft.unisms, authMode: 'hmac' } })).toEqual([
      'accessKeySecret'
    ]);
    expect(messageServerStatus(false, [])).toBe('disabled');
    expect(messageServerStatus(true, ['emailHost'])).toBe('unconfigured');
  });
});
