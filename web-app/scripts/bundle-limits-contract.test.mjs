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
import { fileURLToPath } from 'node:url';

import { loadConfigFromFile } from 'vite';

import bundleLimits from './bundle-limits.json' with { type: 'json' };

test('vendor chunks stay within the application chunk warning boundary', () => {
  const chunkWarningBytes = bundleLimits.chunkWarningKilobytes * 1024;
  const approvedBaseJavaScriptCeiling = 7_100_000;
  // Additional 512 bytes bound the native HiDPI lifecycle correction; no new dependency.
  const approvedPersesRuntimeAllowance = 1_401_536;
  const approvedPersesMultiSignalAllowance = 600_000;
  const approvedObservabilityWorkbenchAllowance = 40_000;
  const approvedAlertInvestigationAllowance = 40_000;
  const approvedIntakeDailyAllowance = 24_000;
  // Includes 38 KB for log investigation and 42 KB for measured trace analytics, native inspection and five locales.
  // M7 adds 13 KB: 11,623 bytes of contextual guidance in five locales and 909 bytes of recovery/lifecycle code.
  // Facet lookup adds 3 KiB for validated server search, source-owned debounce and exact-value guidance; no dependency.
  // Returned analysis CSV adds 8 KiB for bounded exports, provenance, actions and five locales; no new dependency.
  // Transactions adds 32 KiB for strict identity evidence, list/detail workflow and five locales; no new dependency.
  // Nested metric time aggregation adds 16 KiB for staged query authoring and five locales; no new dependency.
  // Ant Design time-range reuse adds 5 KiB for four Day.js locale tables; measured total growth is 4,213 bytes.
  // First Ant Design Slider use adds 28 KiB for its existing dependency runtime; measured reuse-slice growth is 27,295 bytes.
  const approvedQueryInvestigationAllowance = 278_208;
  // Includes 14 KB for responsive performance ranking, strict response validation and five locale catalogs.
  const approvedServicesAllowance = 48_000;
  // The inline Logs Views rail and guarded save flow add 9,586 measured bytes; bound growth to 10 KiB.
  const approvedSavedQueriesAllowance = 38_752;
  // M6 adds 40 KB for measured composition, population tables, persisted display and native QA corrections; no new dependency.
  // Analytical log panels reuse shared evidence rendering and add strict document/runtime integration.
  const approvedDashboardsAllowance = 130_192;
  // The long-value inspector viewer grew measured JS by 1,073 bytes; a bounded 1 KiB allowance leaves 887 bytes free.
  // Editable query tokens and the typed field tree exceed the prior total cap by 3,404 bytes
  // after removing 2,042 bytes of obsolete inspector code/locales; bound this slice to 4 KiB.
  // Independent query/formula authoring, shared evidence and committed-token editing exceed
  // the prior total cap by 17,453 bytes without new dependencies; bound this slice to 18 KiB.
  // Bounded multi-query execution, strict wire decoding and shared formula rendering exceed
  // that cap by 25,153 bytes without new dependencies; bound this slice to another 25 KiB.
  const approvedLogExplorerWorkspaceAllowance = 91_136;
  // The current Logs Add work, including subquery, exceeds the prior combined cap by 96,317 bytes.
  // Bound the measured cumulative growth to 96 KiB without changing the base or chunk limits.
  const approvedLogAddAllowance = 98_304;
  // The retired reference URL/saved-view sentinel is bounded to 2 KiB of measured compatibility code.
  const approvedRetiredReferenceSentinelAllowance = 2_048;
  // Facet-safety and investigation evidence notices add validated behavior; historical build rows are rounded, so exact attribution is unavailable.
  const approvedSignalInvestigationEvidenceAllowance = 8_192;

  assert.ok(bundleLimits.vendorChunkMinBytes > 0);
  assert.ok(bundleLimits.vendorChunkMinBytes <= bundleLimits.vendorChunkMaxBytes);
  assert.ok(bundleLimits.vendorChunkMaxBytes <= chunkWarningBytes);
  assert.ok(bundleLimits.shellGzipBytes > 0);
  assert.ok(bundleLimits.baseApplicationJavaScriptBytes > chunkWarningBytes);
  assert.ok(bundleLimits.baseApplicationJavaScriptBytes <= approvedBaseJavaScriptCeiling);
  assert.ok(bundleLimits.persesRuntimeJavaScriptAllowanceBytes > 0);
  assert.ok(bundleLimits.persesRuntimeJavaScriptAllowanceBytes <= approvedPersesRuntimeAllowance);
  assert.equal(bundleLimits.persesMultiSignalJavaScriptAllowanceBytes, approvedPersesMultiSignalAllowance);
  assert.equal(bundleLimits.observabilityWorkbenchJavaScriptAllowanceBytes, approvedObservabilityWorkbenchAllowance);
  assert.equal(bundleLimits.alertInvestigationJavaScriptAllowanceBytes, approvedAlertInvestigationAllowance);
  assert.equal(bundleLimits.intakeDailyJavaScriptAllowanceBytes, approvedIntakeDailyAllowance);
  assert.equal(bundleLimits.queryInvestigationJavaScriptAllowanceBytes, approvedQueryInvestigationAllowance);
  assert.equal(bundleLimits.servicesJavaScriptAllowanceBytes, approvedServicesAllowance);
  assert.equal(bundleLimits.savedQueriesJavaScriptAllowanceBytes, approvedSavedQueriesAllowance);
  assert.equal(bundleLimits.dashboardsJavaScriptAllowanceBytes, approvedDashboardsAllowance);
  assert.equal(bundleLimits.logExplorerWorkspaceJavaScriptAllowanceBytes, approvedLogExplorerWorkspaceAllowance);
  assert.equal(bundleLimits.logAddJavaScriptAllowanceBytes, approvedLogAddAllowance);
  assert.equal(bundleLimits.retiredReferenceSentinelAllowanceBytes, approvedRetiredReferenceSentinelAllowance);
  assert.equal(
    bundleLimits.signalInvestigationEvidenceJavaScriptAllowanceBytes,
    approvedSignalInvestigationEvidenceAllowance
  );
  assert.deepEqual(bundleLimits.persesDynamicRuntimeSources, ['src/platform/perses/runtime/perses-signal-runtime.tsx']);
});

test('manual vendor splitting preserves dependency execution order', async () => {
  const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
  const loadedConfig = await loadConfigFromFile({ command: 'build', mode: 'production' }, configFile);

  assert.equal(loadedConfig?.config.build?.rolldownOptions?.output?.strictExecutionOrder, true);
});
