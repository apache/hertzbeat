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
import { readEventStream } from './agent-gateway-api';

const event = (type = 'MESSAGE_DELTA') => ({
  type,
  eventId: 'event-1',
  conversationId: 'conversation-1',
  sessionUid: 'session-1',
  runUid: 'run_1',
  itemId: null,
  payload: {},
  timestamp: 1
});
const frame = (value: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);

function openStream(value?: unknown) {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (value !== undefined) controller.enqueue(frame(value));
    },
    cancel
  });
  return { stream, cancel };
}

describe('agent response body ownership', () => {
  it('cancels an unread body after invalid JSON instead of only releasing its reader', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {invalid}\n\n'));
      },
      cancel
    });
    await expect(readEventStream(stream, vi.fn())).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it('cancels a body when its consumer throws, preserving the failure', async () => {
    const { stream, cancel } = openStream(event());
    await expect(
      readEventStream(stream, () => {
        throw new Error('consumer failed');
      })
    ).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it('releases a completed run without waiting for the server to close the TCP response', async () => {
    const { stream, cancel } = openStream(event('RUN_COMPLETED'));
    const receive = vi.fn();
    await readEventStream(stream, receive);
    expect(receive).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it('cancels a pending reader on caller abort and never delivers a late event', async () => {
    const { stream, cancel } = openStream();
    const abort = new AbortController();
    const receive = vi.fn();
    const result = readEventStream(stream, receive, abort.signal);
    abort.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalledOnce();
    expect(receive).not.toHaveBeenCalled();
    expect(stream.locked).toBe(false);
  });

  it('does not publish a later buffered event after its consumer switches session', async () => {
    const abort = new AbortController();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const first = new TextDecoder().decode(frame(event()));
        const second = new TextDecoder().decode(frame({ ...event(), eventId: 'late-event' }));
        controller.enqueue(new TextEncoder().encode(first + second));
      },
      cancel
    });
    const receive = vi.fn(() => abort.abort());
    await expect(readEventStream(stream, receive, abort.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(receive).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it('does not cancel observation on an ordinary tool or intermediate status event', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(frame(event('TOOL_COMPLETED')));
        controller.enqueue(frame({ ...event('RUN_STATUS'), payload: { status: 'RUNNING' } }));
        controller.close();
      },
      cancel
    });
    const receive = vi.fn();
    await readEventStream(stream, receive);
    expect(receive).toHaveBeenCalledTimes(2);
    expect(cancel).not.toHaveBeenCalled();
    expect(stream.locked).toBe(false);
  });
});
