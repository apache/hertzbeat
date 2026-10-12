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

import { useState } from 'react';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { parseLogFilterExpression } from '../model/explore-log-filter-expression';
import type { LogQueryEditorMode } from './explore-log-query-builder';
export const LOG_QUERY_EDITOR_MODE_STORAGE_KEY = 'hertzbeat.explore.logs.query-mode';

export function useLogEditorMode(draft: ExploreSubmissionViewModel['draft']) {
  const [preference, setPreference] = useState<LogQueryEditorMode>(readLogEditorPreference);
  const lossless =
    draft.signal !== 'logs' ||
    (parseLogFilterExpression(draft.resourceFilter).valid && parseLogFilterExpression(draft.attributeFilter).valid);
  const mode: LogQueryEditorMode = lossless ? preference : 'code';
  // Keep a forced Code session open while the user repairs an imported expression.
  if (!lossless && preference !== 'code') setPreference('code');
  const changeMode = (next: LogQueryEditorMode) => {
    if (next === 'builder' && !lossless) return;
    setPreference(next);
    try {
      globalThis.localStorage?.setItem(LOG_QUERY_EDITOR_MODE_STORAGE_KEY, next);
    } catch {
      // The in-memory preference remains usable when storage is restricted.
    }
  };
  return { mode, lossless, changeMode };
}

function readLogEditorPreference(): LogQueryEditorMode {
  try {
    return globalThis.localStorage?.getItem(LOG_QUERY_EDITOR_MODE_STORAGE_KEY) === 'code' ? 'code' : 'builder';
  } catch {
    return 'builder';
  }
}
