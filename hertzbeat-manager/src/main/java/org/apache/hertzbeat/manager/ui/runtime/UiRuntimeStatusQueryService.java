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

import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_ONLINE;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorDao.CollectorStatusInventory;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry.ReportedStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.CollectorsStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ComponentStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ErrorCode;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.RuntimeStatusResponse;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.State;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageKind;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageStatus;
import org.springframework.stereotype.Service;

/** Aggregates safe runtime availability from existing production health boundaries. */
@Service
@Slf4j
public class UiRuntimeStatusQueryService implements UiRuntimeStatusQuery {

    private final UiRuntimeStorageStatusProbe storageProbe;
    private final CollectorDao collectorDao;
    private final CollectorRuntimeStatusRegistry runtimeStatusRegistry;
    private final Clock clock;

    public UiRuntimeStatusQueryService(UiRuntimeStorageStatusProbe storageProbe, CollectorDao collectorDao,
                                       CollectorRuntimeStatusRegistry runtimeStatusRegistry, Clock clock) {
        this.storageProbe = storageProbe;
        this.collectorDao = collectorDao;
        this.runtimeStatusRegistry = runtimeStatusRegistry;
        this.clock = clock;
    }

    @Override
    public RuntimeStatusResponse current() {
        Instant observedAt = clock.instant();
        return new RuntimeStatusResponse(
                UiRuntimeStatusContract.CURRENT_SCHEMA_VERSION,
                observedAt,
                new ComponentStatus(State.AVAILABLE, null),
                storageStatus(),
                collectorsStatus());
    }

    private StorageStatus storageStatus() {
        try {
            if (storageProbe.isAvailable()) {
                return new StorageStatus(StorageKind.GREPTIME, State.AVAILABLE, null);
            }
            return new StorageStatus(
                    StorageKind.GREPTIME, State.UNAVAILABLE, ErrorCode.STORAGE_UNAVAILABLE);
        } catch (RuntimeException exception) {
            log.warn("UI runtime storage availability query failed");
            return new StorageStatus(
                    StorageKind.GREPTIME, State.UNAVAILABLE, ErrorCode.STORAGE_QUERY_FAILED);
        }
    }

    private CollectorsStatus collectorsStatus() {
        List<CollectorStatusInventory> inventory;
        try {
            inventory = collectorDao.findStatusInventory();
        } catch (RuntimeException exception) {
            log.warn("UI runtime Collector inventory query failed");
            return new CollectorsStatus(
                    State.UNAVAILABLE, null, null, null, null, ErrorCode.COLLECTOR_STATUS_UNAVAILABLE);
        }

        int total = inventory.size();
        int online = 0;
        int runtimeHealthy = 0;
        boolean enabledRuntimeFailure = false;
        Instant lastReportedAt = null;
        for (CollectorStatusInventory collector : inventory) {
            boolean collectorOnline = collector.getStatus() == COLLECTOR_STATUS_ONLINE;
            if (collectorOnline) {
                online++;
            }
            ReportedStatus report = runtimeStatusRegistry.current(collector.getName()).orElse(null);
            if (report == null) {
                continue;
            }
            if (lastReportedAt == null || report.receivedAt().isAfter(lastReportedAt)) {
                lastReportedAt = report.receivedAt();
            }
            ManagedOtelRuntimeStatus runtime = report.status();
            if (!runtime.enabled()) {
                continue;
            }
            boolean healthy = runtime.state() == ManagedOtelRuntimeStatus.RuntimeState.RUNNING
                    && runtime.failureCode() == ManagedOtelRuntimeStatus.FailureCode.NONE;
            if (collectorOnline && healthy) {
                runtimeHealthy++;
            }
            enabledRuntimeFailure |= !healthy;
        }

        boolean available = total > 0 && online == total && !enabledRuntimeFailure;
        return new CollectorsStatus(
                available ? State.AVAILABLE : State.DEGRADED,
                total,
                online,
                runtimeHealthy,
                lastReportedAt,
                available ? null : ErrorCode.COLLECTOR_STATUS_UNAVAILABLE);
    }
}
