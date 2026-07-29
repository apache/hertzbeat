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
import java.util.regex.Pattern;
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
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String INVALID_EXTERNAL_PROFILE_ID = "external:configured";
    private static final Pattern PROFILE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private final CollectorDao collectorDao;
    private final CollectorIntakeAdvertisementReader advertisementReader;
    private final ExternalOtelCollectorIntakeProperties externalProperties;

    @Override
    public List<IntakeProfile> profiles() {
        int managerProfileLimit = externalProperties.configured() ? MAX_PROFILES - 1 : MAX_PROFILES;
        List<IntakeProfile> profiles = new ArrayList<>(collectorDao
                .findAll(PageRequest.of(0, managerProfileLimit, Sort.by("name").ascending())).stream()
                .map(advertisementReader::read)
                .map(this::map)
                .toList());
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
        IntakeKind kind = intake.gateway() == CollectorInstrumentationIntake.Gateway.SERVER
                ? IntakeKind.SERVER
                : IntakeKind.HERTZBEAT_COLLECTOR;
        String id = (kind == IntakeKind.SERVER ? "server:" : "collector:") + intake.collectorId();
        String collectorId = kind == IntakeKind.HERTZBEAT_COLLECTOR ? intake.collectorId() : null;
        if (intake.state() != CollectorInstrumentationIntake.State.AVAILABLE) {
            return new IntakeProfile(
                    id,
                    kind,
                    Availability.UNAVAILABLE,
                    null,
                    List.of(),
                    Map.of(),
                    null,
                    collectorId,
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
                kind,
                Availability.AVAILABLE,
                kind == IntakeKind.SERVER ? Gateway.SERVER : Gateway.COLLECTOR,
                transports,
                endpoints,
                intake.authorizationHeader(),
                collectorId,
                null);
    }

    private IntakeProfile mapExternal() {
        String profileId = normalize(externalProperties.profileId());
        if (profileId == null || !PROFILE_ID.matcher(profileId).matches()) {
            return invalidExternal(INVALID_EXTERNAL_PROFILE_ID);
        }
        try {
            EnumMap<OtlpTransport, IntakeEndpoint> endpoints = new EnumMap<>(OtlpTransport.class);
            List<OtlpTransport> transports = new ArrayList<>();
            addExternalEndpoint(
                    transports,
                    endpoints,
                    OtlpTransport.HTTP_PROTOBUF,
                    externalProperties.otlpHttpEndpoint());
            addExternalEndpoint(
                    transports,
                    endpoints,
                    OtlpTransport.GRPC,
                    externalProperties.otlpGrpcEndpoint());
            if (transports.isEmpty()) {
                return invalidExternal(profileId);
            }
            return new IntakeProfile(
                    profileId,
                    IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                    Availability.AVAILABLE,
                    Gateway.EXTERNAL,
                    transports,
                    endpoints,
                    AUTHORIZATION_HEADER,
                    null,
                    null);
        } catch (IllegalArgumentException exception) {
            // Deployment values can be sensitive even when malformed; expose only the stable contract code.
            return invalidExternal(profileId);
        }
    }

    private void addExternalEndpoint(
            List<OtlpTransport> transports,
            Map<OtlpTransport, IntakeEndpoint> endpoints,
            OtlpTransport transport,
            String configuredEndpoint) {
        String endpoint = normalize(configuredEndpoint);
        if (endpoint != null) {
            transports.add(transport);
            endpoints.put(transport, IntakeEndpoint.fromUrl(endpoint));
        }
    }

    private IntakeProfile invalidExternal(String profileId) {
        return new IntakeProfile(
                profileId,
                IntakeKind.EXTERNAL_OTEL_COLLECTOR,
                Availability.UNAVAILABLE,
                null,
                List.of(),
                Map.of(),
                null,
                null,
                ErrorCode.ADVERTISEMENT_INVALID);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
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
