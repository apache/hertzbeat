/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type MutableRefObject } from 'react';

import type { MonitorPage } from '../model/monitor-contract';
import {
  expireMonitorListSnapshot,
  nextMonitorDisappearanceDeadline,
  reconcileAutomaticMonitorSnapshot,
  resetMonitorListSnapshot,
  type MonitorListSnapshot
} from '../model/monitor-list-snapshot';

type MonitorListReadMode = 'idle' | 'automatic' | 'authoritative';
export type MonitorListReadModeRef = MutableRefObject<MonitorListReadMode>;

type OwnedSnapshot = {
  source: string;
  page: MonitorPage;
  revision: number;
  snapshot: MonitorListSnapshot;
};

/** Owns only the transient rows retained across automatic list refreshes. */
export function useMonitorListSnapshot(
  source: string,
  page: MonitorPage | undefined,
  readModeRef: MonitorListReadModeRef,
  revision = 0
) {
  const [store] = useState(() => new MonitorListSnapshotStore());
  const owned = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useLayoutEffect(() => {
    store.accept(source, page, revision, readModeRef.current, Date.now());
    readModeRef.current = 'idle';
  }, [page, readModeRef, revision, source, store]);

  useEffect(() => {
    if (!owned || owned.source !== source) return;
    const deadline = nextMonitorDisappearanceDeadline(owned.snapshot);
    if (deadline === null) return;
    const timer = setTimeout(
      () => {
        store.expire(source, Date.now());
      },
      Math.max(0, deadline - Date.now())
    );
    return () => clearTimeout(timer);
  }, [owned, source, store]);

  if (!page) return undefined;
  if (owned?.source === source) return owned.snapshot;
  return resetMonitorListSnapshot(page);
}

class MonitorListSnapshotStore {
  private current: OwnedSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  readonly getSnapshot = () => this.current;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  accept(source: string, page: MonitorPage | undefined, revision: number, mode: MonitorListReadMode, now: number) {
    const previous = this.current;
    if (!page) return this.publish(null);
    const automatic = mode === 'automatic' && previous?.source === source;
    const snapshot = automatic
      ? reconcileAutomaticMonitorSnapshot(previous.snapshot, page, now)
      : resetMonitorListSnapshot(page);
    this.publish({ source, page, revision, snapshot });
  }

  expire(source: string, now: number) {
    if (!this.current || this.current.source !== source) return;
    const snapshot = expireMonitorListSnapshot(this.current.snapshot, now);
    if (snapshot !== this.current.snapshot) this.publish({ ...this.current, snapshot });
  }

  private publish(next: OwnedSnapshot | null) {
    if (next === this.current) return;
    this.current = next;
    this.listeners.forEach(listener => listener());
  }
}
