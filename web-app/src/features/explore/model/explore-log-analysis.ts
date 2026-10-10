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

import { logAnalysisDraftSchema, type LogAnalysisState, type LogAnalysisResult } from '@/platform/perses';
export function readLogAnalysisDraft(raw: string | undefined): LogAnalysisState | undefined {
  if (!raw || raw.length > 65535) return undefined;
  try {
    const parsed = logAnalysisDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function hasUnsupportedLegacyLogAnalysis(raw: string | undefined) {
  const state = readLogAnalysisDraft(raw);
  return Boolean(
    state &&
    (state.representation === 'table' || state.representation === 'toplist') &&
    state.additionalMeasures?.length
  );
}

export type LogAnalysisLoad = {
  state: 'idle' | 'loading' | 'ready' | 'error' | 'permission' | 'unavailable' | 'interval_too_small';
  data: LogAnalysisResult | undefined;
  retry: () => void;
};
