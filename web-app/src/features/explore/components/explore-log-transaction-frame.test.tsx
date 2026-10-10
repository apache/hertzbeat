/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LogTransactionRows } from './explore-log-transaction-rows';
import type { TFunction } from 'i18next';
import type { LogRow } from '../model/explore-signal-contract';
import { Grid } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TransactionRailFrame } from './explore-log-transaction-frame';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('uses the existing modal Drawer focus boundary on narrow screens and preserves Escape close', async () => {
  vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: false });
  const close = vi.fn();
  render(
    <>
      <button>Behind</button>
      <TransactionRailFrame label="Transaction" onClose={close}>
        <button>First detail action</button>
        <button>Last detail action</button>
      </TransactionRailFrame>
    </>
  );
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  screen.getByRole('button', { name: 'Last detail action' }).focus();
  const end = document.querySelector<HTMLElement>('[data-sentinel="end"]')!;
  end.focus();
  fireEvent.keyDown(end, { key: 'Tab', keyCode: 9 });
  await waitFor(() => expect(document.querySelector('[data-sentinel="start"]')).toBe(document.activeElement));
  fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 });
  expect(close).toHaveBeenCalled();
});
it('keeps desktop inspection nonmodal', () => {
  vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
  render(
    <TransactionRailFrame label="Transaction" onClose={vi.fn()}>
      <button>Inspect</button>
    </TransactionRailFrame>
  );
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
});

it('keeps the selected log inspector inside the native mobile modal and returns row focus', async () => {
  vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: false });
  const row: LogRow = {
    body: 'Related INFO event',
    severityNumber: 9,
    severityText: null,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null,
    logRecordUid: 'uid',
    timeUnixNano: '1000000000',
    observedTimeUnixNano: null
  };
  render(
    <TransactionRailFrame label="Transaction" onClose={vi.fn()}>
      <LogTransactionRows rows={[row]} timeZone="invalid-zone" t={((key: string) => key) as TFunction} />
    </TransactionRailFrame>
  );
  const outer = screen.getByRole('dialog');
  const original = screen.getByRole('button', { name: 'Related INFO event' });
  fireEvent.click(original);
  const inspector = document.getElementById('transaction-log-inspector')!;
  expect(outer.contains(inspector)).toBe(true);
  await waitFor(() => expect(inspector).toBe(document.activeElement));
  fireEvent.keyDown(inspector, { key: 'Escape', keyCode: 27 });
  await waitFor(() => expect(original).toBe(document.activeElement));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});
