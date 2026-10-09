/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
import { expect, it } from 'vitest';
import { DEFAULT_TRACE_COLUMNS, validTraceColumns } from './perses-trace-display';
it('requires a unique trace identity column and rejects unknown display fields', () => {
  expect(validTraceColumns(DEFAULT_TRACE_COLUMNS)).toBe(true);
  expect(validTraceColumns(['duration'])).toBe(false);
  expect(validTraceColumns(['traceName', 'traceName'])).toBe(false);
  expect(validTraceColumns(['traceName', 'fakeHealth'])).toBe(false);
  expect(validTraceColumns(['traceId', 'traceName', 'service'])).toBe(true);
});
