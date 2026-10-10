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

import java.util.Optional;

/** Owns construction and cleanup of an independent metadata-target candidate bundle. */
final class ManagedMetadataTargetCandidate {

    private ManagedMetadataTargetCandidate() {
    }

    static ManagedConfigurationBundle copyReplacingMetadata(
            ManagedApplicationConfig source, ManagedSecrets sourceSecrets,
            MetadataDatabaseSettings target, SecretValue password) {
        SecretValue metadataPassword = SecretValue.copyOf(password);
        Optional<SecretValue> telemetryPassword = Optional.empty();
        Optional<SecretValue> mailPassword = Optional.empty();
        try {
            telemetryPassword = sourceSecrets.telemetryPassword().map(SecretValue::copyOf);
            mailPassword = sourceSecrets.mailPassword().map(SecretValue::copyOf);
            ManagedSecrets candidateSecrets = new ManagedSecrets(
                    metadataPassword, telemetryPassword, mailPassword);
            return new ManagedConfigurationBundle(
                    new ManagedApplicationConfig(copy(target), copy(source.telemetryStore()),
                            copy(source.optional())),
                    candidateSecrets);
        } catch (RuntimeException | Error failure) {
            metadataPassword.close();
            telemetryPassword.ifPresent(SecretValue::close);
            mailPassword.ifPresent(SecretValue::close);
            throw failure;
        }
    }

    private static MetadataDatabaseSettings copy(MetadataDatabaseSettings source) {
        return new MetadataDatabaseSettings(source.kind(), source.jdbcUrl(), source.username());
    }

    private static GreptimeSettings copy(GreptimeSettings source) {
        GreptimeEndpoints endpoints = source.endpoints();
        return new GreptimeSettings(new GreptimeEndpoints(endpoints.grpc(), endpoints.http()),
                source.database(), source.username());
    }

    private static ManagedOptionalConfiguration copy(ManagedOptionalConfiguration source) {
        return new ManagedOptionalConfiguration(
                source.publicAccess().map(ManagedMetadataTargetCandidate::copy),
                source.retention().map(value -> new ManagedOptionalConfiguration.RetentionSettings(value.days())),
                source.mail().map(ManagedMetadataTargetCandidate::copy));
    }

    private static ManagedOptionalConfiguration.PublicAccessSettings copy(
            ManagedOptionalConfiguration.PublicAccessSettings source) {
        return new ManagedOptionalConfiguration.PublicAccessSettings(
                source.publicBaseUrl(), source.serverOtlpHttpEndpoint(), source.serverOtlpGrpcEndpoint());
    }

    private static ManagedOptionalConfiguration.MailSettings copy(
            ManagedOptionalConfiguration.MailSettings source) {
        return new ManagedOptionalConfiguration.MailSettings(
                source.host(), source.port(), source.security(), source.username(), source.fromAddress());
    }
}
