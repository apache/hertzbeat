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

const CHANNEL_NAME = 'hertzbeat-ui-session';
const SESSION_CHANGED_EVENT = { type: 'session-changed', version: 1 } as const;

export type SessionConvergencePort = {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(value: unknown): void;
  close(): void;
};

export type SessionConvergencePortFactory = (name: string) => SessionConvergencePort | undefined;

export function createSessionConvergenceChannel(
  onSessionChanged: () => void,
  createPort: SessionConvergencePortFactory = createBrowserPort
) {
  const port = safelyCreatePort(createPort);
  if (!port) return { broadcast: () => undefined, close: () => undefined };
  const receive = (event: MessageEvent<unknown>) => {
    if (isSessionChangedEvent(event.data)) onSessionChanged();
  };
  port.addEventListener('message', receive);
  return {
    broadcast: () => port.postMessage(SESSION_CHANGED_EVENT),
    close: () => {
      port.removeEventListener('message', receive);
      port.close();
    }
  };
}

function safelyCreatePort(createPort: SessionConvergencePortFactory) {
  try {
    return createPort(CHANNEL_NAME);
  } catch {
    return undefined;
  }
}

function createBrowserPort(name: string): SessionConvergencePort | undefined {
  return typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(name);
}

function isSessionChangedEvent(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (Reflect.ownKeys(value).length !== 2) return false;
  const event = value as Record<string, unknown>;
  return event.type === SESSION_CHANGED_EVENT.type && event.version === SESSION_CHANGED_EVENT.version;
}
