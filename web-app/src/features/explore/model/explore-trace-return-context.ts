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

import type { ExactTimeWindow } from '@/shared/query-context';
import type { ExploreQuery } from './explore-query';
import { buildExplorePath, normalizeExploreReturnTo } from './explore-url-model';

export function traceReturnTo(source: ExploreQuery, window: ExactTimeWindow) {
  if (
    source.signal === 'traces' &&
    source.traceId &&
    source.start == null &&
    source.end == null &&
    source.timeZone == null
  ) {
    return normalizeExploreReturnTo(buildExplorePath({ ...source, returnTo: undefined }));
  }
  return (
    normalizeExploreReturnTo(source.returnTo) ??
    normalizeExploreReturnTo(
      buildExplorePath({
        ...source,
        start: window.from,
        end: window.to,
        windowMode: undefined,
        autoRefreshMs: undefined,
        returnTo: undefined
      })
    )
  );
}
