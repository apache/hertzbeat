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
        Optional<PublicAccessSettings> publicAccess,
        Optional<RetentionSettings> retention,
        Optional<MailSettings> mail) {

    public ManagedOptionalConfiguration {
        Objects.requireNonNull(publicAccess, "publicAccess");
        Objects.requireNonNull(retention, "retention");
        Objects.requireNonNull(mail, "mail");
    }

    public static ManagedOptionalConfiguration empty() {
        return new ManagedOptionalConfiguration(Optional.empty(), Optional.empty(), Optional.empty());
    }

    /** Explicit operator-owned public access addresses. */
    public record PublicAccessSettings(
            Optional<String> publicBaseUrl,
            Optional<String> serverOtlpHttpEndpoint,
            Optional<String> serverOtlpGrpcEndpoint) {
        public PublicAccessSettings {
            Objects.requireNonNull(publicBaseUrl, "publicBaseUrl");
            Objects.requireNonNull(serverOtlpHttpEndpoint, "serverOtlpHttpEndpoint");
            Objects.requireNonNull(serverOtlpGrpcEndpoint, "serverOtlpGrpcEndpoint");
            publicBaseUrl = validateConfigured(publicBaseUrl, SetupPublicAddress.Kind.PUBLIC_BASE_URL);
            serverOtlpHttpEndpoint = validateConfigured(
                    serverOtlpHttpEndpoint, SetupPublicAddress.Kind.SERVER_OTLP_ENDPOINT);
            serverOtlpGrpcEndpoint = validateConfigured(
                    serverOtlpGrpcEndpoint, SetupPublicAddress.Kind.SERVER_OTLP_ENDPOINT);
            if (publicBaseUrl.isEmpty() && serverOtlpHttpEndpoint.isEmpty() && serverOtlpGrpcEndpoint.isEmpty()) {
                throw new IllegalArgumentException("At least one public access address is required");
            }
        }

        private static Optional<String> validateConfigured(Optional<String> endpoint, SetupPublicAddress.Kind kind) {
            if (endpoint.isEmpty()) {
                return Optional.empty();
            }
            String value = endpoint.orElseThrow();
            Optional<SetupPublicAddress> address = kind == SetupPublicAddress.Kind.PUBLIC_BASE_URL
                    ? SetupPublicAddress.publicBaseUrl(value) : SetupPublicAddress.serverOtlpEndpoint(value);
            if (address.isEmpty()) {
                throw new IllegalArgumentException("Public access address must not be blank");
            }
            return address.map(SetupPublicAddress::value);
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
