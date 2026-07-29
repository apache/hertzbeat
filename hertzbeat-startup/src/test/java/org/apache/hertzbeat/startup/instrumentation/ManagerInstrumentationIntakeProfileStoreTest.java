/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.startup.instrumentation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.guide.InstrumentationGuideAdapterRegistry;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.TransportSecurity;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationApplicationGuideV2Adapter;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationGuideV2Renderer;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationIntakeProfileV2Service;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class ManagerInstrumentationIntakeProfileStoreTest {

    @Test
    void mapsOnlyExistingExplicitAdvertisementsWithoutInferringEndpoints() {
        Collector server = collector("server-advertisement");
        Collector loopback = collector("loopback");
        Collector edge = collector("edge");
        CollectorDao dao = mock(CollectorDao.class);
        CollectorIntakeAdvertisementReader reader = mock(CollectorIntakeAdvertisementReader.class);
        when(dao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(server, loopback, edge)));
        when(reader.read(server)).thenReturn(availableServer());
        when(reader.read(loopback)).thenReturn(availableLoopback());
        when(reader.read(edge)).thenReturn(CollectorInstrumentationIntake.unavailable(
                "edge", CollectorInstrumentationIntake.ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE));

        var profiles = new ManagerInstrumentationIntakeProfileStore(
                dao, reader, unconfiguredExternal()).profiles();

        assertEquals(3, profiles.size());
        assertEquals("server:server-advertisement", profiles.getFirst().id());
        assertEquals(IntakeKind.SERVER, profiles.getFirst().kind());
        assertEquals("https://otel.example.test/v1", profiles.getFirst()
                .endpoints().get(OtlpTransport.HTTP_PROTOBUF).url());
        assertEquals(TransportSecurity.TLS, profiles.getFirst()
                .endpoints().get(OtlpTransport.HTTP_PROTOBUF).security());
        assertNull(profiles.getFirst().collectorId());
        assertEquals(IntakeKind.HERTZBEAT_COLLECTOR, profiles.get(1).kind());
        assertEquals(Availability.AVAILABLE, profiles.get(1).availability());
        assertEquals("loopback", profiles.get(1).collectorId());
        assertEquals("http://127.0.0.1:4318", profiles.get(1)
                .endpoints().get(OtlpTransport.HTTP_PROTOBUF).url());
        assertEquals(TransportSecurity.PLAINTEXT, profiles.get(1)
                .endpoints().get(OtlpTransport.HTTP_PROTOBUF).security());
        assertEquals(IntakeKind.HERTZBEAT_COLLECTOR, profiles.get(2).kind());
        assertEquals(Availability.UNAVAILABLE, profiles.get(2).availability());
        assertEquals("edge", profiles.get(2).collectorId());
        assertEquals(true, profiles.get(2).endpoints().isEmpty());
    }

    @Test
    void appendsConfiguredExternalProfileAndExistingRendererSelectsIt() {
        Collector server = collector("server-advertisement");
        CollectorDao dao = mock(CollectorDao.class);
        CollectorIntakeAdvertisementReader reader = mock(CollectorIntakeAdvertisementReader.class);
        when(dao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(server)));
        when(reader.read(server)).thenReturn(availableServer());
        var store = new ManagerInstrumentationIntakeProfileStore(
                dao,
                reader,
                new ExternalOtelCollectorIntakeProperties(
                        "external-west",
                        "http://otel.example.test:4318",
                        "https://otel.example.test:4317"));
        InstrumentationIntakeProfileV2Service profiles = new InstrumentationIntakeProfileV2Service(store);

        var discovery = profiles.profiles();
        assertEquals(2, discovery.profiles().size());
        assertEquals("server:server-advertisement", discovery.defaultProfileId());
        var external = discovery.profiles().stream()
                .filter(profile -> profile.id().equals("external-west"))
                .findFirst()
                .orElseThrow();
        assertEquals("external-west", external.id());
        assertEquals(IntakeKind.EXTERNAL_OTEL_COLLECTOR, external.kind());
        assertEquals(Gateway.EXTERNAL, external.gateway());
        assertEquals(List.of(OtlpTransport.HTTP_PROTOBUF, OtlpTransport.GRPC),
                external.supportedTransports());
        assertEquals("Authorization", external.authHeaderName());
        assertNull(external.collectorId());
        assertEquals(TransportSecurity.PLAINTEXT,
                external.endpoints().get(OtlpTransport.HTTP_PROTOBUF).security());
        assertEquals(TransportSecurity.TLS, external.endpoints().get(OtlpTransport.GRPC).security());

        InstrumentationCatalogV2Service catalog =
                new InstrumentationCatalogV2Service(new InstrumentationCatalogService());
        var renderer = new InstrumentationGuideV2Renderer(
                catalog,
                profiles,
                new InstrumentationApplicationGuideV2Adapter(
                        catalog, InstrumentationGuideAdapterRegistry.official()));
        var rendered = renderer.render(new RenderRequest(
                2,
                SourceKind.EXISTING_OPENTELEMETRY,
                "existing_otlp",
                null,
                null,
                null,
                null,
                null,
                "external-west",
                new ServiceIdentity("checkout-api", "commerce", "prod", "checkout-1", "/checkout")));

        assertEquals("external-west", rendered.intakeProfile().id());
        assertEquals(IntakeKind.EXTERNAL_OTEL_COLLECTOR, rendered.intakeProfile().kind());
        String content = rendered.blocks().stream()
                .map(block -> block.content() == null ? "" : block.content())
                .collect(java.util.stream.Collectors.joining("\n"));
        assertTrue(content.contains("http://otel.example.test:4318"));
        assertTrue(content.contains("${HERTZBEAT_TOKEN}"));
        assertFalse(content.contains("secret-value"));
    }

    @Test
    void invalidExternalConfigurationReturnsOnlyStableNonSecretFailure() {
        for (String endpoint : List.of(
                "ftp://otel.example.test:4318",
                "http://user:secret@otel.example.test:4318",
                "https://otel.example.test:4318/v1?token=secret-value",
                "https://otel.example.test:4318/v1#secret-value",
                "otel.example.test:4318")) {
            var profile = new ManagerInstrumentationIntakeProfileStore(
                            emptyDao(),
                            mock(CollectorIntakeAdvertisementReader.class),
                            new ExternalOtelCollectorIntakeProperties("external-west", endpoint, null))
                    .profiles()
                    .getFirst();

            assertEquals("external-west", profile.id());
            assertEquals(IntakeKind.EXTERNAL_OTEL_COLLECTOR, profile.kind());
            assertEquals(Availability.UNAVAILABLE, profile.availability());
            assertEquals(ErrorCode.ADVERTISEMENT_INVALID, profile.errorCode());
            assertEquals(Map.of(), profile.endpoints());
            assertNull(profile.gateway());
            assertNull(profile.authHeaderName());
            assertFalse(profile.toString().contains(endpoint));
            assertFalse(profile.toString().contains("secret-value"));
        }
    }

    @Test
    void absentConfigurationCreatesNoProfileWhileIncompleteOrUnsafeIdUsesSafeFailureId() {
        assertTrue(new ManagerInstrumentationIntakeProfileStore(
                        emptyDao(), mock(CollectorIntakeAdvertisementReader.class), unconfiguredExternal())
                .profiles()
                .isEmpty());

        var incomplete = new ManagerInstrumentationIntakeProfileStore(
                        emptyDao(),
                        mock(CollectorIntakeAdvertisementReader.class),
                        new ExternalOtelCollectorIntakeProperties("external-west", null, null))
                .profiles()
                .getFirst();
        assertEquals("external-west", incomplete.id());
        assertEquals(ErrorCode.ADVERTISEMENT_INVALID, incomplete.errorCode());

        var unsafeId = new ManagerInstrumentationIntakeProfileStore(
                        emptyDao(),
                        mock(CollectorIntakeAdvertisementReader.class),
                        new ExternalOtelCollectorIntakeProperties(
                                "external?token=secret-value", "https://otel.example.test:4318", null))
                .profiles()
                .getFirst();
        assertEquals("external:configured", unsafeId.id());
        assertEquals(ErrorCode.ADVERTISEMENT_INVALID, unsafeId.errorCode());
        assertFalse(unsafeId.toString().contains("secret-value"));
    }

    @Test
    void profileIdCollisionCannotInvalidateTheDiscoveryResponse() {
        Collector server = collector("server-advertisement");
        CollectorDao dao = mock(CollectorDao.class);
        CollectorIntakeAdvertisementReader reader = mock(CollectorIntakeAdvertisementReader.class);
        when(dao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(server)));
        when(reader.read(server)).thenReturn(availableServer());
        var store = new ManagerInstrumentationIntakeProfileStore(
                dao,
                reader,
                new ExternalOtelCollectorIntakeProperties(
                        "server:server-advertisement", "https://otel.example.test:4318", null));

        var discovery = new InstrumentationIntakeProfileV2Service(store).profiles();

        assertEquals(2, discovery.profiles().size());
        assertEquals("server:server-advertisement", discovery.defaultProfileId());
        assertEquals("external:configured", discovery.profiles().get(1).id());
        assertEquals(Availability.UNAVAILABLE, discovery.profiles().get(1).availability());
        assertEquals(ErrorCode.ADVERTISEMENT_INVALID, discovery.profiles().get(1).errorCode());
    }

    private Collector collector(String name) {
        Collector collector = new Collector();
        collector.setName(name);
        return collector;
    }

    private CollectorDao emptyDao() {
        CollectorDao dao = mock(CollectorDao.class);
        when(dao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        return dao;
    }

    private ExternalOtelCollectorIntakeProperties unconfiguredExternal() {
        return new ExternalOtelCollectorIntakeProperties(null, null, null);
    }

    private CollectorInstrumentationIntake availableServer() {
        return new CollectorInstrumentationIntake(
                1,
                "server-advertisement",
                CollectorInstrumentationIntake.State.AVAILABLE,
                CollectorInstrumentationIntake.Gateway.SERVER,
                List.of(CollectorInstrumentationIntake.Capability.OTLP_HTTP_PROTOBUF),
                "https://otel.example.test/v1",
                null,
                "Authorization",
                null);
    }

    private CollectorInstrumentationIntake availableLoopback() {
        return new CollectorInstrumentationIntake(
                1,
                "loopback",
                CollectorInstrumentationIntake.State.AVAILABLE,
                CollectorInstrumentationIntake.Gateway.COLLECTOR,
                List.of(CollectorInstrumentationIntake.Capability.OTLP_HTTP_PROTOBUF),
                "http://127.0.0.1:4318",
                null,
                "Authorization",
                null);
    }
}
