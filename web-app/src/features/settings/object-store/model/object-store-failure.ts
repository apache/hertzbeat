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

export type ObjectStoreFailureKind = 'missing' | 'permission' | 'invalid' | 'unavailable' | 'error';
export type ObjectStoreWriteOutcome = 'rejected' | 'uncertain';

export const objectStoreMigrationConflictCode = 'object_store_migration_conflict';

type ObjectStoreFailureOptions = { code?: string };

/** Redacted failure evidence shared by Object Store API, provider, and controllers. */
export class ObjectStoreRequestFailure extends Error {
  readonly kind: ObjectStoreFailureKind;
  readonly writeOutcome: ObjectStoreWriteOutcome;
  readonly code: string | undefined;

  constructor(
    kind: ObjectStoreFailureKind,
    writeOutcome: ObjectStoreWriteOutcome,
    options: ObjectStoreFailureOptions = {}
  ) {
    super('Object Store request failed');
    this.name = 'ObjectStoreRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyObjectStoreReadFailure(reason: unknown): ObjectStoreFailureKind {
  return reason instanceof ObjectStoreRequestFailure ? reason.kind : 'error';
}

/** Only explicit domain rejection evidence permits a deliberate write retry. */
export function isObjectStoreWriteRejection(reason: unknown) {
  return reason instanceof ObjectStoreRequestFailure && reason.writeOutcome === 'rejected';
}

export function isObjectStoreMigrationConflict(reason: unknown) {
  return reason instanceof ObjectStoreRequestFailure && reason.code === objectStoreMigrationConflictCode;
}
