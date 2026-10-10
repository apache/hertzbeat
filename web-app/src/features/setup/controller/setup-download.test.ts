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

import { describe, expect, it, vi } from 'vitest';

import { downloadSetupArtifact } from './setup-download';

describe('setup download adapter', () => {
  it('clicks an attachment URL and revokes it immediately', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { click, remove, download: '', href: '' };
    const createObjectURL = vi.fn(() => 'blob:setup-artifact');
    const revokeObjectURL = vi.fn();
    const createElement = vi.fn(() => anchor);
    const append = vi.fn();

    downloadSetupArtifact(
      { blob: new Blob(['opaque']), fileName: 'hertzbeat-setup.env', mediaType: 'text/plain' },
      { createObjectURL, revokeObjectURL },
      { createElement, body: { append } }
    );

    expect(anchor).toMatchObject({ download: 'hertzbeat-setup.env', href: 'blob:setup-artifact' });
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:setup-artifact');
  });
});
