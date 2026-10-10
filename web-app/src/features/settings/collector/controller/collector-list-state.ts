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

import type { UseQueryResult } from '@tanstack/react-query';

import { classifyCollectorApiFailure } from '../api/collector-api-failure';
import type { CollectorListState, CollectorPage } from '../model/collector-model';

export function resolveCollectorListState(
  query: UseQueryResult<CollectorPage>,
  proofFailure: boolean,
  canRead: boolean
): CollectorListState {
  if (!canRead) return { kind: 'permission' };
  if (proofFailure) return { kind: 'unavailable' };
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: readFailureKind(query.error) };
  if (!query.data) return { kind: 'error' };
  if (query.data.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: query.data.content, total: query.data.totalElements };
}

function readFailureKind(error: unknown): 'permission' | 'unavailable' | 'error' {
  const failure = classifyCollectorApiFailure(error);
  return failure === 'permission' || failure === 'unavailable' ? failure : 'error';
}
