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

const SESSION_COOKIE_LOCK = 'hertzbeat-ui-session-mutation';
const HEADER_DEADLINE_MS = 30_000;
type Mode = 'shared' | 'exclusive';
type Waiter = { mode: Mode; start: () => void };
const waiters: Waiter[] = [];
let readers = 0;
let writer = false;

/** Orders cookie-bearing response headers, never business bodies or refresh callbacks. */
export function withCookieHeaderAdmission<T>(
  mode: Mode,
  operation: (signal: AbortSignal) => Promise<T>,
  caller?: AbortSignal | null
): Promise<T> {
  const controller = new AbortController();
  const signal = caller ? AbortSignal.any([caller, controller.signal]) : controller.signal;
  const deadline = Date.now() + HEADER_DEADLINE_MS;
  const expire = () => controller.abort(new DOMException('Response headers timed out', 'TimeoutError'));
  const timer = setTimeout(expire, HEADER_DEADLINE_MS);
  const submit = () => {
    if (Date.now() >= deadline) expire();
    signal.throwIfAborted();
    return operation(signal);
  };
  const physical =
    typeof navigator !== 'undefined' && navigator.locks
      ? Promise.resolve().then(() => {
          signal.throwIfAborted();
          return navigator.locks.request(SESSION_COOKIE_LOCK, { mode, signal }, submit);
        })
      : locallyAdmitted(mode, submit, signal);
  let onAbort = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(abortReason(signal));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  // Cancellation bounds the public wait, but the physical callback keeps its
  // lock until transport settlement confirms it cannot process later headers.
  return Promise.race([physical, cancelled]).finally(() => {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  });
}

function locallyAdmitted<T>(mode: Mode, operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cancel = () => {
      const index = waiters.indexOf(waiter);
      if (index < 0) return; // Active transport must settle before releasing admission.
      waiters.splice(index, 1);
      signal.removeEventListener('abort', cancel);
      reject(abortReason(signal));
      drain();
    };
    const waiter: Waiter = {
      mode,
      start: () => {
        signal.removeEventListener('abort', cancel);
        if (mode === 'exclusive') writer = true;
        else readers += 1;
        const release = () => {
          if (mode === 'exclusive') writer = false;
          else readers -= 1;
          drain();
        };
        void Promise.resolve()
          .then(operation)
          .then(
            value => {
              release();
              resolve(value);
            },
            reason => {
              release();
              reject(transportError(reason));
            }
          );
      }
    };
    waiters.push(waiter);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    else drain();
  });
}

function drain() {
  if (writer) return;
  while (waiters.length) {
    const first = waiters[0]!;
    if (first.mode === 'exclusive') {
      if (readers === 0) waiters.shift()!.start();
      return;
    }
    waiters.shift()!.start();
  }
}

function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error || reason instanceof DOMException
    ? reason
    : new DOMException('Request cancelled', 'AbortError');
}

function transportError(reason: unknown): Error {
  return reason instanceof Error || reason instanceof DOMException
    ? reason
    : new Error('Response headers failed', { cause: reason });
}
