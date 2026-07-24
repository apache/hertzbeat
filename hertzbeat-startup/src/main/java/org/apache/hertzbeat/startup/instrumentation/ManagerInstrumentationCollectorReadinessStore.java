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

package org.apache.hertzbeat.startup.instrumentation;

import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.IntakeCredentialState;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeState;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.State;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Adapts the existing fresh Manager heartbeat registry to the instrumentation readiness port.
 *
 * <p>The adapter lives in the application composition root so neither Manager nor observability
 * reverses its module dependency direction.</p>
 */
@Primary
@Component
public class ManagerInstrumentationCollectorReadinessStore
        implements InstrumentationCollectorReadinessStore {

    private final CollectorRuntimeStatusRegistry runtimeStatusRegistry;
    private final CollectorDao collectorDao;
    private final CollectorIntakeAdvertisementReader intakeAdvertisementReader;

    public ManagerInstrumentationCollectorReadinessStore(
            CollectorRuntimeStatusRegistry runtimeStatusRegistry,
            CollectorDao collectorDao,
            CollectorIntakeAdvertisementReader intakeAdvertisementReader) {
        this.runtimeStatusRegistry = runtimeStatusRegistry;
        this.collectorDao = collectorDao;
        this.intakeAdvertisementReader = intakeAdvertisementReader;
    }

    @Override
    public CollectorReadiness readiness(String collectorId) {
        if (hasAvailableServerGateway(collectorId)) {
            return CollectorReadiness.available();
        }
        return runtimeStatusRegistry.current(collectorId)
                .map(CollectorRuntimeStatusRegistry.ReportedStatus::status)
                .map(this::mapStatus)
                .orElseGet(CollectorReadiness::unavailable);
    }

    /**
     * Server-gateway intake does not depend on a Collector-hosted OTLP runtime heartbeat.
     */
    private boolean hasAvailableServerGateway(String collectorId) {
        return collectorDao.findCollectorByName(collectorId)
                .map(intakeAdvertisementReader::read)
                .filter(intake -> intake.state() == State.AVAILABLE)
                .map(intake -> intake.gateway() == Gateway.SERVER)
                .orElse(false);
    }

    private CollectorReadiness mapStatus(ManagedOtelRuntimeStatus status) {
        if (status.intakeCredentialState() == IntakeCredentialState.MISSING
                || status.failureCode() == FailureCode.AUTHENTICATION_FAILED) {
            return CollectorReadiness.authenticationFailed();
        }
        if (!status.enabled() || status.state() != RuntimeState.RUNNING) {
            return CollectorReadiness.unavailable();
        }
        return CollectorReadiness.available();
    }
}
