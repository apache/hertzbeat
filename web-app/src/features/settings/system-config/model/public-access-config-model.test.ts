/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  buildPublicAccessConfigPayload,
  createPublicAccessConfigDraft,
  derivePublicAccessEndpoints,
  publicAccessConfigDraftValid,
  samePublicAccessConfig
} from './public-access-config-model';

describe('public access config model', () => {
  it('round-trips nullable persisted addresses through an editable draft', () => {
    const config = {
      publicBaseUrl: 'https://hertzbeat.example.test/base',
      serverOtlpHttpEndpoint: null,
      serverOtlpGrpcEndpoint: 'https://otel.example.test:4317'
    };

    const draft = createPublicAccessConfigDraft(config);

    expect(draft.serverOtlpHttpEndpoint).toBe('');
    expect(buildPublicAccessConfigPayload(draft)).toEqual(config);
    expect(samePublicAccessConfig(buildPublicAccessConfigPayload(draft), config)).toBe(true);
  });

  it('accepts empty optional addresses and rejects malformed public URLs', () => {
    expect(
      publicAccessConfigDraftValid({ publicBaseUrl: '', serverOtlpHttpEndpoint: '', serverOtlpGrpcEndpoint: '' })
    ).toBe(true);
    expect(
      publicAccessConfigDraftValid({
        publicBaseUrl: 'ftp://hertzbeat.example.test',
        serverOtlpHttpEndpoint: '',
        serverOtlpGrpcEndpoint: ''
      })
    ).toBe(false);
    expect(
      publicAccessConfigDraftValid({
        publicBaseUrl: 'https://user:secret@hertzbeat.example.test',
        serverOtlpHttpEndpoint: '',
        serverOtlpGrpcEndpoint: ''
      })
    ).toBe(false);
    expect(
      publicAccessConfigDraftValid({
        publicBaseUrl: 'https://hertzbeat.example.test/base?tenant=one',
        serverOtlpHttpEndpoint: '',
        serverOtlpGrpcEndpoint: ''
      })
    ).toBe(false);
    expect(
      publicAccessConfigDraftValid({
        publicBaseUrl: 'http://0.0.0.0:1157',
        serverOtlpHttpEndpoint: '',
        serverOtlpGrpcEndpoint: ''
      })
    ).toBe(false);
    expect(
      publicAccessConfigDraftValid({
        publicBaseUrl: '',
        serverOtlpHttpEndpoint: 'ftp://otel.example.test:4318',
        serverOtlpGrpcEndpoint: ''
      })
    ).toBe(false);
  });

  it('derives standard OTLP intake ports from the public host', () => {
    expect(derivePublicAccessEndpoints('https://hertzbeat.example.test/ops/')).toEqual({
      http: 'https://hertzbeat.example.test:4318',
      grpc: 'https://hertzbeat.example.test:4317'
    });
    expect(derivePublicAccessEndpoints('http://127.0.0.1:1157')).toEqual({
      http: 'http://127.0.0.1:4318',
      grpc: 'http://127.0.0.1:4317'
    });
  });

  it('does not advertise derived OTLP defaults from an empty or invalid public base', () => {
    expect(derivePublicAccessEndpoints('')).toBeNull();
    expect(derivePublicAccessEndpoints('http://0.0.0.0:1157')).toBeNull();
    expect(derivePublicAccessEndpoints('not-a-url')).toBeNull();
  });
});
