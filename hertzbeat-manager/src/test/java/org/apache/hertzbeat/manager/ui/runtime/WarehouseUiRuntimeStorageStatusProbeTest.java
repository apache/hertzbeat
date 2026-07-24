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

package org.apache.hertzbeat.manager.ui.runtime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;

/** Ensures the UI probe reuses the Warehouse health boundary without storage queries. */
class WarehouseUiRuntimeStorageStatusProbeTest {

    @Test
    void delegatesToMetricsDataServiceAndTreatsNullAsUnavailable() {
        MetricsDataService metricsDataService = mock(MetricsDataService.class);
        WarehouseUiRuntimeStorageStatusProbe probe = new WarehouseUiRuntimeStorageStatusProbe(
                metricsDataService, greptimeProperties(true));
        when(metricsDataService.getWarehouseStorageServerStatus())
                .thenReturn(Boolean.TRUE)
                .thenReturn((Boolean) null);

        assertTrue(probe.isAvailable());
        assertFalse(probe.isAvailable());
        verify(metricsDataService, org.mockito.Mockito.times(2)).getWarehouseStorageServerStatus();
    }

    @Test
    void doesNotReportAnotherWarehouseAsAvailableGreptimeStorage() {
        MetricsDataService metricsDataService = mock(MetricsDataService.class);
        WarehouseUiRuntimeStorageStatusProbe probe = new WarehouseUiRuntimeStorageStatusProbe(
                metricsDataService, greptimeProperties(false));
        when(metricsDataService.getWarehouseStorageServerStatus()).thenReturn(Boolean.TRUE);

        assertFalse(probe.isAvailable());
        verify(metricsDataService, org.mockito.Mockito.never()).getWarehouseStorageServerStatus();
    }

    private GreptimeProperties greptimeProperties(boolean enabled) {
        return new GreptimeProperties(
                enabled, "127.0.0.1:4001", "http://127.0.0.1:4000", "public", null, null, null);
    }
}
