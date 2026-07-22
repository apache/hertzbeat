/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { ManagedOtelRuntimeConfig } from '../api/collector-runtime-config-schema';
import { sameManagedRuntimeConfig } from './collector-runtime-config-proof';

describe('managed runtime config proof', () => {
  it('treats enum-set and header-map order as semantically equal', () => {
    const left = runtimeConfig();
    const right: ManagedOtelRuntimeConfig = {
      ...runtimeConfig(),
      resourceDetectors: ['SYSTEM', 'ENV'],
      hostMetricsScrapers: ['MEMORY', 'CPU'],
      prometheusTargets: [
        {
          ...runtimeConfig().prometheusTargets[0]!,
          headerSecretRefs: { 'x-second': 'second-ref', 'x-first': 'first-ref' }
        }
      ]
    };

    expect(sameManagedRuntimeConfig(left, right)).toBe(true);
  });

  it.each([
    { endpoint: 'https://other.example.test:9464/metrics' },
    { name: 'other' },
    { headerSecretRefs: { 'X-First': 'different-ref', 'X-Second': 'second-ref' } }
  ])('rejects changed source value %#', change => {
    const left = runtimeConfig();
    const right: ManagedOtelRuntimeConfig = {
      ...runtimeConfig(),
      prometheusTargets: [{ ...runtimeConfig().prometheusTargets[0]!, ...change }]
    };
    expect(sameManagedRuntimeConfig(left, right)).toBe(false);
  });
});

function runtimeConfig(): ManagedOtelRuntimeConfig {
  return {
    schemaVersion: 3 as const,
    revision: 8,
    hostMetricsEnabled: true,
    hostMetricsInterval: 'PT30S',
    prometheusTargets: [
      {
        name: 'payments',
        endpoint: 'https://payments.example.test:9464/metrics',
        interval: 'PT30S',
        timeout: 'PT5S',
        headerSecretRefs: { 'X-First': 'first-ref', 'X-Second': 'second-ref' },
        tlsCaProfile: 'internal-ca'
      }
    ],
    fileLogSources: [{ name: 'payments', pathProfile: 'payments-logs' }],
    environment: 'production',
    resourceDetectors: ['ENV', 'SYSTEM'],
    telemetryFilterPresets: [],
    hostMetricsScrapers: ['CPU', 'MEMORY']
  };
}
