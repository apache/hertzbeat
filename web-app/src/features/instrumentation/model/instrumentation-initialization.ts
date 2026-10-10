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

export type InstrumentationMetadataSource = 'catalog' | 'profiles';
export type InstrumentationMetadataState = 'initial-loading' | 'retrying' | 'ready' | 'stale' | 'error';

type QueryEvidence = {
  hasData: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError?: boolean;
};

export function instrumentationMetadataState(query: QueryEvidence, retrying: boolean): InstrumentationMetadataState {
  if (query.hasData) return query.isError || retrying ? 'stale' : 'ready';
  if (retrying && query.isFetching) return 'retrying';
  if (query.isPending) return 'initial-loading';
  return 'error';
}

export function initializationFailedSources(
  catalog: InstrumentationMetadataState,
  profiles: InstrumentationMetadataState
): InstrumentationMetadataSource[] {
  const failed: InstrumentationMetadataSource[] = [];
  if (catalog === 'error' || catalog === 'stale') failed.push('catalog');
  if (profiles === 'error' || profiles === 'stale') failed.push('profiles');
  return failed;
}

export function metadataAllowsConfiguration(state: InstrumentationMetadataState) {
  return state === 'ready' || state === 'stale';
}
