/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { parseInstrumentationProgress, writeInstrumentationProgress } from './instrumentation-progress';

describe('instrumentation progress URL contract', () => {
  it.each([
    ['instrumentationSchemaVersion=1&instrumentationStage=2', 2],
    ['instrumentationSchemaVersion=1&instrumentationStage=4', 1],
    ['instrumentationSchemaVersion=1&instrumentationStage=unknown', 1],
    ['', 1]
  ])('restores only a valid persisted setup stage from %s', (query, expectedStage) => {
    const progress = parseInstrumentationProgress(new URLSearchParams(query), {});

    expect(progress.stage).toBe(expectedStage);
    expect(progress.draft.environment).toBe('docker');
    expect(progress.draft.platform).toBe('linux_amd64');
  });

  it('restores the non-sensitive selection and shared service scope without restoring a token', () => {
    const progress = parseInstrumentationProgress(
      new URLSearchParams(
        'instrumentationSchemaVersion=1&instrumentationStage=3&instrumentationEnvironment=docker' +
          '&instrumentationPlatform=linux_amd64&instrumentationLanguage=go' +
          '&instrumentationFramework=go_generic&instrumentationMethod=sdk&token=must-not-survive'
      ),
      {
        collectorId: 'collector-east',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        instance: 'checkout-7d9',
        endpoint: '/checkout'
      }
    );

    expect(progress).toEqual({
      stage: 3,
      mismatch: false,
      draft: {
        environment: 'docker',
        platform: 'linux_amd64',
        selection: {
          language: 'go',
          framework: 'go_generic',
          method: 'sdk',
          environment: 'docker',
          platform: 'linux_amd64'
        },
        collectorId: 'collector-east',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        serviceEnvironment: 'prod',
        serviceInstanceId: 'checkout-7d9',
        endpoint: '/checkout'
      }
    });
    expect(JSON.stringify(progress)).not.toContain('must-not-survive');
  });

  it('fails a partial or unsupported persisted selection closed', () => {
    for (const query of [
      'instrumentationSchemaVersion=1&instrumentationLanguage=go&instrumentationFramework=go_generic',
      'instrumentationSchemaVersion=2&instrumentationLanguage=go&instrumentationFramework=go_generic' +
        '&instrumentationMethod=sdk'
    ]) {
      const progress = parseInstrumentationProgress(new URLSearchParams(query), {});
      expect(progress.stage).toBe(1);
      expect(progress.mismatch).toBe(true);
      expect(progress.draft.selection).toBeUndefined();
    }
  });

  it('preserves non-sensitive context while removing sensitive fields and caps restored progress', () => {
    const sensitiveKeys = ['token', 'access_token', 'AUTHORIZATION', 'clientSecret', 'installLog', 'telemetryBody'];
    const source = new URLSearchParams(
      'signal=metrics&collectorId=collector-east&serviceName=checkout-api' +
        '&environment=prod&token=plain&access_token=plain&AUTHORIZATION=plain' +
        '&clientSecret=plain&installLog=plain&telemetryBody=plain'
    );
    const next = writeInstrumentationProgress(
      source,
      {
        environment: 'docker',
        platform: 'linux_amd64',
        selection: {
          language: 'go',
          framework: 'go_generic',
          method: 'sdk',
          environment: 'docker',
          platform: 'linux_amd64'
        },
        collectorId: 'collector-east',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        serviceEnvironment: 'prod'
      },
      5
    );

    expect(next.get('instrumentationStage')).toBe('3');
    expect(next.get('instrumentationSchemaVersion')).toBe('1');
    expect(next.get('instrumentationLanguage')).toBe('go');
    expect(next.get('collectorId')).toBe('collector-east');
    expect(next.get('serviceName')).toBe('checkout-api');
    expect(next.get('environment')).toBe('prod');
    for (const key of sensitiveKeys) expect(next.has(key)).toBe(false);
    expect(next.toString()).not.toContain('plain');
  });
});
