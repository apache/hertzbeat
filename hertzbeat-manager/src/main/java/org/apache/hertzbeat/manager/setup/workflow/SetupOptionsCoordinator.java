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

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;
import org.springframework.http.HttpStatus;

/** Maps and atomically persists optional setup settings through the existing two-file transaction. */
public final class SetupOptionsCoordinator {
    private final ManagedConfigurationTransaction transaction;

    public SetupOptionsCoordinator(ManagedConfigurationTransaction transaction) {
        this.transaction = transaction;
    }

    public void persist(OptionsRequest request) {
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.ofNullable(request.publicAccess()).flatMap(value -> {
                    Optional<String> publicBaseUrl = SetupPublicAddress.publicBaseUrl(value.publicBaseUrl())
                            .map(SetupPublicAddress::value);
                    Optional<String> httpEndpoint = SetupPublicAddress
                            .serverOtlpEndpoint(value.serverOtlpHttpEndpoint()).map(SetupPublicAddress::value);
                    Optional<String> grpcEndpoint = SetupPublicAddress
                            .serverOtlpEndpoint(value.serverOtlpGrpcEndpoint()).map(SetupPublicAddress::value);
                    return publicBaseUrl.isEmpty() && httpEndpoint.isEmpty() && grpcEndpoint.isEmpty()
                            ? Optional.empty() : Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                                    publicBaseUrl, httpEndpoint, grpcEndpoint));
                }),
                Optional.ofNullable(request.retention()).map(value ->
                        new ManagedOptionalConfiguration.RetentionSettings(value.days())),
                Optional.ofNullable(request.mail()).map(value ->
                        new ManagedOptionalConfiguration.MailSettings(value.host(), value.port(), value.security(),
                                text(value.username()), value.fromAddress())));
        Optional<SecretValue> mailPassword = Optional.ofNullable(request.mail())
                .flatMap(value -> text(value.password())).map(SecretValue::of);
        try {
            ManagedConfigurationTransaction.Outcome outcome = transaction.applyOptions(options, mailPassword);
            if (outcome == ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED) {
                throw new SetupApiException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, HttpStatus.CONFLICT);
            }
            if (outcome != ManagedConfigurationTransaction.Outcome.APPLIED) {
                throw writeFailure();
            }
        } catch (IOException failure) {
            throw writeFailure();
        } finally {
            mailPassword.ifPresent(SecretValue::close);
        }
    }

    private static Optional<String> text(String value) {
        return value == null || value.isBlank() ? Optional.empty() : Optional.of(value);
    }

    private static SetupApiException writeFailure() {
        return new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
