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

package org.apache.hertzbeat.observability.instrumentation.v2.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Safe, independently discoverable OTLP destination contracts. */
public final class InstrumentationIntakeProfileV2 {

    private static final int MAX_PROFILES = 128;

    private InstrumentationIntakeProfileV2() {
    }

    /** Destination ownership kind. */
    public enum IntakeKind {
        SERVER("server"),
        HERTZBEAT_COLLECTOR("hertzbeat_collector"),
        EXTERNAL_OTEL_COLLECTOR("external_otel_collector");

        private final String code;

        IntakeKind(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Whether the advertised destination can be selected. */
    public enum Availability {
        AVAILABLE("available"),
        UNAVAILABLE("unavailable");

        private final String code;

        Availability(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Explicit OTLP transport. */
    public enum OtlpTransport {
        HTTP_PROTOBUF("http_protobuf"),
        GRPC("grpc");

        private final String code;

        OtlpTransport(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Transport confidentiality derived from the explicit endpoint scheme. */
    public enum TransportSecurity {
        TLS("tls"),
        PLAINTEXT("plaintext");

        private final String code;

        TransportSecurity(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Explicit application-to-intake authentication contract. */
    public enum Authentication {
        NONE("none"),
        BEARER_TOKEN("bearer_token");

        private final String code;

        Authentication(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }

        public static Authentication fromCode(String code) {
            for (Authentication value : values()) {
                if (value.code.equals(code)) {
                    return value;
                }
            }
            throw new IllegalArgumentException("Intake authentication is invalid");
        }
    }

    /** One explicit endpoint paired with its scheme-derived transport security. */
    public record IntakeEndpoint(String url, TransportSecurity security) {

        public IntakeEndpoint {
            URI uri = requireHttpEndpoint(url);
            Objects.requireNonNull(security, "security");
            TransportSecurity derived = "https".equalsIgnoreCase(uri.getScheme())
                    ? TransportSecurity.TLS
                    : TransportSecurity.PLAINTEXT;
            if (security != derived) {
                throw new IllegalArgumentException("Intake endpoint security must match its URI scheme");
            }
        }

        public static IntakeEndpoint fromUrl(String url) {
            URI uri = requireHttpEndpoint(url);
            TransportSecurity security = "https".equalsIgnoreCase(uri.getScheme())
                    ? TransportSecurity.TLS
                    : TransportSecurity.PLAINTEXT;
            return new IntakeEndpoint(url, security);
        }
    }

    /** Stable intake gateway identifier. */
    public enum Gateway {
        SERVER("server"),
        COLLECTOR("collector"),
        EXTERNAL("external");

        private final String code;

        Gateway(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Stable, non-sensitive profile discovery failures. */
    public enum ErrorCode {
        NOT_ADVERTISED("intake_profile_not_advertised"),
        ADVERTISEMENT_INVALID("intake_profile_advertisement_invalid"),
        UNAVAILABLE("intake_profile_unavailable"),
        DISCOVERY_UNAVAILABLE("intake_profile_discovery_unavailable");

        private final String code;

        ErrorCode(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Whether profile discovery completed and whether it found configured profiles. */
    public enum DiscoveryStatus {
        AVAILABLE("available"),
        UNCONFIGURED("unconfigured"),
        UNAVAILABLE("unavailable");

        private final String code;

        DiscoveryStatus(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** One resolved, non-secret destination. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record IntakeProfile(
            String id,
            IntakeKind kind,
            Availability availability,
            Gateway gateway,
            List<OtlpTransport> supportedTransports,
            Map<OtlpTransport, IntakeEndpoint> endpoints,
            Authentication authentication,
            String authorizationHeader,
            String collectorId,
            ErrorCode errorCode) {

        public IntakeProfile(
                String id,
                IntakeKind kind,
                Availability availability,
                Gateway gateway,
                List<OtlpTransport> supportedTransports,
                Map<OtlpTransport, IntakeEndpoint> endpoints,
                String authorizationHeader,
                String collectorId,
                ErrorCode errorCode) {
            this(
                    id,
                    kind,
                    availability,
                    gateway,
                    supportedTransports,
                    endpoints,
                    availability == Availability.AVAILABLE ? Authentication.BEARER_TOKEN : null,
                    authorizationHeader,
                    collectorId,
                    errorCode);
        }

        public IntakeProfile {
            requireId(id);
            Objects.requireNonNull(kind, "kind");
            Objects.requireNonNull(availability, "availability");
            supportedTransports = copyTransports(supportedTransports);
            endpoints = Map.copyOf(Objects.requireNonNull(endpoints, "endpoints"));
            if (availability == Availability.AVAILABLE) {
                validateAvailable(
                        kind,
                        gateway,
                        supportedTransports,
                        endpoints,
                        authentication,
                        authorizationHeader,
                        collectorId,
                        errorCode);
            } else {
                validateUnavailable(
                        kind,
                        gateway,
                        supportedTransports,
                        endpoints,
                        authentication,
                        authorizationHeader,
                        collectorId,
                        errorCode);
            }
        }
    }

    /** Discovery result sorted in backend preference order. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record IntakeProfilesResponse(
            int schemaVersion,
            DiscoveryStatus status,
            ErrorCode errorCode,
            String defaultProfileId,
            List<IntakeProfile> profiles) {
        public IntakeProfilesResponse {
            if (schemaVersion != InstrumentationCatalogV2.SCHEMA_VERSION) {
                throw new IllegalArgumentException("Unsupported Instrumentation v2 schema");
            }
            Objects.requireNonNull(status, "status");
            Objects.requireNonNull(profiles, "profiles");
            if (profiles.size() > MAX_PROFILES || profiles.stream().anyMatch(Objects::isNull)
                    || profiles.stream().map(IntakeProfile::id).distinct().count() != profiles.size()) {
                throw new IllegalArgumentException("Instrumentation intake profile list is invalid");
            }
            profiles = List.copyOf(profiles);
            if (status == DiscoveryStatus.UNAVAILABLE
                    ? errorCode != ErrorCode.DISCOVERY_UNAVAILABLE || !profiles.isEmpty()
                            || defaultProfileId != null
                    : errorCode != null
                            || status == DiscoveryStatus.UNCONFIGURED && !profiles.isEmpty()
                            || status == DiscoveryStatus.AVAILABLE && profiles.isEmpty()) {
                throw new IllegalArgumentException("Instrumentation intake discovery status is invalid");
            }
            if (defaultProfileId != null && profiles.stream()
                    .noneMatch(profile -> profile.id().equals(defaultProfileId)
                            && profile.availability() == Availability.AVAILABLE)) {
                throw new IllegalArgumentException("Default intake profile must be available");
            }
        }
    }

    private static List<OtlpTransport> copyTransports(List<OtlpTransport> values) {
        Objects.requireNonNull(values, "supportedTransports");
        if (values.stream().anyMatch(Objects::isNull) || new HashSet<>(values).size() != values.size()) {
            throw new IllegalArgumentException("OTLP transports must be unique");
        }
        return List.copyOf(values);
    }

    private static void validateAvailable(
            IntakeKind kind,
            Gateway gateway,
            List<OtlpTransport> transports,
            Map<OtlpTransport, IntakeEndpoint> endpoints,
            Authentication authentication,
            String authorizationHeader,
            String collectorId,
            ErrorCode errorCode) {
        if (gateway == null || transports.isEmpty()
                || transports.size() != endpoints.size() || !endpoints.keySet().containsAll(transports)
                || authentication == null || errorCode != null) {
            throw new IllegalArgumentException("Available intake profile is invalid");
        }
        if (authentication == Authentication.BEARER_TOKEN
                ? !"Authorization".equals(authorizationHeader)
                : authorizationHeader != null) {
            throw new IllegalArgumentException("Intake authentication metadata is inconsistent");
        }
        if (kind != IntakeKind.EXTERNAL_OTEL_COLLECTOR
                && authentication != Authentication.BEARER_TOKEN) {
            throw new IllegalArgumentException("HertzBeat intake profiles require bearer authentication");
        }
        if ((kind == IntakeKind.SERVER && gateway != Gateway.SERVER)
                || (kind == IntakeKind.HERTZBEAT_COLLECTOR && gateway != Gateway.COLLECTOR)
                || (kind == IntakeKind.EXTERNAL_OTEL_COLLECTOR && gateway != Gateway.EXTERNAL)) {
            throw new IllegalArgumentException("Intake profile kind and gateway do not match");
        }
        if (endpoints.entrySet().stream().anyMatch(entry -> entry.getKey() == null || entry.getValue() == null)) {
            throw new IllegalArgumentException("Available intake profile endpoints are invalid");
        }
        if (kind == IntakeKind.HERTZBEAT_COLLECTOR) {
            requireId(collectorId);
        } else if (collectorId != null) {
            throw new IllegalArgumentException("Collector ID is only valid for a HertzBeat Collector profile");
        }
    }

    private static void validateUnavailable(
            IntakeKind kind,
            Gateway gateway,
            List<OtlpTransport> transports,
            Map<OtlpTransport, IntakeEndpoint> endpoints,
            Authentication authentication,
            String authorizationHeader,
            String collectorId,
            ErrorCode errorCode) {
        if (gateway != null || !transports.isEmpty() || !endpoints.isEmpty()
                || authentication != null || authorizationHeader != null
                || (kind == IntakeKind.HERTZBEAT_COLLECTOR && collectorId == null)
                || (kind != IntakeKind.HERTZBEAT_COLLECTOR && collectorId != null) || errorCode == null) {
            throw new IllegalArgumentException("Unavailable intake profile cannot advertise connectivity");
        }
        if (collectorId != null) {
            requireId(collectorId);
        }
    }

    private static URI requireHttpEndpoint(String value) {
        try {
            URI uri = URI.create(value);
            if (!isHttpScheme(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getRawQuery() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException("Intake profile endpoint must be explicit HTTP(S)");
            }
            return uri;
        } catch (NullPointerException | IllegalArgumentException exception) {
            throw new IllegalArgumentException("Intake profile endpoint must be explicit HTTP(S)");
        }
    }

    private static boolean isHttpScheme(String scheme) {
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }

    private static void requireId(String value) {
        if (value == null || !value.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")) {
            throw new IllegalArgumentException("Instrumentation intake profile ID is invalid");
        }
    }
}
