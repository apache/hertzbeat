/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  initializationFailedSources,
  instrumentationMetadataState,
  type InstrumentationMetadataSource
} from '../model/instrumentation-initialization';

type MetadataQuery = {
  data: unknown;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
};

export function useInstrumentationInitialization(catalogQuery: MetadataQuery, profilesQuery: MetadataQuery) {
  const [retryingSources, setRetryingSources] = useState<InstrumentationMetadataSource[]>([]);
  const retryRef = useRef<Promise<void> | null>(null);
  const catalogState = instrumentationMetadataState(queryEvidence(catalogQuery), retryingSources.includes('catalog'));
  const profilesState = instrumentationMetadataState(
    queryEvidence(profilesQuery),
    retryingSources.includes('profiles')
  );
  const failedSources = useMemo(
    () => initializationFailedSources(catalogState, profilesState),
    [catalogState, profilesState]
  );
  const retryInitialization = useCallback(() => {
    if (retryRef.current) return retryRef.current;
    if (failedSources.length === 0) return Promise.resolve();
    setRetryingSources(failedSources);
    const retry = Promise.allSettled(
      failedSources.map(source => (source === 'catalog' ? catalogQuery.refetch() : profilesQuery.refetch()))
    )
      .then(() => undefined)
      .finally(() => {
        retryRef.current = null;
        setRetryingSources([]);
      });
    retryRef.current = retry;
    return retry;
  }, [catalogQuery, failedSources, profilesQuery]);
  return {
    catalogState,
    profilesState,
    initializationRetrying: retryingSources.length > 0,
    retryInitialization
  };
}

function queryEvidence(query: MetadataQuery) {
  return {
    hasData: query.data !== undefined,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError
  };
}
