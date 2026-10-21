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

import type {
  RuntimeStatusRequestFailure,
  RuntimeStatusSnapshot,
  RuntimeStatusViewModel
} from './runtime-status-contract';

type RuntimeStatusQueryEvidence = {
  pending: boolean;
  snapshot: RuntimeStatusSnapshot | null;
  failure: RuntimeStatusRequestFailure | null;
};

export function runtimeStatusViewModel(evidence: RuntimeStatusQueryEvidence): RuntimeStatusViewModel {
  if (evidence.pending) return { state: 'loading', snapshot: null };
  if (evidence.failure) return { state: 'request-failed', snapshot: null, failure: evidence.failure };
  if (evidence.snapshot) return { state: 'ready', snapshot: evidence.snapshot };
  return { state: 'request-failed', snapshot: null, failure: 'error' };
}
