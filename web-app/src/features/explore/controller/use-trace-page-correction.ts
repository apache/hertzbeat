import { readTraceView } from '../model/explore-trace-view';
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

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authoritativePageIndexCorrection } from '@/shared/pagination';
import { buildExplorePath, type ExploreQuery } from '../model/explore-model';
import type { HistoricalEvidence } from '../model/explore-result-model';

type CurrentQuery = {
  data?: HistoricalEvidence | undefined;
  isSuccess: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
};

export function useTracePageCorrection(query: ExploreQuery, result: CurrentQuery, active: boolean) {
  const navigate = useNavigate();
  const path = correctedTracePath(query, result, active);
  useEffect(() => {
    if (path) void navigate(path, { replace: true });
  }, [navigate, path]);
  return path != null;
}

function correctedTracePath(query: ExploreQuery, result: CurrentQuery, active: boolean) {
  if (!active || query.signal !== 'traces' || !currentResult(result)) return undefined;
  if (!isTraceList(query.traceView)) return undefined;
  const evidence = result.data;
  if (evidence?.signal !== 'traces' || evidence.data.number !== (query.pageIndex ?? 0)) return undefined;
  const page = authoritativePageIndexCorrection(evidence.data.number, evidence.data.totalPages);
  return page == null ? undefined : buildExplorePath({ ...query, pageIndex: page || undefined });
}

function currentResult(result: CurrentQuery) {
  return result.isSuccess && !result.isFetching && !result.isPlaceholderData;
}

function isTraceList(traceView: string | undefined) {
  const view = readTraceView(traceView);
  return view?.population === 'matched_traces' && view.mode === 'list';
}
