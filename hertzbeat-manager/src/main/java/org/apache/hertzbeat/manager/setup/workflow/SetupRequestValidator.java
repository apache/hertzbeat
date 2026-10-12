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

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;
import org.springframework.http.HttpStatus;

/** Shared browser/headless validation dispatcher with section-specific validators. */
public final class SetupRequestValidator {
    private final Clock clock;
    private final MetadataConfigurationValidator metadata = new MetadataConfigurationValidator();
    private final TelemetryConfigurationValidator telemetry = new TelemetryConfigurationValidator();
    private final PublicAccessConfigurationValidator publicAccess = new PublicAccessConfigurationValidator();
    private final MailConfigurationValidator mail = new MailConfigurationValidator();
    private final MetadataConnectionProbe metadataConnection;
    private final TelemetryConnectionProbe telemetryConnection;
    private final MailConnectionProbe mailConnection;

    public SetupRequestValidator(Clock clock) {
        this(clock, new JdbcMetadataConnectionProbe(Duration.ofSeconds(5)),
                new GreptimeHttpConnectionProbe(Duration.ofSeconds(5)),
                new JakartaMailConnectionProbe(Duration.ofSeconds(5)));
    }

    public SetupRequestValidator(Clock clock, MetadataConnectionProbe metadataConnection,
                                 TelemetryConnectionProbe telemetryConnection,
                                 MailConnectionProbe mailConnection) {
        this.clock = clock;
        this.metadataConnection = metadataConnection;
        this.telemetryConnection = telemetryConnection;
        this.mailConnection = mailConnection;
    }

    public ValidationResponse validate(ValidateRequest request) {
        Validation structural = switch (request.section()) {
            case METADATA_DATABASE -> metadata.validate(request.managementDatabase());
            case TELEMETRY_STORE -> telemetry.validate(request.telemetryStore());
            case PUBLIC_ACCESS -> publicAccess.validate(request.publicAccess());
            case MAIL -> mail.validate(request.mail());
        };
        Validation result = structural.valid() ? liveValidation(request, structural) : structural;
        return new ValidationResponse(result.valid(), clock.instant(), result.errorCode(), result.warnings());
    }

    public void validate(HeadlessSetupWorkflow.Metadata configuration) {
        Validation structural = metadata.validate(configuration.kind(), configuration.jdbcUrl());
        if (!structural.valid()) {
            throw new SetupApiException(structural.errorCode(), HttpStatus.BAD_REQUEST);
        }
        requireSuccess(metadataConnection.probe(configuration));
    }

    public void validate(HeadlessSetupWorkflow.Telemetry configuration) {
        Validation structural = telemetry.validate(configuration.grpcEndpoints(), configuration.httpEndpoint(),
                configuration.username().isPresent(), configuration.password().isPresent());
        if (!structural.valid()) {
            throw new SetupApiException(SetupErrorCode.TELEMETRY_CONNECTION_FAILED, HttpStatus.BAD_REQUEST);
        }
        requireSuccess(telemetryConnection.probe(configuration));
    }

    private Validation liveValidation(ValidateRequest request, Validation structural) {
        Optional<SetupErrorCode> failure = switch (request.section()) {
            case METADATA_DATABASE -> metadataConnection.probe(request.managementDatabase());
            case TELEMETRY_STORE -> telemetryConnection.probe(request.telemetryStore());
            case MAIL -> mailConnection.probe(request.mail());
            case PUBLIC_ACCESS -> Optional.empty();
        };
        return failure.map(Validation::failed).orElse(structural);
    }

    private static void requireSuccess(Optional<SetupErrorCode> failure) {
        failure.ifPresent(code -> {
            throw new SetupApiException(code, HttpStatus.BAD_REQUEST);
        });
    }
}
