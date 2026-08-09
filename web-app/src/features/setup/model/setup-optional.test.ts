/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  createOptionalDraft,
  createOptionalOptionsRequest,
  createOptionalValidationRequest,
  optionalMailComplete
} from './setup-optional';

describe('optional setup model', () => {
  it('omits every later-configurable section when the administrator skips it', () => {
    expect(createOptionalOptionsRequest(createOptionalDraft())).toEqual({});
  });

  it('normalizes only entered public, retention, and complete mail values', () => {
    const draft = createOptionalDraft();
    draft.publicBaseUrl = ' https://hertzbeat.example.test ';
    draft.serverOtlpHttpEndpoint = ' http://collector.example.test:4318 ';
    draft.retentionDays = 30;
    draft.mail = {
      host: ' smtp.example.test ',
      port: 587,
      security: 'starttls',
      username: ' operator ',
      password: 'request-secret',
      fromAddress: ' alerts@example.test '
    };

    expect(createOptionalOptionsRequest(draft)).toEqual({
      publicAccess: {
        publicBaseUrl: 'https://hertzbeat.example.test',
        serverOtlpHttpEndpoint: 'http://collector.example.test:4318'
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

  it('builds the existing validation sections without inventing browser-derived addresses', () => {
    const draft = createOptionalDraft();
    draft.publicBaseUrl = 'https://hertzbeat.example.test';
    draft.mail = {
      host: 'smtp.example.test',
      port: 465,
      security: 'tls',
      username: '',
      password: '',
      fromAddress: 'alerts@example.test'
    };

    expect(createOptionalValidationRequest('public_access', draft)).toEqual({
      section: 'public_access',
      publicAccess: { publicBaseUrl: 'https://hertzbeat.example.test' }
    });
    expect(createOptionalValidationRequest('mail', draft)).toEqual({
      section: 'mail',
      mail: {
        host: 'smtp.example.test',
        port: 465,
        security: 'tls',
        fromAddress: 'alerts@example.test'
      }
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

    expect(createOptionalOptionsRequest(draft).mail?.password).toBe('  request-secret  ');
  });
});
