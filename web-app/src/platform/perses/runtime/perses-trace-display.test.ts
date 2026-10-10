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

import { expect, it } from 'vitest';
import { DEFAULT_TRACE_COLUMNS, validTraceColumns } from './perses-trace-display';
it('requires a unique trace identity column and rejects unknown display fields', () => {
  expect(validTraceColumns(DEFAULT_TRACE_COLUMNS)).toBe(true);
  expect(validTraceColumns(['duration'])).toBe(false);
  expect(validTraceColumns(['traceName', 'traceName'])).toBe(false);
  expect(validTraceColumns(['traceName', 'fakeHealth'])).toBe(false);
  expect(validTraceColumns(['traceId', 'traceName', 'service'])).toBe(true);
});
