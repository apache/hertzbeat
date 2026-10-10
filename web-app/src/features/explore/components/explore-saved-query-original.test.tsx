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

import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { buildSavedQueryPayload, type SavedQueryRecord } from '../model/explore-saved-query-model';
import { SavedQueryOriginal } from './explore-saved-query-original';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fixture(): SavedQueryRecord {
  const query = {
    signal: 'logs' as const,
    searchSyntax: 'structured-v1' as const,
    query: '@proof.value:' + JSON.stringify('café 😀 "quoted" \\ (AND OR)'),
    timeRange: 'last-30m' as const,
    start: 100000,
    end: 200000,
    timeZone: 'Asia/Shanghai',
    serviceName: 'café-service'
  };
  return {
    ...buildSavedQueryPayload(query, 'export-proof', 'Café 😀 "label" \\ tail', 'Description "quoted" \\ path'),
    id: 42,
    revision: 3,
    creator: 'operator-é',
    querySnapshot: JSON.stringify(query),
    createTime: '2026-10-04T01:00:00Z',
    updateTime: null
  };
}

function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Synthetic Blob read failed'));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Expected exported Blob bytes'));
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(blob);
  });
}

it.each(['complete', 'optional-absent'] as const)(
  'exports the exact %s record as UTF-8 JSON and cleans each temporary download URL',
  async variant => {
    const full = fixture();
    const record: SavedQueryRecord =
      variant === 'complete'
        ? full
        : {
            signal: full.signal,
            viewKey: full.viewKey,
            label: full.label,
            route: full.route,
            description: undefined,
            revision: undefined,
            payload: undefined
          };
    const before = structuredClone(record);
    render(
      <I18nextProvider i18n={i18n}>
        <SavedQueryOriginal record={record} onClose={() => {}} />
      </I18nextProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: i18n.t('exploreSaved.original') });
    const expected = JSON.stringify(record, null, 2);
    expect(dialog.querySelector('pre')?.textContent).toBe(expected);
    const artifacts: Blob[] = [];
    const urls = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      if (!(blob instanceof Blob)) throw new Error('Expected a Blob export');
      artifacts.push(blob);
      return `blob:synthetic-export-${artifacts.length}`;
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const links: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.isConnected).toBe(true);
      links.push(this);
    });
    vi.useFakeTimers();
    for (let index = 0; index < 2; index++) {
      fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.export') }));
      expect(urls).toHaveBeenCalledTimes(index + 1);
      expect(click).toHaveBeenCalledTimes(index + 1);
      expect(revoke).toHaveBeenCalledTimes(index);
      expect(links[index]?.download).toBe('saved-query-logs-export-proof.json');
      expect(links[index]?.href).toBe(`blob:synthetic-export-${index + 1}`);
      expect(links[index]?.rel).toBe('noopener');
      expect(links[index]?.isConnected).toBe(false);
      vi.runOnlyPendingTimers();
      expect(revoke).toHaveBeenNthCalledWith(index + 1, `blob:synthetic-export-${index + 1}`);
    }
    vi.useRealTimers();
    for (const blob of artifacts) {
      expect(blob.type).toBe('application/json');
      const bytes = await blobBytes(blob);
      expect([...bytes]).toEqual([...new TextEncoder().encode(expected)]);
      expect(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))).toEqual(JSON.parse(expected));
    }
    expect(record).toEqual(before);
  }
);
