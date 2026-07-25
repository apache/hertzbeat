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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.junit.jupiter.api.Test;

/** Exact persisted/request surface and strict codec contracts. */
class CollectorIntakeAdvertisementContractTest {

    private final CollectorIntakeAdvertisementCodec codec = new CollectorIntakeAdvertisementCodec();

    @Test
    void freezesTheRequestOnlySurface() {
        assertEquals(
                List.of("schemaVersion", "gateway", "capabilities", "otlpHttpEndpoint", "otlpGrpcEndpoint"),
                Arrays.stream(CollectorIntakeAdvertisementRequest.class.getRecordComponents())
                        .map(RecordComponent::getName)
                        .toList());
    }

    @Test
    void rejectsUnknownCredentialAndResponseFields() {
        String unsafe = """
                {"schemaVersion":1,"gateway":"server","capabilities":["otlp_grpc"],
                 "otlpHttpEndpoint":null,"otlpGrpcEndpoint":"https://server.example.test:4317",
                 "collectorId":"edge-west","state":"available","errorCode":null,
                 "authorizationHeader":"Bearer leaked-token","token":"leaked-token"}
                """;

        CollectorIntakeAdvertisementException exception = assertThrows(
                CollectorIntakeAdvertisementException.class, () -> codec.decode(unsafe));

        assertEquals("intake_advertisement_invalid", exception.getMessage());
        assertFalse(exception.getMessage().contains("leaked-token"));
    }

    @Test
    void canonicalJsonContainsOnlyNormalizedSafeAdvertisementFields() {
        CollectorIntakeAdvertisementRequest request = new CollectorIntakeAdvertisementRequest(
                1,
                Gateway.COLLECTOR,
                List.of(Capability.OTLP_GRPC, Capability.OTLP_HTTP_PROTOBUF),
                "https://collector.example.test:4318/source/../otlp",
                "https://collector.example.test:4317");

        String persisted = codec.encode(request);
        CollectorIntakeAdvertisementRequest reread = codec.decode(persisted);

        assertEquals(List.of(Capability.OTLP_HTTP_PROTOBUF, Capability.OTLP_GRPC), reread.capabilities());
        assertEquals("https://collector.example.test:4318/otlp", reread.otlpHttpEndpoint());
        assertFalse(persisted.toLowerCase().contains("token"));
        assertFalse(persisted.contains("Authorization"));
        assertFalse(persisted.contains("collectorId"));
        assertFalse(persisted.contains("errorCode"));
        assertTrue(persisted.startsWith("{\"schemaVersion\":1,\"gateway\":\"collector\""));
    }

    @Test
    void acceptsExplicitHttpAndHttpsButRejectsUnsafeEndpoints() {
        assertThrows(IllegalArgumentException.class, () -> request(
                2, List.of(Capability.OTLP_GRPC), null, "https://server.example.test:4317"));
        assertThrows(IllegalArgumentException.class, () -> request(
                1,
                List.of(Capability.OTLP_GRPC, Capability.OTLP_GRPC),
                null,
                "https://server.example.test:4317"));
        assertEquals(
                "http://10.0.0.8:4318",
                request(
                        1,
                        List.of(Capability.OTLP_HTTP_PROTOBUF),
                        "http://10.0.0.8:4318",
                        null).otlpHttpEndpoint());
        assertEquals(
                "https://server.example.test:4317",
                request(
                        1,
                        List.of(Capability.OTLP_GRPC),
                        null,
                        "https://server.example.test:4317").otlpGrpcEndpoint());
        assertThrows(IllegalArgumentException.class, () -> request(
                1, List.of(Capability.OTLP_HTTP_PROTOBUF), "ftp://10.0.0.8:4318", null));
        assertThrows(IllegalArgumentException.class, () -> request(
                1, List.of(Capability.OTLP_HTTP_PROTOBUF), "10.0.0.8:4318", null));
        assertThrows(IllegalArgumentException.class, () -> request(
                1,
                List.of(Capability.OTLP_GRPC),
                null,
                "https://user:secret@server.example.test:4317?token=secret"));
    }

    private CollectorIntakeAdvertisementRequest request(int schemaVersion, List<Capability> capabilities,
                                                        String httpEndpoint, String grpcEndpoint) {
        return new CollectorIntakeAdvertisementRequest(
                schemaVersion, Gateway.SERVER, capabilities, httpEndpoint, grpcEndpoint);
    }
}
