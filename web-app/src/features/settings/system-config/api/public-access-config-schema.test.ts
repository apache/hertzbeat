/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { parsePublicAccessConfig, PublicAccessConfigContractError } from './public-access-config-schema';

describe('public access config schema', () => {
  it('accepts the exact nullable response contract', () => {
    expect(
      parsePublicAccessConfig({
        publicBaseUrl: null,
        serverOtlpHttpEndpoint: 'https://otel.example.test/v1',
        serverOtlpGrpcEndpoint: null
      })
    ).toEqual({
      publicBaseUrl: null,
      serverOtlpHttpEndpoint: 'https://otel.example.test/v1',
      serverOtlpGrpcEndpoint: null
    });
  });

  it.each([
    {},
    { publicBaseUrl: '', serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null },
    { publicBaseUrl: 'http://0.0.0.0:1157', serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null },
    { publicBaseUrl: null, serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null, password: 'secret' }
  ])('rejects incomplete, blank, or expanded responses', value => {
    expect(() => parsePublicAccessConfig(value)).toThrow(PublicAccessConfigContractError);
  });
});
