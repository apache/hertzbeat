/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  initializationFailedSources,
  instrumentationMetadataState,
  metadataAllowsConfiguration
} from './instrumentation-initialization';

describe('instrumentation initialization model', () => {
  it('keeps initial loading, explicit retry, retained stale data, ready, and failure distinct', () => {
    expect(instrumentationMetadataState({ hasData: false, isPending: true, isFetching: true }, false)).toBe(
      'initial-loading'
    );
    expect(instrumentationMetadataState({ hasData: false, isPending: true, isFetching: true }, true)).toBe('retrying');
    expect(
      instrumentationMetadataState({ hasData: true, isPending: false, isFetching: true, isError: false }, true)
    ).toBe('stale');
    expect(
      instrumentationMetadataState({ hasData: true, isPending: false, isFetching: false, isError: true }, false)
    ).toBe('stale');
    expect(
      instrumentationMetadataState({ hasData: true, isPending: false, isFetching: false, isError: false }, false)
    ).toBe('ready');
    expect(
      instrumentationMetadataState({ hasData: false, isPending: false, isFetching: false, isError: true }, false)
    ).toBe('error');
  });

  it('retries only failed sources and permits configuration with retained profile data', () => {
    expect(initializationFailedSources('ready', 'error')).toEqual(['profiles']);
    expect(initializationFailedSources('stale', 'ready')).toEqual(['catalog']);
    expect(initializationFailedSources('error', 'stale')).toEqual(['catalog', 'profiles']);
    expect(initializationFailedSources('initial-loading', 'ready')).toEqual([]);
    expect(metadataAllowsConfiguration('ready')).toBe(true);
    expect(metadataAllowsConfiguration('stale')).toBe(true);
    expect(metadataAllowsConfiguration('error')).toBe(false);
    expect(metadataAllowsConfiguration('retrying')).toBe(false);
  });
});
