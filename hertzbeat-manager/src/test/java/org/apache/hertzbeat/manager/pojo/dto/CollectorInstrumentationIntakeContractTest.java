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

package org.apache.hertzbeat.manager.pojo.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.ErrorCode;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.State;
import org.junit.jupiter.api.Test;

/** Guards the exact Collector instrumentation-intake consumer surface. */
class CollectorInstrumentationIntakeContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void freezesCollectorSummaryAndInstrumentationIntakeFields() {
        assertEquals(
                List.of(
                        "collector",
                        "pinMonitorNum",
                        "dispatchMonitorNum",
                        "runtimeStatus",
                        "runtimeStatusReportedAt",
                        "instrumentationIntake"),
                Arrays.stream(CollectorSummary.class.getDeclaredFields())
                        .filter(field -> !field.isSynthetic())
                        .map(java.lang.reflect.Field::getName)
                        .toList());
        assertRecordComponents(
                CollectorInstrumentationIntake.class,
                "schemaVersion",
                "collectorId",
                "state",
                "gateway",
                "capabilities",
                "otlpHttpEndpoint",
                "otlpGrpcEndpoint",
                "authorizationHeader",
                "errorCode");
    }

    @Test
    void freezesInstrumentationIntakeWireEnums() {
        assertWireValues(State.values(), "available", "unavailable");
        assertWireValues(Gateway.values(), "collector", "server");
        assertWireValues(Capability.values(), "otlp_http_protobuf", "otlp_grpc");
        assertWireValues(
                ErrorCode.values(),
                "intake_not_advertised",
                "intake_advertisement_invalid",
                "intake_advertisement_unavailable");
    }

    @Test
    void collectorSummaryAlwaysCarriesAnUnavailableIntakeWhenNotAdvertised() {
        CollectorSummary summary = CollectorSummary.builder()
                .collector(CollectorInfo.builder().name("edge-west").build())
                .build();

        assertNotNull(summary.getInstrumentationIntake());
        assertEquals("edge-west", summary.getInstrumentationIntake().collectorId());
        assertEquals(State.UNAVAILABLE, summary.getInstrumentationIntake().state());
        assertEquals(ErrorCode.INTAKE_NOT_ADVERTISED, summary.getInstrumentationIntake().errorCode());
    }

    @Test
    void beanStyleCollectorAssignmentSynchronizesOnlyTheDefaultIntakeIdentity() {
        CollectorSummary summary = new CollectorSummary();

        summary.setCollector(CollectorInfo.builder().name("edge-bean").build());

        assertEquals("edge-bean", summary.getInstrumentationIntake().collectorId());
        CollectorInstrumentationIntake explicitIntake = new CollectorInstrumentationIntake(
                1,
                "explicit-gateway",
                State.AVAILABLE,
                Gateway.SERVER,
                List.of(Capability.OTLP_GRPC),
                null,
                "https://server.example.test:4317",
                "Authorization",
                null);
        summary.setInstrumentationIntake(explicitIntake);
        summary.setCollector(CollectorInfo.builder().name("edge-renamed").build());

        assertSame(explicitIntake, summary.getInstrumentationIntake());
    }

    @Test
    void availableIntakeAcceptsExplicitHttpAndHttpsEndpointsAndTheAuthorizationHeaderName() {
        CollectorInstrumentationIntake intake = new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_HTTP_PROTOBUF, Capability.OTLP_GRPC),
                "https://collector.example.test:4318",
                "https://collector.example.test:4317",
                "Authorization",
                null);

        assertEquals("https://collector.example.test:4318", intake.otlpHttpEndpoint());
        CollectorInstrumentationIntake plaintext = new CollectorInstrumentationIntake(
                1,
                "edge-loopback",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "http://127.0.0.1:4318",
                null,
                "Authorization",
                null);
        assertEquals("http://127.0.0.1:4318", plaintext.otlpHttpEndpoint());
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "ftp://10.0.0.8:4318",
                null,
                "Authorization",
                null));
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "collector.example.test:4318",
                null,
                "Authorization",
                null));
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_HTTP_PROTOBUF),
                "https://collector.example.test:4318/v1?token=unsafe#fragment",
                null,
                "Authorization",
                null));
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.SERVER,
                List.of(Capability.OTLP_GRPC),
                null,
                "https://server.example.test:4317",
                "Bearer secret-value",
                null));
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.AVAILABLE,
                Gateway.COLLECTOR,
                Arrays.asList(Capability.OTLP_HTTP_PROTOBUF, null),
                "https://collector.example.test:4318",
                null,
                "Authorization",
                null));
        assertThrows(IllegalArgumentException.class, () -> new CollectorInstrumentationIntake(
                1,
                "edge-west",
                State.UNAVAILABLE,
                null,
                List.of(),
                null,
                null,
                "Authorization",
                ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE));
    }

    private void assertRecordComponents(Class<? extends Record> recordType, String... expectedNames) {
        assertEquals(
                List.of(expectedNames),
                Arrays.stream(recordType.getRecordComponents()).map(RecordComponent::getName).toList());
    }

    private void assertWireValues(Enum<?>[] values, String... expectedValues) {
        assertEquals(List.of(expectedValues), Arrays.stream(values).map(this::serializeEnum).toList());
    }

    private String serializeEnum(Enum<?> value) {
        try {
            return objectMapper.writeValueAsString(value).replace("\"", "");
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
