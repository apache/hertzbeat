/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { MessageServerContractError, parseEmailEvidenceWire, parseSmsEvidenceWire } from './message-server-schema';

describe('message server wire schemas', () => {
  it('parses exact configured and missing email evidence', () => {
    expect(parseEmailEvidenceWire({ status: 'missing', config: null })).toEqual({ status: 'missing', config: null });
    expect(
      parseEmailEvidenceWire({
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
      })
    ).toMatchObject({ status: 'configured', config: { emailPort: 587 } });
  });

  it('rejects secret echoes, blank identities, and invalid ports', () => {
    const config = {
      type: 0,
      emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test',
      emailPort: 587,
      emailSsl: false,
      emailStarttls: true,
      enable: true,
      configuredSecrets: ['emailPassword']
    };
    expect(() =>
      parseEmailEvidenceWire({
        status: 'configured',
        config: { ...config, emailPassword: 'echoed-secret' }
      })
    ).toThrow(MessageServerContractError);
    expect(() =>
      parseEmailEvidenceWire({
        status: 'configured',
        config: { ...config, emailHost: '   ' }
      })
    ).toThrow(MessageServerContractError);
    expect(() =>
      parseEmailEvidenceWire({
        status: 'configured',
        config: { ...config, emailPort: 65_536 }
      })
    ).toThrow(MessageServerContractError);
  });

  it('validates the SMS envelope before provider-specific mapping', () => {
    expect(
      parseSmsEvidenceWire({
        status: 'configured',
        config: { enable: true, type: 'twilio', options: backendSmsOptions(), configuredSecrets: [] }
      })
    ).toMatchObject({ status: 'configured', config: { type: 'twilio' } });
    expect(() =>
      parseSmsEvidenceWire({
        status: 'configured',
        config: { enable: true, type: 'unknown', options: {}, configuredSecrets: [] }
      })
    ).toThrow(MessageServerContractError);
    expect(() => parseSmsEvidenceWire({ status: 'missing', config: null, token: 'echoed-secret' })).toThrow(
      MessageServerContractError
    );
  });

  it('requires the exact read-safe backend SMS options DTO instead of a compact legacy provider shape', () => {
    expect(
      parseSmsEvidenceWire({
        status: 'configured',
        config: {
          enable: true,
          type: 'twilio',
          options: backendSmsOptions({ accountSid: 'account', twilioPhoneNumber: '+15550000000' }),
          configuredSecrets: ['authToken']
        }
      })
    ).toMatchObject({ status: 'configured', config: { options: { accountSid: 'account' } } });
    expect(() =>
      parseSmsEvidenceWire({
        status: 'configured',
        config: {
          enable: true,
          type: 'twilio',
          options: { accountSid: 'account', twilioPhoneNumber: '+15550000000' },
          configuredSecrets: ['authToken']
        }
      })
    ).toThrow(MessageServerContractError);
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
