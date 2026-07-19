/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
