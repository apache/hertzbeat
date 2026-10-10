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

import java.util.Optional;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.ServerAvailability;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeDbDataStorage;
import org.junit.jupiter.api.Test;

/** Ensures the UI probe reports only the configured Greptime storage. */
class WarehouseUiRuntimeStorageStatusProbeTest {

    @Test
    void reportsUnavailableWhenGreptimeStorageBeanIsAbsent() {
        WarehouseUiRuntimeStorageStatusProbe probe =
                new WarehouseUiRuntimeStorageStatusProbe(Optional.empty());

        assertFalse(probe.isAvailable());
    }

    @Test
    void reportsAvailableWhenGreptimeStorageIsAvailable() {
        GreptimeDbDataStorage greptimeStorage = mock(GreptimeDbDataStorage.class);
        when(greptimeStorage.getServerAvailability()).thenReturn(ServerAvailability.AVAILABLE);
        WarehouseUiRuntimeStorageStatusProbe probe =
                new WarehouseUiRuntimeStorageStatusProbe(Optional.of(greptimeStorage));

        assertTrue(probe.isAvailable());
        verify(greptimeStorage).getServerAvailability();
    }

    @Test
    void reportsUnavailableWhenGreptimeStorageIsUnavailable() {
        GreptimeDbDataStorage greptimeStorage = mock(GreptimeDbDataStorage.class);
        when(greptimeStorage.getServerAvailability()).thenReturn(ServerAvailability.UNAVAILABLE);
        WarehouseUiRuntimeStorageStatusProbe probe =
                new WarehouseUiRuntimeStorageStatusProbe(Optional.of(greptimeStorage));

        assertFalse(probe.isAvailable());
        verify(greptimeStorage).getServerAvailability();
    }
}
