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

const STREAM_IDLE_TIMEOUT_MS = 90_000;

/** Heartbeats and public events extend observation; silence cannot leave an endless pending UI. */
export async function readAgentStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = STREAM_IDLE_TIMEOUT_MS
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Agent stream observation timed out'));
      void reader.cancel().catch(() => undefined);
    }, timeoutMs);
  });
  try {
    return await Promise.race([reader.read(), idle]);
  } finally {
    clearTimeout(timer);
  }
}
