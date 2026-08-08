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

package org.apache.hertzbeat.manager.setup.config;

import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;

/** Typed optional setup overlay kept in the existing managed application document. */
public record ManagedOptionalConfiguration(
        Optional<ServerInstrumentationSettings> serverInstrumentation,
        Optional<RetentionSettings> retention,
        Optional<MailSettings> mail) {

    public ManagedOptionalConfiguration {
        Objects.requireNonNull(serverInstrumentation, "serverInstrumentation");
        Objects.requireNonNull(retention, "retention");
        Objects.requireNonNull(mail, "mail");
    }

    public static ManagedOptionalConfiguration empty() {
        return new ManagedOptionalConfiguration(Optional.empty(), Optional.empty(), Optional.empty());
    }

    /** Optional server OTLP intake endpoints. */
    public record ServerInstrumentationSettings(
            Optional<String> serverOtlpHttpEndpoint,
            Optional<String> serverOtlpGrpcEndpoint) {
        public ServerInstrumentationSettings {
            Objects.requireNonNull(serverOtlpHttpEndpoint, "serverOtlpHttpEndpoint");
            Objects.requireNonNull(serverOtlpGrpcEndpoint, "serverOtlpGrpcEndpoint");
            serverOtlpHttpEndpoint = normalizeConfigured(serverOtlpHttpEndpoint);
            serverOtlpGrpcEndpoint = normalizeConfigured(serverOtlpGrpcEndpoint);
            if (serverOtlpHttpEndpoint.isEmpty() && serverOtlpGrpcEndpoint.isEmpty()) {
                throw new IllegalArgumentException("At least one server instrumentation endpoint is required");
            }
        }

        public static Optional<String> normalize(String value) {
            if (value == null) {
                return Optional.empty();
            }
            String normalized = value.trim();
            return normalized.isEmpty() ? Optional.empty() : Optional.of(normalized);
        }

        private static Optional<String> normalizeConfigured(Optional<String> endpoint) {
            if (endpoint.isPresent() && normalize(endpoint.orElseThrow()).isEmpty()) {
                throw new IllegalArgumentException("Server instrumentation endpoint must not be blank");
            }
            return endpoint.flatMap(ServerInstrumentationSettings::normalize);
        }
    }

    /** Optional Greptime database retention period. */
    public record RetentionSettings(int days) {
        public RetentionSettings {
            if (days <= 0) {
                throw new IllegalArgumentException("Retention must be positive");
            }
        }
    }

    /** Non-secret mail transport settings; its password remains in managed secrets. */
    public record MailSettings(String host, int port, MailSecurity security,
                               Optional<String> username, String fromAddress) {
        public MailSettings {
            Objects.requireNonNull(host, "host");
            Objects.requireNonNull(security, "security");
            Objects.requireNonNull(username, "username");
            Objects.requireNonNull(fromAddress, "fromAddress");
            if (port <= 0 || port > 65_535 || username.filter(String::isBlank).isPresent()) {
                throw new IllegalArgumentException("Mail settings are invalid");
            }
        }
    }
}
