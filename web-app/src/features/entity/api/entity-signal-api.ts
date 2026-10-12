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

import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';

import { EntityRedSignalContractError, parseEntityRedSignal } from './entity-signal-schema';

const MAX_WINDOW_MS = 24 * 60 * 60 * 1_000;

export async function loadEntityRedSignal(id: number, window: ExactTimeWindow, signal?: AbortSignal) {
  if (!Number.isSafeInteger(id) || id <= 0 || !validWindow(window)) throw new EntityRedSignalContractError();
  const value = await apiMessageGet(
    `/api/entities/${id}/signals/red?start=${window.from}&end=${window.to}`,
    signal ? { signal } : undefined
  );
  return parseEntityRedSignal(value, id, window);
}

function validWindow(window: ExactTimeWindow) {
  return (
    Number.isSafeInteger(window.from) &&
    Number.isSafeInteger(window.to) &&
    window.from > 0 &&
    window.from < window.to &&
    window.to - window.from <= MAX_WINDOW_MS
  );
}
