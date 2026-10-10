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

import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { buildSignalApiPath } from './explore-api';
import { logAnalysisPath, type LogAnalysisState } from '@/platform/perses';
export function buildLogAnalysisPath(query: LogExploreQuery, window: ExactTimeWindow, analysis: LogAnalysisState) {
  return logAnalysisPath(
    new URLSearchParams(
      buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
    ),
    analysis
  );
}
