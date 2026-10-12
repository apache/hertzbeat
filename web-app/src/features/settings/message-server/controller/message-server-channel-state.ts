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

import { classifyMessageServerReadError } from '../api/message-server-api';

export type MessageServerChannelState<T> =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'invalid' }
  | { kind: 'configured'; config: T };

export function messageServerChannelState<T>(
  query: UseQueryResult<
    { status: 'configured'; revision: string; config: T } | { status: 'missing'; revision: 'missing'; config: null }
  >
): MessageServerChannelState<T> {
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: classifyMessageServerReadError(query.error) };
  if (!query.data) return { kind: 'error' };
  return query.data.status === 'configured' ? { kind: 'configured', config: query.data.config } : { kind: 'missing' };
}
