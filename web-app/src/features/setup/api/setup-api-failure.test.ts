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

import { loadSetupStatus, SetupRequestError } from './setup-api';

describe('setup API transport failure', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves an Error-backed DOM AbortError instead of turning it into unavailable evidence', async () => {
    const cancellation = new Error('Caller cancelled');
    cancellation.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(cancellation));

    await expect(loadSetupStatus()).rejects.toBe(cancellation);
  });

  it('classifies a real apiFetch rejection as unavailable without exposing its message', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('private network detail')));

    const failure = await captureFailure(loadSetupStatus());
    expect(failure instanceof SetupRequestError).toBe(true);
    if (!(failure instanceof SetupRequestError)) throw new Error('Expected a typed setup failure');
    expect(failure.kind).toBe('unavailable');
    expect(failure.message).toBe('Setup request failed');
  });
});

async function captureFailure(request: Promise<unknown>) {
  try {
    await request;
  } catch (error) {
    return error;
  }
  throw new Error('Expected setup request to fail');
}
