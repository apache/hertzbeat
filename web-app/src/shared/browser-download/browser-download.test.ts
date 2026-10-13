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

import { afterEach, describe, expect, it, vi } from 'vitest';

import { safeDownloadFilename, saveBrowserDownload } from './browser-download';

describe('browser download', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('accepts encoded leaf filenames but rejects unsafe or malformed values', () => {
    expect(safeDownloadFilename("attachment; filename*=UTF-8''alerts%20prod.json", 'fallback.json')).toBe(
      'alerts prod.json'
    );
    expect(safeDownloadFilename('attachment; filename="../../alerts.json"', 'fallback.json')).toBe('alerts.json');
    expect(safeDownloadFilename('attachment; filename="%E0%A4%A"', 'fallback.json')).toBe('%E0%A4%A');
    expect(safeDownloadFilename('attachment; filename=".."', 'fallback.json')).toBe('fallback.json');
    expect(safeDownloadFilename('attachment; filename="bad\u0007.json"', 'fallback.json')).toBe('fallback.json');
  });

  it('clicks a detached-safe download and revokes its object URL', () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const link = { click, remove, href: '', download: '', rel: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLAnchorElement);
    const append = vi.spyOn(document.body, 'append').mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    saveBrowserDownload({ data: new Blob(['rules']), filename: 'rules.json' });

    expect(link).toMatchObject({ href: 'blob:download', download: 'rules.json', rel: 'noopener' });
    expect(append).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
  });
});
