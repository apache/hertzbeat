/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type InstrumentationMetadataSource = 'catalog' | 'profiles';
export type InstrumentationMetadataState = 'initial-loading' | 'retrying' | 'ready' | 'stale' | 'error';

type QueryEvidence = {
  hasData: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
};

export function instrumentationMetadataState(query: QueryEvidence, retrying: boolean): InstrumentationMetadataState {
  if (query.hasData) return query.isError || retrying ? 'stale' : 'ready';
  if (retrying && query.isFetching) return 'retrying';
  if (query.isPending) return 'initial-loading';
  return 'error';
}

export function initializationFailedSources(
  catalog: InstrumentationMetadataState,
  profiles: InstrumentationMetadataState
): InstrumentationMetadataSource[] {
  const failed: InstrumentationMetadataSource[] = [];
  if (catalog === 'error' || catalog === 'stale') failed.push('catalog');
  if (profiles === 'error' || profiles === 'stale') failed.push('profiles');
  return failed;
}

export function metadataAllowsConfiguration(state: InstrumentationMetadataState) {
  return state === 'ready' || state === 'stale';
}
