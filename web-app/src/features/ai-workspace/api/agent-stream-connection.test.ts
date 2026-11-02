/// <reference types="node" />
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

import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { readEventStream } from './agent-gateway-api';

const terminal = {
  type: 'RUN_COMPLETED',
  eventId: 'done',
  conversationId: null,
  sessionUid: null,
  runUid: 'run_1',
  itemId: null,
  payload: {},
  timestamp: 1
};

describe('real local SSE connection cleanup', () => {
  it.each(['invalid-frame', 'terminal-event'] as const)('closes native fetch transport on %s', async mode => {
    let closed!: () => void;
    const disconnected = new Promise<void>(resolve => {
      closed = resolve;
    });
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' });
      response.on('close', closed);
      response.write(mode === 'invalid-frame' ? 'data: {broken}\n\n' : `data: ${JSON.stringify(terminal)}\n\n`);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Local fixture did not bind TCP');
    const abort = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/stream`, { signal: abort.signal });
      if (mode === 'invalid-frame') await expect(readEventStream(response.body!, () => {})).rejects.toThrow();
      else await readEventStream(response.body!, () => {});
      await Promise.race([
        disconnected,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Response connection was not closed')), 1500);
        })
      ]);
      expect(response.body!.locked).toBe(false);
    } finally {
      clearTimeout(timeout);
      abort.abort();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});
