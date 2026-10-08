/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TFunction } from 'i18next';
import { useEffect, useRef, type RefObject } from 'react';

import type { ExplorePageResultState } from '../model/explore-result-model';
import type { ExploreSignal } from '../model/explore-model';
import styles from './explore-result-announcer.module.css';

const ANNOUNCEMENT_DURATION_MS = 4_000;

type ResultSnapshot = {
  key: string;
  queryIdentity: string;
  signal: ExploreSignal;
  count: number;
};

export function ExploreResultAnnouncer({
  result,
  queryIdentity,
  t
}: {
  result: ExplorePageResultState;
  queryIdentity: string;
  t: TFunction;
}) {
  const snapshot = completedResultSnapshot(result, queryIdentity);
  const previous = useRef<ResultSnapshot | undefined>(undefined);
  const announcedKey = useRef<string | undefined>(undefined);
  const liveRegion = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const snapshotKey = snapshot?.key;
  const snapshotSignal = snapshot?.signal;
  const snapshotCount = snapshot?.count;

  useEffect(() => {
    const region = liveRegion.current;
    if (!region) return undefined;
    if (snapshotKey == null) {
      if (timer.current != null) window.clearTimeout(timer.current);
      region.textContent = '';
      announcedKey.current = undefined;
      return undefined;
    }
    if (snapshotSignal == null || snapshotCount == null) return undefined;
    if (announcedKey.current === snapshotKey) return undefined;
    const prior = previous.current;
    const sameQuery = isSameQuery(prior, queryIdentity, snapshotSignal);
    if (sameQuery && prior.count === snapshotCount) {
      previous.current = { key: snapshotKey, queryIdentity, signal: snapshotSignal, count: snapshotCount };
      announcedKey.current = snapshotKey;
      return undefined;
    }
    const countChanged = sameQuery && prior.count !== snapshotCount;
    const message = countChanged
      ? t('explore.accessibility.resultCountChanged', { count: snapshotCount })
      : t('explore.accessibility.queryCompleted', { count: snapshotCount });
    previous.current = { key: snapshotKey, queryIdentity, signal: snapshotSignal, count: snapshotCount };
    announcedKey.current = snapshotKey;
    region.textContent = message;
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (region.textContent === message) region.textContent = '';
    }, ANNOUNCEMENT_DURATION_MS);
    return undefined;
  }, [queryIdentity, snapshotCount, snapshotKey, snapshotSignal, t]);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    []
  );
  return <ResultLiveRegion regionRef={liveRegion} t={t} />;
}

function ResultLiveRegion({ regionRef, t }: { regionRef: RefObject<HTMLSpanElement>; t: TFunction }) {
  return (
    <span
      ref={regionRef}
      className={styles.liveStatus}
      role="status"
      aria-label={t('explore.accessibility.queryUpdates')}
      aria-live="polite"
      aria-atomic="true"
    />
  );
}

function isSameQuery(
  prior: ResultSnapshot | undefined,
  queryIdentity: string,
  signal: ExploreSignal
): prior is ResultSnapshot {
  return prior?.queryIdentity === queryIdentity && prior.signal === signal;
}

function completedResultSnapshot(result: ExplorePageResultState, queryIdentity: string): ResultSnapshot | undefined {
  if (result.kind === 'metric') {
    if (result.state.kind !== 'ready' && result.state.kind !== 'empty') return undefined;
    return {
      key: `${queryIdentity}:metrics:${result.revision}:${result.window.from}:${result.window.to}`,
      queryIdentity,
      signal: 'metrics',
      count: result.state.kind === 'ready' ? result.state.series.length : 0
    };
  }
  if (result.kind !== 'ready' && result.kind !== 'empty') return undefined;
  return {
    key: `${queryIdentity}:${result.signal}:${result.revision}:${result.window.from}:${result.window.to}`,
    queryIdentity,
    signal: result.signal,
    count: result.data.totalElements
  };
}
