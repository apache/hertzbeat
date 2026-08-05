/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.instrumentation;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;

/** Maps explicit deployment configuration into a safe, secret-free destination profile. */
final class ConfiguredInstrumentationIntakeProfileFactory {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final Pattern PROFILE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");

    private ConfiguredInstrumentationIntakeProfileFactory() {
    }

    static IntakeProfile create(
            InstrumentationIntakeProperties properties,
            IntakeKind kind,
            Gateway gateway,
            String safeInvalidId) {
        String profileId = normalize(properties.profileId());
        if (profileId == null || !PROFILE_ID.matcher(profileId).matches()) {
            return invalid(safeInvalidId, kind);
        }
        try {
            EnumMap<OtlpTransport, IntakeEndpoint> endpoints = new EnumMap<>(OtlpTransport.class);
            List<OtlpTransport> transports = new ArrayList<>();
            addEndpoint(transports, endpoints, OtlpTransport.HTTP_PROTOBUF, properties.otlpHttpEndpoint());
            addEndpoint(transports, endpoints, OtlpTransport.GRPC, properties.otlpGrpcEndpoint());
            if (transports.isEmpty()) {
                return invalid(profileId, kind);
            }
            Authentication authentication = Authentication.fromCode(normalize(properties.authentication()));
            return new IntakeProfile(
                    profileId,
                    kind,
                    Availability.AVAILABLE,
                    gateway,
                    transports,
                    endpoints,
                    authentication,
                    authentication == Authentication.BEARER_TOKEN ? AUTHORIZATION_HEADER : null,
                    null,
                    null);
        } catch (IllegalArgumentException exception) {
            // Deployment values can be sensitive even when malformed; expose only the stable contract code.
            return invalid(profileId, kind);
        }
    }

    static IntakeProfile invalid(String profileId, IntakeKind kind) {
        return new IntakeProfile(
                profileId,
                kind,
                Availability.UNAVAILABLE,
                null,
                List.of(),
                Map.of(),
                null,
                null,
                ErrorCode.ADVERTISEMENT_INVALID);
    }

    private static void addEndpoint(
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

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
