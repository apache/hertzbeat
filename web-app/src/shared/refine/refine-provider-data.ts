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

import type { BaseRecord } from '@refinedev/core';

/** Excludes arrays from Refine's otherwise permissive structural record type. */
type RefineRecordInput = BaseRecord & { readonly length?: never };

/** Adapts one validated application record to Refine's caller-selected subtype. */
export function adaptRefineRecord<TData extends BaseRecord>(record: RefineRecordInput): TData {
  return selectCallerSubtype<TData>(record);
}

/** Adapts validated application records without accepting a single record by mistake. */
export function adaptRefineRecords<TData extends BaseRecord>(records: RefineRecordInput[]): TData[] {
  return selectCallerSubtype<TData[]>(records);
}

/**
 * Refine lets each caller select `TData`, which a provider cannot prove from its
 * concrete validated record. Keep that unavoidable assertion private and let
 * the exported single/plural adapters enforce every shape available to callers.
 */
function selectCallerSubtype<TData extends BaseRecord | BaseRecord[]>(value: BaseRecord | BaseRecord[]): TData {
  return value as TData;
}
