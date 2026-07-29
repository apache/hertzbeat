/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
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

import { describe, expect, it, vi } from 'vitest';

import {
  createSessionConvergenceChannel,
  type SessionConvergencePort,
  type SessionConvergencePortFactory
} from './session-convergence-channel';

describe('session convergence channel', () => {
  it('publishes and accepts only the fixed identity-free event', () => {
    const port = new FakePort();
    const listener = vi.fn();
    const channel = createSessionConvergenceChannel(listener, createPortFactory(port));

    channel.broadcast();
    expect(port.published).toEqual([{ type: 'session-changed', version: 1 }]);

    port.deliver({ type: 'session-changed', version: 1 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it.each([
    undefined,
    null,
    'session-changed',
    { type: 'session-changed' },
    { type: 'session-changed', version: 2 },
    { type: 'other', version: 1 },
    { type: 'session-changed', version: 1, session: { authenticated: true } },
    { type: 'session-changed', version: 1, token: 'secret' },
    { type: 'session-changed', version: 1, roles: ['ADMIN'] }
  ])('rejects malformed or identity-bearing input %#', value => {
    const port = new FakePort();
    const listener = vi.fn();
    createSessionConvergenceChannel(listener, createPortFactory(port));

    port.deliver(value);

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes and closes without notifying after retirement', () => {
    const port = new FakePort();
    const listener = vi.fn();
    const channel = createSessionConvergenceChannel(listener, createPortFactory(port));

    channel.close();
    port.deliver({ type: 'session-changed', version: 1 });

    expect(listener).not.toHaveBeenCalled();
    expect(port.closed).toBe(true);
  });

  it('fails soft without exposing a BroadcastChannel construction failure', () => {
    const listener = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const create = () =>
      createSessionConvergenceChannel(listener, () => {
        throw new Error('private browser failure detail');
      });

    expect(create).not.toThrow();
    const channel = create();
    expect(() => {
      channel.broadcast();
      channel.close();
    }).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

class FakePort implements SessionConvergencePort {
  readonly published: unknown[] = [];
  closed = false;
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.delete(listener);
  }

  postMessage(value: unknown) {
    this.published.push(value);
  }

  close() {
    this.closed = true;
  }

  deliver(data: unknown) {
    for (const listener of this.listeners) listener({ data } as MessageEvent<unknown>);
  }
}

function createPortFactory(port: SessionConvergencePort): SessionConvergencePortFactory {
  return () => port;
}
