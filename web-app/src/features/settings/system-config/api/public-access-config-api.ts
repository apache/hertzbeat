/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';

import type { PublicAccessConfig } from '../model/public-access-config-model';
import { parsePublicAccessConfig } from './public-access-config-schema';

const publicAccessConfigEndpoint = '/api/config/public-access';
export const publicAccessConfigQueryKey = ['settings', 'public-access'] as const;

export async function loadPublicAccessConfig(signal?: AbortSignal) {
  const value = signal
    ? await apiMessageGet(publicAccessConfigEndpoint, { signal })
    : await apiMessageGet(publicAccessConfigEndpoint);
  return parsePublicAccessConfig(value);
}

export async function savePublicAccessConfig(config: PublicAccessConfig, signal?: AbortSignal) {
  const value = signal
    ? await apiMessagePost(publicAccessConfigEndpoint, config, { signal })
    : await apiMessagePost(publicAccessConfigEndpoint, config);
  return parsePublicAccessConfig(value);
}
