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

import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED;
import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode.NONE;
import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED;
import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.IntakeCredentialState.MISSING;
import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeState.RUNNING;
import static org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeState.STOPPED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.IntakeCredentialState;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeState;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.RuntimeTelemetry;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementRequest;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.ReadinessState;
import org.apache.hertzbeat.observability.instrumentation.store.UnknownInstrumentationCollectorReadinessStore;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ManagerInstrumentationCollectorReadinessStoreTest {

    private static final Instant NOW = Instant.parse("2026-07-16T06:00:00Z");

    private final CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
    private final CollectorDao collectorDao = mock(CollectorDao.class);
    private final CollectorIntakeAdvertisementReader intakeReader = mock(CollectorIntakeAdvertisementReader.class);
    private final ManagerInstrumentationCollectorReadinessStore store =
            new ManagerInstrumentationCollectorReadinessStore(registry, collectorDao, intakeReader);

    @Test
    void reportsUnavailableWhenNoFreshHeartbeatExists() {
        when(registry.current("edge-west")).thenReturn(Optional.empty());

        assertEquals(ReadinessState.UNAVAILABLE, store.readiness("edge-west").state());
    }

    @Test
    void reportsAuthenticationFailureFromCredentialOrRuntimeFailure() {
        report(status(RUNNING, MISSING, NONE));
        assertEquals(ReadinessState.AUTHENTICATION_FAILED, store.readiness("edge-west").state());

        report(status(RUNNING, CONFIGURED, AUTHENTICATION_FAILED));
        assertEquals(ReadinessState.AUTHENTICATION_FAILED, store.readiness("edge-west").state());
    }

    @Test
    void reportsThatOnlyRunningRuntimeIsAvailable() {
        report(status(STOPPED, CONFIGURED, NONE));
        assertEquals(ReadinessState.UNAVAILABLE, store.readiness("edge-west").state());

        report(status(RUNNING, CONFIGURED, NONE));
        assertEquals(ReadinessState.AVAILABLE, store.readiness("edge-west").state());
    }

    @Test
    void treatsAvailableServerGatewayAsReadyWithoutCollectorRuntimeHeartbeat() {
        Collector collector = mock(Collector.class);
        when(collectorDao.findCollectorByName("edge-west")).thenReturn(Optional.of(collector));
        when(intakeReader.read(collector)).thenReturn(new CollectorIntakeAdvertisementRequest(
                1,
                Gateway.SERVER,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "https://server.example.com/api/otlp",
                null).available("edge-west"));
        when(registry.current("edge-west")).thenReturn(Optional.empty());

        assertEquals(ReadinessState.AVAILABLE, store.readiness("edge-west").state());
    }

    @Test
    void managerAdapterIsThePrimaryReadinessPortWhenBothImplementationsExist() {
        new ApplicationContextRunner()
                .withBean(CollectorRuntimeStatusRegistry.class, () -> registry)
                .withBean(CollectorDao.class, () -> collectorDao)
                .withBean(CollectorIntakeAdvertisementReader.class, () -> intakeReader)
                .withBean(UnknownInstrumentationCollectorReadinessStore.class)
                .withBean(ManagerInstrumentationCollectorReadinessStore.class)
                .run(context -> assertThat(context.getBean(InstrumentationCollectorReadinessStore.class))
                        .isInstanceOf(ManagerInstrumentationCollectorReadinessStore.class));
    }

    private void report(ManagedOtelRuntimeStatus status) {
        when(registry.current("edge-west"))
                .thenReturn(Optional.of(new CollectorRuntimeStatusRegistry.ReportedStatus(status, NOW)));
    }

    private ManagedOtelRuntimeStatus status(
            RuntimeState state,
            IntakeCredentialState credentialState,
            FailureCode failureCode) {
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                state,
                2,
                state == RUNNING ? 2 : 0,
                state == RUNNING ? 1234 : -1,
                credentialState,
                0,
                NOW,
                "",
                failureCode,
                RuntimeTelemetry.unavailable(false),
                List.of());
    }
}
