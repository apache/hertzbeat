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

/** Failures shared by read-only backend resources. */
type RemoteFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';

type LoadingState = { kind: 'loading' };
type EmptyState = { kind: 'empty' };
type IdleState = { kind: 'idle' };
// Distribute a failure union so ordinary kind checks narrow to one branch.
type FailureState<Failure extends RemoteFailureKind> =
  Failure extends RemoteFailureKind ? { kind: Failure } : never;

/** A single remote value. Successful data exists only in the ready branch. */
type RemoteValueState<Data, Failure extends RemoteFailureKind = RemoteFailureKind> =
  | LoadingState
  | FailureState<Failure>
  | { kind: 'ready'; data: Data };

/** A value that is not requested until the user selects its parent resource. */
export type OptionalRemoteValueState<Data, Failure extends RemoteFailureKind = RemoteFailureKind> =
  | IdleState
  | EmptyState
  | RemoteValueState<Data, Failure>;

/** A non-paginated collection with an explicit empty state. */
export type RemoteCollectionState<Item, Failure extends RemoteFailureKind = RemoteFailureKind> =
  | LoadingState
  | EmptyState
  | FailureState<Failure>
  | { kind: 'ready'; records: Item[] };

/** A backend page whose total is meaningful only after a successful read. */
export type RemotePageState<Item, Failure extends RemoteFailureKind = RemoteFailureKind> =
  | LoadingState
  | EmptyState
  | FailureState<Failure>
  | { kind: 'ready'; records: Item[]; total: number };

/** A named record payload for features that do not use the generic data field. */
export type RemoteRecordState<Item, Failure extends RemoteFailureKind = RemoteFailureKind> =
  | LoadingState
  | FailureState<Failure>
  | { kind: 'ready'; record: Item };
