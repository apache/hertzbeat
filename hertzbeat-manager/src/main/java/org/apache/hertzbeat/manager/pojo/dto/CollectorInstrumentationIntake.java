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

import com.fasterxml.jackson.annotation.JsonValue;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;

/**
 * Safe public advertisement for one Collector's application-instrumentation intake.
 *
 * <p>The contract contains only explicitly advertised HTTP(S) endpoints and the standard header name. It never
 * derives an address from a request host, Collector address, or default port, and it never carries credential
 * material.</p>
 */
public record CollectorInstrumentationIntake(int schemaVersion, String collectorId, State state, Gateway gateway,
                                              List<Capability> capabilities, String otlpHttpEndpoint,
                                              String otlpGrpcEndpoint, String authorizationHeader,
                                              ErrorCode errorCode) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    public static final String AUTHORIZATION_HEADER = "Authorization";

    public CollectorInstrumentationIntake {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("Unsupported instrumentation intake schema version");
        }
        collectorId = requireCollectorId(collectorId);
        state = Objects.requireNonNull(state, "state");
        Objects.requireNonNull(capabilities, "capabilities");
        if (capabilities.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Instrumentation intake capabilities cannot contain null");
        }
        capabilities = List.copyOf(capabilities);
        if (new HashSet<>(capabilities).size() != capabilities.size()) {
            throw new IllegalArgumentException("Instrumentation intake capabilities must be unique");
        }
        if (state == State.AVAILABLE) {
            validateAvailable(
                    gateway,
                    capabilities,
                    otlpHttpEndpoint,
                    otlpGrpcEndpoint,
                    authorizationHeader,
                    errorCode);
        } else {
            validateUnavailable(
                    gateway,
                    capabilities,
                    otlpHttpEndpoint,
                    otlpGrpcEndpoint,
                    authorizationHeader,
                    errorCode);
        }
    }

    public static CollectorInstrumentationIntake notAdvertised(String collectorId) {
        return unavailable(collectorId, ErrorCode.INTAKE_NOT_ADVERTISED);
    }

    public static CollectorInstrumentationIntake unavailable(String collectorId, ErrorCode errorCode) {
        return new CollectorInstrumentationIntake(
                CURRENT_SCHEMA_VERSION,
                collectorId,
                State.UNAVAILABLE,
                null,
                List.of(),
                null,
                null,
                null,
                errorCode);
    }

    private static void validateAvailable(Gateway gateway, List<Capability> capabilities,
                                          String otlpHttpEndpoint, String otlpGrpcEndpoint,
                                          String authorizationHeader, ErrorCode errorCode) {
        Objects.requireNonNull(gateway, "gateway");
        if (capabilities.isEmpty()) {
            throw new IllegalArgumentException("Available instrumentation intake requires a capability");
        }
        if (!AUTHORIZATION_HEADER.equals(authorizationHeader)) {
            throw new IllegalArgumentException("Available instrumentation intake exposes only Authorization");
        }
        if (errorCode != null) {
            throw new IllegalArgumentException("Available instrumentation intake cannot have an error code");
        }
        boolean hasHttp = capabilities.contains(Capability.OTLP_HTTP_PROTOBUF);
        boolean hasGrpc = capabilities.contains(Capability.OTLP_GRPC);
        if (hasHttp != (otlpHttpEndpoint != null) || hasGrpc != (otlpGrpcEndpoint != null)) {
            throw new IllegalArgumentException("Instrumentation intake endpoints must match capabilities");
        }
        requireHttpEndpoint(otlpHttpEndpoint, "OTLP HTTP endpoint");
        requireHttpEndpoint(otlpGrpcEndpoint, "OTLP gRPC endpoint");
    }

    private static void validateUnavailable(Gateway gateway, List<Capability> capabilities,
                                            String otlpHttpEndpoint, String otlpGrpcEndpoint,
                                            String authorizationHeader, ErrorCode errorCode) {
        if (gateway != null || !capabilities.isEmpty() || otlpHttpEndpoint != null || otlpGrpcEndpoint != null
                || authorizationHeader != null) {
            throw new IllegalArgumentException("Unavailable instrumentation intake cannot advertise connectivity");
        }
        Objects.requireNonNull(errorCode, "errorCode");
    }

    private static String requireCollectorId(String collectorId) {
        if (collectorId == null || collectorId.isBlank() || collectorId.length() > 128
                || collectorId.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Collector ID must contain 1 to 128 safe characters");
        }
        return collectorId;
    }

    private static void requireHttpEndpoint(String endpoint, String label) {
        if (endpoint == null) {
            return;
        }
        URI uri;
        try {
            uri = URI.create(endpoint);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(label + " must be an HTTP(S) URI");
        }
        if (!isHttpScheme(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getRawQuery() != null || uri.getFragment() != null) {
            throw new IllegalArgumentException(label + " must be an HTTP(S) URI without credentials or query data");
        }
    }

    private static boolean isHttpScheme(String scheme) {
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }

    /** Whether an explicit safe intake advertisement is available. */
    public enum State {
        AVAILABLE("available"),
        UNAVAILABLE("unavailable");

        private final String code;

        State(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Product location accepting the advertised OTLP connection. */
    public enum Gateway {
        COLLECTOR("collector"),
        SERVER("server");

        private final String code;

        Gateway(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Protocol capabilities explicitly advertised by the selected gateway. */
    public enum Capability {
        OTLP_HTTP_PROTOBUF("otlp_http_protobuf"),
        OTLP_GRPC("otlp_grpc");

        private final String code;

        Capability(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Stable, non-sensitive reasons why an intake is unavailable. */
    public enum ErrorCode {
        INTAKE_NOT_ADVERTISED("intake_not_advertised"),
        INTAKE_ADVERTISEMENT_INVALID("intake_advertisement_invalid"),
        INTAKE_ADVERTISEMENT_UNAVAILABLE("intake_advertisement_unavailable");

        private final String code;

        ErrorCode(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }
}
