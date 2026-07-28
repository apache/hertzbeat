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

export type StatusFailureKind = 'missing' | 'permission' | 'unavailable' | 'error';
export type StatusWriteOutcome = 'rejected' | 'uncertain';

/** Stable domain evidence emitted by the Status API boundary. */
export class StatusRequestFailure extends Error {
  constructor(
    readonly kind: StatusFailureKind,
    readonly writeOutcome: StatusWriteOutcome
  ) {
    super('Status request failed');
    this.name = 'StatusRequestFailure';
  }
}

/** Exact evidence that no Status Page organization has been configured. */
export class StatusOrgNotFoundError extends StatusRequestFailure {
  constructor() {
    // This is read-side envelope evidence, not proof that a write was rejected.
    super('missing', 'uncertain');
    this.name = 'StatusOrgNotFoundError';
  }
}

export function isStatusOrgNotFound(error: unknown) {
  return error instanceof StatusOrgNotFoundError;
}

export function statusRequestFailureKind(error: unknown) {
  return error instanceof StatusRequestFailure ? error.kind : undefined;
}

export function statusWriteOutcome(error: unknown): StatusWriteOutcome {
  return error instanceof StatusRequestFailure ? error.writeOutcome : 'uncertain';
}
