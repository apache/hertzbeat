/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useRef, useState } from 'react';

import type { CollectorRuntimeSaveState } from '../model/collector-runtime-report-model';
import { waitForCollectorRuntimeApplication } from './collector-runtime-report-convergence';

export function useCollectorRuntimeApplicationController() {
  const operationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<CollectorRuntimeSaveState | null>(null);
  useEffect(
    () => () => {
      operationRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );
  const track = (collector: string, revision: number) => {
    const operation = ++operationRef.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setState({
      kind: 'management-saved',
      collector,
      revision,
      application: { kind: 'unknown', expectedRevision: revision, reason: 'not-reported' }
    });
    void waitForCollectorRuntimeApplication(collector, revision, { signal: abort.signal }).then(
      application => {
        if (operation !== operationRef.current) return;
        setState({ kind: 'management-saved', collector, revision, application });
      },
      () => undefined
    );
  };
  return { state, track };
}
