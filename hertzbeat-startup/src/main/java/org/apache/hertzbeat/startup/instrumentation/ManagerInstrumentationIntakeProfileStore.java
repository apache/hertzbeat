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

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.observability.instrumentation.v2.store.InstrumentationIntakeProfileStore;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/** Maps existing explicit Manager advertisements into the independent v2 destination model. */
@Primary
@Component
@RequiredArgsConstructor
public class ManagerInstrumentationIntakeProfileStore implements InstrumentationIntakeProfileStore {

    private static final int MAX_PROFILES = 128;
    private static final String INVALID_SERVER_PROFILE_ID = "server:configured";
    private static final String INVALID_EXTERNAL_PROFILE_ID = "external:configured";
    private final CollectorDao collectorDao;
    private final CollectorIntakeAdvertisementReader advertisementReader;
    private final ServerInstrumentationIntakeProperties serverProperties;
    private final ExternalOtelCollectorIntakeProperties externalProperties;

    @Override
    public List<IntakeProfile> profiles() {
        int configuredProfiles = (serverProperties.configured() ? 1 : 0)
                + (externalProperties.configured() ? 1 : 0);
        int collectorProfileLimit = MAX_PROFILES - configuredProfiles;
        List<IntakeProfile> collectorProfiles = collectorDao
                .findAll(PageRequest.of(0, collectorProfileLimit, Sort.by("name").ascending())).stream()
                .map(advertisementReader::read)
                // Legacy Server advertisements remain readable on the Collector row for migration,
                // but Server discovery is owned exclusively by the global deployment properties.
                .filter(intake -> intake.gateway() != CollectorInstrumentationIntake.Gateway.SERVER)
                .map(this::map)
                .toList();
        List<IntakeProfile> profiles = new ArrayList<>();
        if (serverProperties.configured()) {
            IntakeProfile configuredServer = mapServer();
            boolean profileIdCollides = collectorProfiles.stream()
                    .anyMatch(profile -> profile.id().equals(configuredServer.id()));
            IntakeProfile server = profileIdCollides
                    ? ConfiguredInstrumentationIntakeProfileFactory.invalid(
                            INVALID_SERVER_PROFILE_ID, IntakeKind.SERVER)
                    : configuredServer;
            profiles.add(server);
        }
        profiles.addAll(collectorProfiles);
        if (externalProperties.configured()) {
            IntakeProfile external = mapExternal();
            String externalId = external.id();
            if (profiles.stream().anyMatch(profile -> profile.id().equals(externalId))) {
                external = invalidExternal(INVALID_EXTERNAL_PROFILE_ID);
            }
            profiles.add(external);
        }
        return List.copyOf(profiles);
    }

    private IntakeProfile map(CollectorInstrumentationIntake intake) {
        String id = "collector:" + intake.collectorId();
        if (intake.state() != CollectorInstrumentationIntake.State.AVAILABLE) {
            return new IntakeProfile(
                    id,
                    IntakeKind.HERTZBEAT_COLLECTOR,
                    Availability.UNAVAILABLE,
                    null,
                    List.of(),
                    Map.of(),
                    null,
                    intake.collectorId(),
                    mapError(intake.errorCode()));
        }
        EnumMap<OtlpTransport, IntakeEndpoint> endpoints = new EnumMap<>(OtlpTransport.class);
        List<OtlpTransport> transports = new ArrayList<>();
        if (intake.capabilities().contains(CollectorInstrumentationIntake.Capability.OTLP_HTTP_PROTOBUF)) {
            transports.add(OtlpTransport.HTTP_PROTOBUF);
            endpoints.put(OtlpTransport.HTTP_PROTOBUF, IntakeEndpoint.fromUrl(intake.otlpHttpEndpoint()));
        }
        if (intake.capabilities().contains(CollectorInstrumentationIntake.Capability.OTLP_GRPC)) {
            transports.add(OtlpTransport.GRPC);
            endpoints.put(OtlpTransport.GRPC, IntakeEndpoint.fromUrl(intake.otlpGrpcEndpoint()));
        }
        return new IntakeProfile(
                id,
                IntakeKind.HERTZBEAT_COLLECTOR,
                Availability.AVAILABLE,
                Gateway.COLLECTOR,
                transports,
                endpoints,
                intake.authorizationHeader(),
                intake.collectorId(),
                null);
    }

    private IntakeProfile mapServer() {
        return ConfiguredInstrumentationIntakeProfileFactory.create(
                serverProperties, IntakeKind.SERVER, Gateway.SERVER, INVALID_SERVER_PROFILE_ID);
    }

    private IntakeProfile mapExternal() {
        return ConfiguredInstrumentationIntakeProfileFactory.create(
                externalProperties,
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Gateway.EXTERNAL,
                INVALID_EXTERNAL_PROFILE_ID);
    }

    private IntakeProfile invalidExternal(String profileId) {
        return ConfiguredInstrumentationIntakeProfileFactory.invalid(
                profileId, IntakeKind.EXTERNAL_OTEL_COLLECTOR);
    }

    private ErrorCode mapError(CollectorInstrumentationIntake.ErrorCode errorCode) {
        if (errorCode == CollectorInstrumentationIntake.ErrorCode.INTAKE_ADVERTISEMENT_INVALID) {
            return ErrorCode.ADVERTISEMENT_INVALID;
        }
        if (errorCode == CollectorInstrumentationIntake.ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE) {
            return ErrorCode.UNAVAILABLE;
        }
        return ErrorCode.NOT_ADVERTISED;
    }
}
