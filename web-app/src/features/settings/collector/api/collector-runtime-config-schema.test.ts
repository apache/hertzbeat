/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { buildManagedOtelRuntimeConfigUpdate, parseManagedOtelRuntimeConfig } from './collector-runtime-config-schema';
import { buildManagedOtelPrometheusTargetsUpdate } from './collector-prometheus-source-schema';

describe('managed Collector runtime config schema', () => {
  it('reads a complete normalized legacy response and upgrades only editable core fields', () => {
    const legacy = runtimeConfig({ schemaVersion: 1, revision: 7, environment: '' });

    const parsed = parseManagedOtelRuntimeConfig(legacy);
    const update = buildManagedOtelRuntimeConfigUpdate(parsed, {
      environment: 'staging',
      hostMetricsEnabled: true,
      hostMetricsIntervalSeconds: 45,
      hostMetricsScrapers: ['CPU', 'MEMORY'],
      resourceDetectors: ['SYSTEM', 'DOCKER'],
      telemetryFilterPresets: ['HEALTH_CHECK_TRACES']
    });

    expect(update).toEqual({
      ...legacy,
      schemaVersion: 3,
      revision: 8,
      environment: 'staging',
      hostMetricsInterval: 'PT45S',
      hostMetricsScrapers: ['CPU', 'MEMORY'],
      resourceDetectors: ['SYSTEM', 'DOCKER'],
      telemetryFilterPresets: ['HEALTH_CHECK_TRACES']
    });
    expect(update?.prometheusTargets).toEqual(legacy.prometheusTargets);
    expect(update?.fileLogSources).toEqual(legacy.fileLogSources);
  });

  it('preserves schema-3 source policy fields including secret reference names without exposing values', () => {
    const current = runtimeConfig({
      prometheusTargets: [
        {
          name: 'payments',
          endpoint: 'https://payments.internal:9464/metrics',
          interval: 'PT30S',
          timeout: 'PT5S',
          headerSecretRefs: { 'X-Scrape-Key': 'payments-key-ref' },
          tlsCaProfile: 'internal-ca'
        }
      ]
    });

    const update = buildManagedOtelRuntimeConfigUpdate(parseManagedOtelRuntimeConfig(current), coreDraft());

    expect(update).toMatchObject({
      schemaVersion: 3,
      revision: 8,
      prometheusTargets: current.prometheusTargets,
      fileLogSources: current.fileLogSources
    });
    expect(JSON.stringify(update)).not.toContain('secretValue');
  });

  it.each([
    ['unknown top-level field', { token: 'must-not-enter-ui' }],
    ['unsupported schema', { schemaVersion: 4 }],
    ['nonpositive revision', { revision: 0 }],
    ['unsafe host interval', { hostMetricsInterval: 'PT9S' }],
    ['fractional host interval', { hostMetricsInterval: 'PT10.5S' }],
    ['unsafe environment', { environment: 'prod\nprocessors: injected' }],
    ['unknown detector', { resourceDetectors: ['SYSTEM', 'KUBERNETES'] }],
    ['duplicate scraper', { hostMetricsScrapers: ['CPU', 'CPU'] }],
    ['enabled host metrics without scraper', { hostMetricsEnabled: true, hostMetricsScrapers: [] }]
  ])('rejects %s', (_label, change) => {
    expect(parseManagedOtelRuntimeConfig({ ...runtimeConfig(), ...change })).toBeNull();
  });

  it('rejects unsafe, duplicate, excessive, or credential-bearing source definitions', () => {
    expect(
      parseManagedOtelRuntimeConfig(
        runtimeConfig({
          prometheusTargets: [target({ endpoint: 'https://user:secret@example.test/metrics' })]
        })
      )
    ).toBeNull();
    expect(
      parseManagedOtelRuntimeConfig(
        runtimeConfig({ prometheusTargets: [target(), target({ endpoint: 'https://other.example.test/metrics' })] })
      )
    ).toBeNull();
    expect(
      parseManagedOtelRuntimeConfig(
        runtimeConfig({ prometheusTargets: Array.from({ length: 33 }, (_, i) => target({ name: `target-${i}` })) })
      )
    ).toBeNull();
    expect(
      parseManagedOtelRuntimeConfig(
        runtimeConfig({
          fileLogSources: Array.from({ length: 17 }, (_, i) => ({ name: `log-${i}`, pathProfile: 'app-logs' }))
        })
      )
    ).toBeNull();
  });

  it.each([
    { timeout: 'PT31S' },
    { headerSecretRefs: { Authorization: 'credential-ref' } },
    { headerSecretRefs: { 'X-Key': 'one', 'x-key': 'two' } },
    { headerSecretRefs: { 'X-Key': 'unsafe ref' } },
    { headerSecretRefs: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`X-Key-${i}`, `ref-${i}`])) },
    { tlsCaProfile: 'unsafe profile' }
  ])('rejects unsafe advanced Prometheus policy %#', change => {
    expect(parseManagedOtelRuntimeConfig(runtimeConfig({ prometheusTargets: [target(change)] }))).toBeNull();
  });

  it('rejects advanced source policy on schema 1 and 2 reads', () => {
    expect(
      parseManagedOtelRuntimeConfig(
        runtimeConfig({ schemaVersion: 2, prometheusTargets: [target({ timeout: 'PT5S' })] })
      )
    ).toBeNull();
    expect(parseManagedOtelRuntimeConfig(runtimeConfig({ schemaVersion: 1, hostMetricsScrapers: ['CPU'] }))).toBeNull();
  });

  it.each([
    { environment: 'staging' },
    { resourceDetectors: ['SYSTEM'] },
    { telemetryFilterPresets: ['HEALTH_CHECK_TRACES'] }
  ])('rejects schema-1 governance beyond normalized Java defaults %#', change => {
    expect(parseManagedOtelRuntimeConfig(runtimeConfig({ schemaVersion: 1, environment: '', ...change }))).toBeNull();
  });

  it('accepts schema-1 Java-normalized governance and scraper defaults', () => {
    expect(parseManagedOtelRuntimeConfig(runtimeConfig({ schemaVersion: 1, environment: '' }))).not.toBeNull();
  });

  it('rejects an invalid editable draft instead of dropping preserved fields', () => {
    expect(
      buildManagedOtelRuntimeConfigUpdate(parseManagedOtelRuntimeConfig(runtimeConfig()), {
        ...coreDraft(),
        hostMetricsIntervalSeconds: 10.5
      })
    ).toBeNull();
  });

  it('replaces only Prometheus targets while upgrading revision and preserving core and FileLog exactly', () => {
    const current = parseManagedOtelRuntimeConfig(runtimeConfig());
    const update = buildManagedOtelPrometheusTargetsUpdate(current, [
      prometheusDraft({
        name: 'checkout',
        headerSecretRefs: [{ headerName: 'X-Scrape-Key', secretReferenceName: 'checkout-key-ref' }]
      })
    ]);

    expect(update).toEqual({
      ...current,
      schemaVersion: 3,
      revision: 8,
      prometheusTargets: [
        {
          name: 'checkout',
          endpoint: 'https://payments.example.test:9464/metrics',
          interval: 'PT30S',
          timeout: 'PT10S',
          headerSecretRefs: { 'X-Scrape-Key': 'checkout-key-ref' },
          tlsCaProfile: ''
        }
      ]
    });
    expect(update?.fileLogSources).toEqual(current?.fileLogSources);
    expect(update?.environment).toBe(current?.environment);
    expect(update?.hostMetricsScrapers).toEqual(current?.hostMetricsScrapers);
  });

  it('keeps target order exact and treats target names as case-sensitive', () => {
    const update = buildManagedOtelPrometheusTargetsUpdate(parseManagedOtelRuntimeConfig(runtimeConfig()), [
      prometheusDraft({ name: 'Payments' }),
      prometheusDraft({ name: 'payments', endpoint: 'https://second.example.test/metrics' })
    ]);

    expect(update?.prometheusTargets.map(target => target.name)).toEqual(['Payments', 'payments']);
  });

  it.each([
    ['credential URL', [prometheusDraft({ endpoint: 'https://user:secret@example.test/metrics' })]],
    ['timeout beyond interval', [prometheusDraft({ intervalSeconds: 10, timeoutSeconds: 11 })]],
    [
      'reserved header',
      [prometheusDraft({ headerSecretRefs: [{ headerName: 'Authorization', secretReferenceName: 'ref' }] })]
    ],
    [
      'duplicate header',
      [
        prometheusDraft({
          headerSecretRefs: [
            { headerName: 'X-Key', secretReferenceName: 'one' },
            { headerName: 'x-key', secretReferenceName: 'two' }
          ]
        })
      ]
    ],
    ['secret-shaped extra field', [{ ...prometheusDraft(), secretValue: 'must-not-enter-config' }]],
    ['more than 32 targets', Array.from({ length: 33 }, (_, index) => prometheusDraft({ name: `target-${index}` }))]
  ])('rejects unsafe Prometheus editor draft: %s', (_label, draft) => {
    expect(buildManagedOtelPrometheusTargetsUpdate(parseManagedOtelRuntimeConfig(runtimeConfig()), draft)).toBeNull();
  });
});

function runtimeConfig(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
    revision: 7,
    hostMetricsEnabled: true,
    hostMetricsInterval: 'PT30S',
    prometheusTargets: [target()],
    fileLogSources: [{ name: 'payments', pathProfile: 'payments-logs' }],
    environment: 'production',
    resourceDetectors: ['ENV', 'SYSTEM'],
    telemetryFilterPresets: [],
    hostMetricsScrapers: ['CPU', 'DISK', 'FILESYSTEM', 'LOAD', 'MEMORY', 'NETWORK', 'PAGING', 'PROCESSES'],
    ...overrides
  };
}

function target(overrides: Record<string, unknown> = {}) {
  return {
    name: 'payments',
    endpoint: 'https://payments.example.test:9464/metrics',
    interval: 'PT30S',
    timeout: 'PT10S',
    headerSecretRefs: {},
    tlsCaProfile: '',
    ...overrides
  };
}

function coreDraft() {
  return {
    environment: 'production',
    hostMetricsEnabled: true,
    hostMetricsIntervalSeconds: 30,
    hostMetricsScrapers: ['CPU', 'MEMORY'] as const,
    resourceDetectors: ['ENV', 'SYSTEM'] as const,
    telemetryFilterPresets: [] as const
  };
}

function prometheusDraft(overrides: Record<string, unknown> = {}) {
  return {
    name: 'payments',
    endpoint: 'https://payments.example.test:9464/metrics',
    intervalSeconds: 30,
    timeoutSeconds: 10,
    headerSecretRefs: [],
    tlsCaProfile: '',
    ...overrides
  };
}
