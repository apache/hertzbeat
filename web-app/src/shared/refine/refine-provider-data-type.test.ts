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

import type { BaseRecord } from '@refinedev/core';
import { describe, expect, it } from 'vitest';

import { adaptRefineRecord, adaptRefineRecords } from './refine-provider-data';

type ExampleRecord = BaseRecord & { name: string };

const record: ExampleRecord = { id: 1, name: 'one' };
const records: ExampleRecord[] = [record];

describe('Refine provider data adapters', () => {
  it('preserves validated record references without remapping them', () => {
    expect(adaptRefineRecord<ExampleRecord>(record)).toBe(record);
    expect(adaptRefineRecords<ExampleRecord>(records)).toBe(records);
  });
});

/** These calls are compiled, not executed, so weakened adapter inputs fail typecheck. */
function assertCompileTimeContract(unknownValue: unknown) {
  // @ts-expect-error Refine records cannot be adapted from primitives.
  adaptRefineRecord<ExampleRecord>('record');
  // @ts-expect-error Unknown wire values must be validated before this boundary.
  adaptRefineRecord<ExampleRecord>(unknownValue);
  // @ts-expect-error Record arrays must use the plural adapter.
  adaptRefineRecord<ExampleRecord>(records);
  // @ts-expect-error A single record cannot cross the records adapter.
  adaptRefineRecords<ExampleRecord>(record);
}

void assertCompileTimeContract;
