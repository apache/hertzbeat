/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  parseInstrumentationProgress,
  writeInstrumentationProgress
} from './instrumentation-progress';

describe('instrumentation progress URL contract', () => {
  it('restores the non-sensitive selection and shared service scope without restoring a token', () => {
    const progress = parseInstrumentationProgress(new URLSearchParams(
      'instrumentationSchemaVersion=1&instrumentationStage=3&instrumentationEnvironment=docker'
      + '&instrumentationPlatform=linux_amd64&instrumentationLanguage=go'
      + '&instrumentationFramework=go_generic&instrumentationMethod=sdk&token=must-not-survive'
    ), {
      collectorId: 'collector-east', serviceName: 'checkout-api', serviceNamespace: 'commerce', environment: 'prod'
    });

    expect(progress).toEqual({
      stage: 3,
      mismatch: false,
      draft: {
        environment: 'docker', platform: 'linux_amd64',
        selection: {
          language: 'go', framework: 'go_generic', method: 'sdk',
          environment: 'docker', platform: 'linux_amd64'
        },
        collectorId: 'collector-east', serviceName: 'checkout-api',
        serviceNamespace: 'commerce', serviceEnvironment: 'prod'
      }
    });
    expect(JSON.stringify(progress)).not.toContain('must-not-survive');
  });

  it('fails a partial or unsupported persisted selection closed', () => {
    for (const query of [
      'instrumentationSchemaVersion=1&instrumentationLanguage=go&instrumentationFramework=go_generic',
      'instrumentationSchemaVersion=2&instrumentationLanguage=go&instrumentationFramework=go_generic'
        + '&instrumentationMethod=sdk'
    ]) {
      const progress = parseInstrumentationProgress(new URLSearchParams(query), {});
      expect(progress.stage).toBe(1);
      expect(progress.mismatch).toBe(true);
      expect(progress.draft.selection).toBeUndefined();
    }
  });

  it('writes only the allowlisted recoverable fields and caps restored progress before guide rendering', () => {
    const source = new URLSearchParams('signal=metrics&collectorId=collector-east&serviceName=checkout-api');
    const next = writeInstrumentationProgress(source, {
      environment: 'docker', platform: 'linux_amd64',
      selection: {
        language: 'go', framework: 'go_generic', method: 'sdk',
        environment: 'docker', platform: 'linux_amd64'
      },
      collectorId: 'collector-east', serviceName: 'checkout-api',
      serviceNamespace: 'commerce', serviceEnvironment: 'prod'
    }, 5);

    expect(next.get('instrumentationStage')).toBe('3');
    expect(next.get('instrumentationSchemaVersion')).toBe('1');
    expect(next.get('instrumentationLanguage')).toBe('go');
    expect(next.get('collectorId')).toBe('collector-east');
    expect(next.get('serviceName')).toBe('checkout-api');
    expect(next.toString()).not.toMatch(/token|secret|authorization/i);
  });
});
