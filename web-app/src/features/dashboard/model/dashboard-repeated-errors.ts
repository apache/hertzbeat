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

export type RepeatedErrorScope = {
  workspaceId: string;
  start: number;
  end: number;
  serviceName: string;
  environment: string;
};
export type RepeatedErrorGroup = {
  groupKey: string;
  serviceName: string;
  environment: string;
  count: number;
  lastSeen: number;
  summary: string;
  representativeUid: string | null;
};
export type RepeatedErrors = {
  state: 'ready' | 'unsupported' | 'over_budget' | 'unavailable';
  scope: RepeatedErrorScope;
  coverage: 'window' | null;
  matchingEvents: number | null;
  groups: RepeatedErrorGroup[];
};
export type RepeatedErrorRecords = {
  state: 'ready' | 'missing' | 'unsupported' | 'over_budget' | 'unavailable';
  scope: RepeatedErrorScope;
  selection: { groupKey: string; representativeUid: string };
  records: Array<{ uid: string; eventTime: number }>;
};
