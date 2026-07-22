/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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

import assert from 'node:assert/strict';
import { test } from 'node:test';

import bundleLimits from './bundle-limits.json' with { type: 'json' };

test('vendor chunks stay within the application chunk warning boundary', () => {
  const chunkWarningBytes = bundleLimits.chunkWarningKilobytes * 1024;

  assert.ok(bundleLimits.vendorChunkMinBytes > 0);
  assert.ok(bundleLimits.vendorChunkMinBytes <= bundleLimits.vendorChunkMaxBytes);
  assert.ok(bundleLimits.vendorChunkMaxBytes <= chunkWarningBytes);
  assert.ok(bundleLimits.shellGzipBytes > 0);
  assert.ok(bundleLimits.totalJavaScriptBytes > chunkWarningBytes);
});
