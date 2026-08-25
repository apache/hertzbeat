/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  createOptionalDraft,
  createOptionalOptionsRequest,
  createOptionalValidationRequest,
  optionalDraftValid,
  optionalMailComplete
} from './setup-optional';

describe('optional setup model', () => {
  it('uses the current setup address when no load balancer or proxy is configured', () => {
    expect(createOptionalOptionsRequest(createOptionalDraft(), 'http://127.0.0.1:1157')).toEqual({
      publicAccess: { publicBaseUrl: 'http://127.0.0.1:1157' }
    });
  });

  it('uses the explicit public address only when a load balancer or proxy is configured', () => {
    const draft = createOptionalDraft();
    draft.useProxy = true;
    draft.proxyPublicBaseUrl = ' https://hertzbeat.example.test/operations ';
    draft.retentionDays = 30;
    draft.mail = {
      host: ' smtp.example.test ',
      port: 587,
      security: 'starttls',
      username: ' operator ',
      password: 'request-secret',
      fromAddress: ' alerts@example.test '
    };

    expect(createOptionalOptionsRequest(draft, 'https://setup.example.test:8443')).toEqual({
      publicAccess: {
        publicBaseUrl: 'https://hertzbeat.example.test/operations'
      },
      retention: { days: 30 },
      mail: {
        host: 'smtp.example.test',
        port: 587,
        security: 'starttls',
        username: 'operator',
        password: 'request-secret',
        fromAddress: 'alerts@example.test'
      }
    });
    expect(optionalMailComplete(draft.mail)).toBe(true);
  });

  it('builds validation requests from the active access mode', () => {
    const draft = createOptionalDraft();
    draft.mail = {
      host: 'smtp.example.test',
      port: 465,
      security: 'tls',
      username: '',
      password: '',
      fromAddress: 'alerts@example.test'
    };

    expect(createOptionalValidationRequest('public_access', draft, 'https://setup.example.test')).toEqual({
      section: 'public_access',
      publicAccess: { publicBaseUrl: 'https://setup.example.test' }
    });
    expect(createOptionalValidationRequest('mail', draft, 'https://setup.example.test')).toEqual({
      section: 'mail',
      mail: {
        host: 'smtp.example.test',
        port: 465,
        security: 'tls',
        fromAddress: 'alerts@example.test'
      }
    });
  });

  it('accepts an HTTP(S) proxy address with a port or path and rejects unsafe URL forms', () => {
    const accepted = createOptionalDraft();
    accepted.useProxy = true;
    accepted.proxyPublicBaseUrl = 'https://edge.example.test:9443/operations';
    expect(optionalDraftValid(accepted)).toBe(true);

    for (const value of [
      'edge.example.test',
      'ftp://edge.example.test',
      'https://a:b@edge.example.test',
      'http://0.0.0.0'
    ]) {
      const draft = createOptionalDraft();
      draft.useProxy = true;
      draft.proxyPublicBaseUrl = value;
      expect(optionalDraftValid(draft)).toBe(false);
    }
  });

  it('ignores a stale proxy address while the default access mode is active', () => {
    const draft = createOptionalDraft();
    draft.proxyPublicBaseUrl = 'not-a-url';

    expect(optionalDraftValid(draft)).toBe(true);
    expect(createOptionalOptionsRequest(draft, 'https://setup.example.test:8443')).toEqual({
      publicAccess: { publicBaseUrl: 'https://setup.example.test:8443' }
    });
  });

  it('preserves legal SMTP password whitespace while using trim only to determine presence', () => {
    const draft = createOptionalDraft();
    draft.mail = {
      host: 'smtp.example.test',
      port: 587,
      security: 'starttls',
      username: 'operator',
      password: '  request-secret  ',
      fromAddress: 'alerts@example.test'
    };

    expect(createOptionalOptionsRequest(draft, 'http://127.0.0.1:1157').mail?.password).toBe('  request-secret  ');
  });
});
