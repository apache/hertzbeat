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

const MIN_SETUP_POLL_MILLIS = 250;
const MAX_SETUP_POLL_MILLIS = 5_000;

export function setupPollDelay(hintMillis = 0, failedAttempts = 0) {
  const base = Math.min(MAX_SETUP_POLL_MILLIS, Math.max(MIN_SETUP_POLL_MILLIS, hintMillis));
  return Math.min(MAX_SETUP_POLL_MILLIS, base * 2 ** failedAttempts);
}
