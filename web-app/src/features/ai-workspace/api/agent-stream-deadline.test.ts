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

import { afterEach, expect, it, vi } from 'vitest';
import { readAgentStreamChunk } from './agent-stream-deadline';
afterEach(() => vi.useRealTimers());
it('stops silent observation and cancels the local reader', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn().mockResolvedValue(undefined);
  const reader = {
    read: vi.fn(() => new Promise(() => {})),
    cancel
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
  const result = readAgentStreamChunk(reader, 100).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(101);
  expect(await result).toBeInstanceOf(Error);
  expect(cancel).toHaveBeenCalledOnce();
});
it('does not expire an active stream and cleans up its timer', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const reader = {
    read: vi.fn().mockResolvedValue({ done: false, value: new Uint8Array([1]) }),
    cancel
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
  expect((await readAgentStreamChunk(reader, 100)).done).toBe(false);
  await vi.advanceTimersByTimeAsync(101);
  expect(cancel).not.toHaveBeenCalled();
});
