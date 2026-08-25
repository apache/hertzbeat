/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';

import { loadAlertGroups } from '../api/alert-api';
import { collectAlertCenterGroups } from '../model/alert-center-page-collection';
import { maximumAlertEvidenceIds, type AlertQuery } from '../model/alert-model';

/** Prepares one exact, bounded ID snapshot before the destructive confirmation step. */
export function useAlertCenterDeleteScope(query: AlertQuery) {
  const active = useRef<AbortController | null>(null);

  const cancelPreparation = useCallback(() => {
    active.current?.abort();
    active.current = null;
  }, []);

  useEffect(() => cancelPreparation, [cancelPreparation]);

  const prepareFiltered = useCallback(async () => {
    cancelPreparation();
    const request = new AbortController();
    active.current = request;
    try {
      const groups = await collectAlertCenterGroups(query, loadAlertGroups, request.signal, maximumAlertEvidenceIds);
      return groups.map(group => group.id);
    } finally {
      if (active.current === request) active.current = null;
    }
  }, [cancelPreparation, query]);

  return { cancelPreparation, prepareFiltered };
}
