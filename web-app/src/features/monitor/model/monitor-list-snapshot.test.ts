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

import { describe, expect, it } from 'vitest';

import type { Monitor, MonitorPage } from './monitor-contract';
import {
  expireMonitorListSnapshot,
  monitorDisappearanceGraceMs,
  reconcileAutomaticMonitorSnapshot,
  resetMonitorListSnapshot
} from './monitor-list-snapshot';

describe('monitor list snapshot reconciliation', () => {
  it('keeps an automatically disappeared row for exactly five seconds', () => {
    const initial = resetMonitorListSnapshot(page([monitor(7), monitor(8)]));
    const reconciled = reconcileAutomaticMonitorSnapshot(initial, page([monitor(7)]), 1_000);

    expect(reconciled.content).toMatchObject([
      { id: 7, displayState: 'active' },
      { id: 8, displayState: 'disappeared', disappearedAt: 1_000 }
    ]);
    expect(expireMonitorListSnapshot(reconciled, 1_000 + monitorDisappearanceGraceMs - 1).content).toHaveLength(2);
    expect(expireMonitorListSnapshot(reconciled, 1_000 + monitorDisappearanceGraceMs).content).toEqual([
      expect.objectContaining({ id: 7, displayState: 'active' })
    ]);
  });

  it('restores a row that reappears before its deadline', () => {
    const initial = resetMonitorListSnapshot(page([monitor(7), monitor(8)]));
    const disappeared = reconcileAutomaticMonitorSnapshot(initial, page([monitor(7)]), 1_000);
    const restored = reconcileAutomaticMonitorSnapshot(
      disappeared,
      page([monitor(7), { ...monitor(8), name: 'monitor-8-restored' }]),
      2_000
    );

    expect(restored.content).toMatchObject([
      { id: 7, displayState: 'active' },
      { id: 8, name: 'monitor-8-restored', displayState: 'active' }
    ]);
    expect(expireMonitorListSnapshot(restored, 10_000).content).toHaveLength(2);
  });

  it.each(['pagination', 'filter', 'manual-refresh', 'post-write'] as const)(
    'treats a %s read as an authoritative result-set replacement',
    () => {
      const initial = resetMonitorListSnapshot(page([monitor(7), monitor(8)]));
      const replaced = resetMonitorListSnapshot(page([monitor(7)]));

      expect(replaced.content).toEqual([expect.objectContaining({ id: 7, displayState: 'active' })]);
      expect(replaced.content).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 8 })]));
      expect(initial.content).toHaveLength(2);
    }
  );
});

function page(content: Monitor[]): MonitorPage {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 10
  };
}

function monitor(id: number): Monitor {
  return { id, name: `monitor-${id}`, app: 'website', instance: `instance-${id}`, status: 1 };
}
