/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type PublicAccessConfig = {
  publicBaseUrl: string | null;
  serverOtlpHttpEndpoint: string | null;
  serverOtlpGrpcEndpoint: string | null;
};

export type PublicAccessConfigDraft = {
  publicBaseUrl: string;
  serverOtlpHttpEndpoint: string;
  serverOtlpGrpcEndpoint: string;
};

export type DerivedPublicAccessEndpoints = {
  http: string;
  grpc: string;
};

const DEFAULT_OTLP_HTTP_PORT = '4318';
const DEFAULT_OTLP_GRPC_PORT = '4317';

export function createPublicAccessConfigDraft(config: PublicAccessConfig): PublicAccessConfigDraft {
  return {
    publicBaseUrl: config.publicBaseUrl ?? '',
    serverOtlpHttpEndpoint: config.serverOtlpHttpEndpoint ?? '',
    serverOtlpGrpcEndpoint: config.serverOtlpGrpcEndpoint ?? ''
  };
}

export function buildPublicAccessConfigPayload(draft: PublicAccessConfigDraft): PublicAccessConfig {
  return {
    publicBaseUrl: text(draft.publicBaseUrl),
    serverOtlpHttpEndpoint: text(draft.serverOtlpHttpEndpoint),
    serverOtlpGrpcEndpoint: text(draft.serverOtlpGrpcEndpoint)
  };
}

export function publicAccessConfigDraftValid(draft: PublicAccessConfigDraft) {
  const supportedSchemes = ['http:', 'https:'] as const;
  return (
    validAddress(draft.publicBaseUrl, supportedSchemes) &&
    validAddress(draft.serverOtlpHttpEndpoint, supportedSchemes) &&
    validAddress(draft.serverOtlpGrpcEndpoint, supportedSchemes)
  );
}

export function samePublicAccessConfig(left: PublicAccessConfig, right: PublicAccessConfig) {
  return (
    left.publicBaseUrl === right.publicBaseUrl &&
    left.serverOtlpHttpEndpoint === right.serverOtlpHttpEndpoint &&
    left.serverOtlpGrpcEndpoint === right.serverOtlpGrpcEndpoint
  );
}

export function derivePublicAccessEndpoints(publicBaseUrl: string): DerivedPublicAccessEndpoints | null {
  if (!validAddress(publicBaseUrl, ['http:', 'https:'])) return null;
  const value = publicBaseUrl.trim();
  if (!value) return null;

  const publicEndpoint = new URL(value);
  const httpEndpoint = new URL(publicEndpoint.origin);
  httpEndpoint.port = DEFAULT_OTLP_HTTP_PORT;

  const grpcEndpoint = new URL(publicEndpoint.origin);
  grpcEndpoint.port = DEFAULT_OTLP_GRPC_PORT;

  return {
    http: withoutTrailingSlash(httpEndpoint.toString()),
    grpc: withoutTrailingSlash(grpcEndpoint.toString())
  };
}

function validAddress(value: string, schemes?: readonly string[]) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    if (!url.hostname || url.username || url.password || wildcardHost(url.hostname) || url.port === '0') return false;
    if (schemes && !schemes.includes(url.protocol)) return false;
    return !schemes || (!url.search && !url.hash);
  } catch {
    return false;
  }
}

function wildcardHost(value: string) {
  const host = value.toLowerCase().replace(/^\[|\]$/g, '');
  return host === '0.0.0.0' || host === '::' || host === '0:0:0:0:0:0:0:0';
}

function text(value: string) {
  return value.trim() || null;
}

function withoutTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
