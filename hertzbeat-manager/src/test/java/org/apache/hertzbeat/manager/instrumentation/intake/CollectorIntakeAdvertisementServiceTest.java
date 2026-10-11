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

package org.apache.hertzbeat.manager.instrumentation.intake;

import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_OFFLINE;
import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_ONLINE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry.ReportedStatus;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.ErrorCode;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.State;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;

/** Persistence, reload, state mapping, and safe diagnostic contracts. */
@ExtendWith(OutputCaptureExtension.class)
class CollectorIntakeAdvertisementServiceTest {

    @Test
    void persistsClearsAndRereadsAcrossServiceInstances() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        Collector collector = Collector.builder()
                .name("edge-west")
                .status(COLLECTOR_STATUS_ONLINE)
                .build();
        when(collectorDao.findCollectorByName("edge-west")).thenReturn(Optional.of(collector));
        CollectorIntakeAdvertisementRequest request = request(Gateway.COLLECTOR);
        CollectorRuntimeStatusRegistry runtimeStatuses = runtimeStatuses("edge-west", gatewayAvailable());
        CollectorIntakeAdvertisementService writer = service(collectorDao, runtimeStatuses);

        CollectorInstrumentationIntake saved = writer.update("edge-west", request);
        CollectorInstrumentationIntake reread = service(collectorDao, runtimeStatuses).read(collector);

        assertEquals(State.AVAILABLE, saved.state());
        assertEquals("Authorization", saved.authorizationHeader());
        assertEquals(saved, reread);
        assertFalse(collector.getInstrumentationIntake().contains("Authorization"));
        assertFalse(collector.getInstrumentationIntake().toLowerCase().contains("token"));
        verify(collectorDao).save(collector);

        CollectorInstrumentationIntake cleared = writer.clear("edge-west");

        assertNull(collector.getInstrumentationIntake());
        assertEquals(ErrorCode.INTAKE_NOT_ADVERTISED, cleared.errorCode());
    }

    @Test
    void rejectsServerOwnedEndpointsAtTheCollectorMutationBoundary() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        CollectorIntakeAdvertisementService service = service(collectorDao, mock(CollectorRuntimeStatusRegistry.class));

        assertThrows(IllegalArgumentException.class, () -> service.update("edge-west", request(Gateway.SERVER)));
        verify(collectorDao, never()).save(any());
    }

    @Test
    void mapsNotAdvertisedInvalidOfflineAndAvailableWithoutExposingStoredText(CapturedOutput output) {
        CollectorDao collectorDao = mock(CollectorDao.class);
        CollectorRuntimeStatusRegistry runtimeStatuses = mock(CollectorRuntimeStatusRegistry.class);
        CollectorIntakeAdvertisementService service = service(collectorDao, runtimeStatuses);
        Collector collector = Collector.builder()
                .name("edge-state")
                .status(COLLECTOR_STATUS_ONLINE)
                .build();

        assertEquals(ErrorCode.INTAKE_NOT_ADVERTISED, service.read(collector).errorCode());

        collector.setInstrumentationIntake("{\"token\":\"stored-secret-token\",\"broken\":true}");
        assertEquals(ErrorCode.INTAKE_ADVERTISEMENT_INVALID, service.read(collector).errorCode());
        assertTrue(output.getAll().contains("Stored Collector instrumentation intake advertisement is invalid"));
        assertFalse(output.getAll().contains("stored-secret-token"));

        collector.setInstrumentationIntake(new CollectorIntakeAdvertisementCodec().encode(request(Gateway.COLLECTOR)));
        collector.setStatus(COLLECTOR_STATUS_OFFLINE);
        assertEquals(ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE, service.read(collector).errorCode());

        collector.setStatus(COLLECTOR_STATUS_ONLINE);
        assertEquals(ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE, service.read(collector).errorCode());

        when(runtimeStatuses.current("edge-state"))
                .thenReturn(Optional.of(new ReportedStatus(gatewayAvailable(), Instant.now())));
        CollectorInstrumentationIntake available = service.read(collector);
        assertEquals(State.AVAILABLE, available.state());
        assertEquals(Gateway.COLLECTOR, available.gateway());
        assertEquals("Authorization", available.authorizationHeader());
    }

    @Test
    void rejectsAnAdvertisedProtocolThatTheCurrentRuntimeDoesNotReport() {
        Collector collector = Collector.builder()
                .name("edge-protocol")
                .status(COLLECTOR_STATUS_ONLINE)
                .build();
        collector.setInstrumentationIntake(new CollectorIntakeAdvertisementCodec().encode(
                request(Gateway.COLLECTOR, Capability.OTLP_HTTP_PROTOBUF)));
        CollectorIntakeAdvertisementService service = service(
                mock(CollectorDao.class), runtimeStatuses("edge-protocol", gatewayAvailable()));

        CollectorInstrumentationIntake intake = service.read(collector);

        assertEquals(State.UNAVAILABLE, intake.state());
        assertEquals(ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE, intake.errorCode());
    }

    private CollectorIntakeAdvertisementService service(
            CollectorDao collectorDao, CollectorRuntimeStatusRegistry runtimeStatuses) {
        return new CollectorIntakeAdvertisementService(
                collectorDao, new CollectorIntakeAdvertisementCodec(), runtimeStatuses);
    }

    private CollectorRuntimeStatusRegistry runtimeStatuses(
            String collectorId, ManagedOtelRuntimeStatus runtimeStatus) {
        CollectorRuntimeStatusRegistry registry = mock(CollectorRuntimeStatusRegistry.class);
        when(registry.current(collectorId))
                .thenReturn(Optional.of(new ReportedStatus(runtimeStatus, Instant.now())));
        return registry;
    }

    private ManagedOtelRuntimeStatus gatewayAvailable() {
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                1,
                1,
                -1,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.now(),
                "",
                ManagedOtelRuntimeStatus.FailureCode.NONE,
                ManagedOtelRuntimeStatus.RuntimeTelemetry.unavailable(false),
                List.of(),
                ManagedOtelRuntimeStatus.OtlpGatewayStatus.available(
                        List.of(ManagedOtelRuntimeStatus.OtlpGatewayTransport.GRPC)));
    }

    private CollectorIntakeAdvertisementRequest request(Gateway gateway) {
        return request(gateway, Capability.OTLP_GRPC);
    }

    private CollectorIntakeAdvertisementRequest request(Gateway gateway, Capability capability) {
        return new CollectorIntakeAdvertisementRequest(
                1,
                gateway,
                List.of(capability),
                capability == Capability.OTLP_HTTP_PROTOBUF ? "https://collector.example.test:4318" : null,
                capability == Capability.OTLP_GRPC ? "https://collector.example.test:4317" : null);
    }
}
