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

export type TokenFailureKind = 'invalid' | 'unavailable' | 'permission' | 'error';
export type TokenWriteOutcome = 'rejected' | 'uncertain';

type TokenFailureOptions = { code?: string };

/** Redacted failure evidence shared by the Token API, provider, and controllers. */
export class TokenRequestFailure extends Error {
  readonly kind: TokenFailureKind;
  readonly writeOutcome: TokenWriteOutcome;
  readonly code: string | undefined;

  constructor(kind: TokenFailureKind, writeOutcome: TokenWriteOutcome, options: TokenFailureOptions = {}) {
    super('Token request failed');
    this.name = 'TokenRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyTokenCollectionFailure(reason: unknown): TokenFailureKind {
  return reason instanceof TokenRequestFailure ? reason.kind : 'error';
}

/** Only explicit domain rejection evidence permits a deliberate write retry. */
export function isTokenWriteRejection(reason: unknown) {
  return reason instanceof TokenRequestFailure && reason.writeOutcome === 'rejected';
}
