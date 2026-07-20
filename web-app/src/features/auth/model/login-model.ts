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

export type LoginCredentials = {
  identifier: string;
  credential: string;
};

export type LoginFailureKind = 'invalid-credentials' | 'unavailable' | 'error';

export type LoginSessionState = 'checking' | 'unavailable' | 'authenticated' | 'anonymous';

type LoginSessionEvidence = {
  loading: boolean;
  unavailable: boolean;
  authenticated: boolean;
};

/** Gives session evidence a stable precedence before the page renders a state. */
export function resolveLoginSessionState(evidence: LoginSessionEvidence): LoginSessionState {
  if (evidence.loading) return 'checking';
  if (evidence.unavailable) return 'unavailable';
  if (evidence.authenticated) return 'authenticated';
  return 'anonymous';
}

export function loginErrorMessageKey(failure: LoginFailureKind) {
  if (failure === 'invalid-credentials') return 'auth.invalidCredentials';
  if (failure === 'unavailable') return 'common.unavailable';
  return 'common.routeError.description';
}
