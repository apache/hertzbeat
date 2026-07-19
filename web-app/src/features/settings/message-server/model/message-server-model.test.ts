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
  selectSmsProvider,
  setEmailSecretCleared,
  smsProviderDefinitions,
  validateEmailServerDraft,
  validateSmsServerDraft
} from './message-server-model';
import { emailServerSaveConverged, smsServerSaveConverged } from './message-server-convergence';

describe('message server model', () => {
  it('builds retain, replace, and explicit-clear email secret mutations', () => {
    const draft = {
      ...createEmailServerDraft({
        status: 'configured',
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

  it('proves email convergence from semantic fields and secret presence without comparing secret values', () => {
    const draft = {
      ...createEmailServerDraft(),
      type: 1,
      emailHost: ' smtp.new.test ',
      emailPort: 2525,
      emailUsername: ' operator@example.test ',
      emailSsl: false,
      emailStarttls: true,
      enable: true,
      emailPassword: 'replacement'
    };
    const matching = {
      status: 'configured' as const,
      config: {
        type: 1,
        emailHost: 'smtp.new.test',
        emailPort: 2525,
        emailUsername: 'operator@example.test',
        emailSsl: false,
        emailStarttls: true,
        enable: true,
        configuredSecrets: ['emailPassword' as const]
      }
    };
    expect(emailServerSaveConverged(draft, matching)).toBe(true);
    for (const patch of [
      { type: 0 },
      { emailHost: 'smtp.old.test' },
      { emailPort: 465 },
      { emailUsername: 'old@example.test' },
      { emailSsl: true },
      { emailStarttls: false },
      { enable: false },
      { configuredSecrets: [] }
    ]) {
      expect(
        emailServerSaveConverged(draft, {
          ...matching,
          config: { ...matching.config, ...patch }
        })
      ).toBe(false);
    }
    const clearDraft = { ...draft, emailPassword: '', clearSecrets: ['emailPassword' as const] };
    expect(emailServerSaveConverged(clearDraft, matching)).toBe(false);
    expect(
      emailServerSaveConverged(clearDraft, {
        ...matching,
        config: { ...matching.config, configuredSecrets: [] }
      })
    ).toBe(true);
    const retainedDraft = createEmailServerDraft(matching);
    expect(emailServerSaveConverged(retainedDraft, matching)).toBe(true);
    expect(
      emailServerSaveConverged(retainedDraft, {
        ...matching,
        config: { ...matching.config, configuredSecrets: [] }
      })
    ).toBe(false);
    const absentDraft = { ...retainedDraft, configuredSecrets: [] };
    expect(emailServerSaveConverged(absentDraft, matching)).toBe(false);
    expect(emailServerSaveConverged(draft, { status: 'missing', config: null })).toBe(false);
  });

  it('proves SMS convergence from active nonsecret options and requested secret presence transitions', () => {
    const draft = {
      ...createSmsServerDraft(),
      enable: true,
      tencent: {
        secretId: 'replacement',
        secretKey: '',
        appId: 'app-new',
        signName: 'sign-new',
        templateId: 'template-new'
      }
    };
    const matching = {
      status: 'configured' as const,
      config: {
        enable: true,
        type: 'tencent' as const,
        options: { appId: 'app-new', signName: 'sign-new', templateId: 'template-new' },
        configuredSecrets: ['secretId' as const]
      }
    };
    expect(smsServerSaveConverged(draft, matching)).toBe(true);
    expect(
      smsServerSaveConverged(draft, {
        ...matching,
        config: { ...matching.config, type: 'alibaba' as const }
      })
    ).toBe(false);
    expect(
      smsServerSaveConverged(draft, {
        ...matching,
        config: { ...matching.config, enable: false }
      })
    ).toBe(false);
    for (const key of ['appId', 'signName', 'templateId']) {
      expect(
        smsServerSaveConverged(draft, {
          ...matching,
          config: { ...matching.config, options: { ...matching.config.options, [key]: 'old' } }
        })
      ).toBe(false);
    }
    expect(
      smsServerSaveConverged(draft, {
        ...matching,
        config: { ...matching.config, configuredSecrets: [] }
      })
    ).toBe(false);
    const clearDraft = {
      ...draft,
      tencent: { ...draft.tencent, secretId: '' },
      clearSecrets: ['secretId' as const]
    };
    expect(smsServerSaveConverged(clearDraft, matching)).toBe(false);
    expect(
      smsServerSaveConverged(clearDraft, {
        ...matching,
        config: { ...matching.config, configuredSecrets: [] }
      })
    ).toBe(true);
    const retainedDraft = createSmsServerDraft(matching);
    expect(smsServerSaveConverged(retainedDraft, matching)).toBe(true);
    expect(
      smsServerSaveConverged(retainedDraft, {
        ...matching,
        config: { ...matching.config, configuredSecrets: [] }
      })
    ).toBe(false);
    const absentDraft = { ...retainedDraft, configuredSecrets: [] };
    expect(smsServerSaveConverged(absentDraft, matching)).toBe(false);
    const hiddenSecretEvidence = {
      status: 'configured' as const,
      config: {
        enable: false,
        type: 'unisms' as const,
        options: { accessKeyId: 'id', authMode: 'simple', signature: 'sign', templateId: 'template' },
        configuredSecrets: ['accessKeySecret' as const]
      }
    };
    const hiddenClearDraft = {
      ...createSmsServerDraft(hiddenSecretEvidence),
      clearSecrets: ['accessKeySecret' as const]
    };
    expect(smsServerSaveConverged(hiddenClearDraft, hiddenSecretEvidence)).toBe(false);
    expect(
      smsServerSaveConverged(hiddenClearDraft, {
        ...hiddenSecretEvidence,
        config: { ...hiddenSecretEvidence.config, configuredSecrets: [] }
      })
    ).toBe(true);
    expect(smsServerSaveConverged(draft, { status: 'missing', config: null })).toBe(false);
  });
});
