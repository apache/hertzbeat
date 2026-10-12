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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;

class SetupRequestValidatorProbeTest {

    @Test
    void sectionProbesAreExplicitAndTheirStableFailureIsReturned() {
        MetadataConnectionProbe metadata = ignored -> Optional.of(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
        TelemetryConnectionProbe telemetry = ignored -> Optional.empty();
        MailConnectionProbe mail = ignored -> Optional.empty();
        SetupRequestValidator validator = new SetupRequestValidator(
                Clock.systemUTC(), metadata, telemetry, mail);

        var response = validator.validate(new ValidateRequest(ValidationSection.METADATA_DATABASE,
                metadata(), null, null, null));

        assertThat(response.valid()).isFalse();
        assertThat(response.errorCode()).isEqualTo(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
    }

    @Test
    void structuralFailuresDoNotReachConnectionProbe() {
        MetadataConnectionProbe metadata = ignored -> {
            throw new AssertionError("connection probe must not be called");
        };
        SetupRequestValidator validator = new SetupRequestValidator(
                Clock.systemUTC(), metadata, ignored -> Optional.empty(), ignored -> Optional.empty());
        MetadataDatabaseConfiguration wrongKind = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:h2:mem:wrong", "sa", "password");

        var response = validator.validate(new ValidateRequest(ValidationSection.METADATA_DATABASE,
                wrongKind, null, null, null));

        assertThat(response.errorCode()).isEqualTo(SetupErrorCode.METADATA_KIND_UNSUPPORTED);
    }

    @Test
    void telemetryAndMailUseTheirConnectionBoundaries() {
        SetupRequestValidator validator = new SetupRequestValidator(Clock.systemUTC(),
                ignored -> Optional.empty(),
                ignored -> Optional.of(SetupErrorCode.TELEMETRY_CONNECTION_FAILED),
                ignored -> Optional.of(SetupErrorCode.MAIL_CONNECTION_FAILED));

        assertThat(validator.validate(new ValidateRequest(ValidationSection.TELEMETRY_STORE,
                null, telemetry(), null, null)).errorCode())
                .isEqualTo(SetupErrorCode.TELEMETRY_CONNECTION_FAILED);
        assertThat(validator.validate(new ValidateRequest(ValidationSection.MAIL,
                null, null, null, mail())).errorCode())
                .isEqualTo(SetupErrorCode.MAIL_CONNECTION_FAILED);
    }

    @Test
    void headlessTelemetryValidatesCredentialPairWithoutHttpSecretDto() {
        TelemetryConnectionProbe telemetry = ignored -> {
            throw new AssertionError("connection probe must not be called");
        };
        SetupRequestValidator validator = new SetupRequestValidator(Clock.systemUTC(),
                ignored -> Optional.empty(), telemetry, ignored -> Optional.empty());
        try (SecretValue password = SecretValue.of("secret")) {
            var configuration = new HeadlessSetupWorkflow.Telemetry(
                    "localhost:4001", "http://localhost:4000", "public",
                    Optional.empty(), Optional.of(password));

            assertThrows(SetupApiException.class, () -> validator.validate(configuration));
        }
    }

    @Test
    void headlessMetadataProbeUsesAndClearsAnIndependentSecretOwner() {
        AtomicReference<MetadataConnectionProbe.Request> observed = new AtomicReference<>();
        MetadataConnectionProbe metadata = request -> {
            observed.set(request);
            assertThat(request.password().copy()).containsExactly("secret".toCharArray());
            return Optional.empty();
        };
        SetupRequestValidator validator = new SetupRequestValidator(Clock.systemUTC(), metadata,
                ignored -> Optional.empty(), ignored -> Optional.empty());
        try (SecretValue callerSecret = SecretValue.of("secret")) {
            validator.validate(new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2,
                    "jdbc:h2:mem:setup-probe", "sa", callerSecret));

            assertThat(observed.get().password().copy()).containsOnly('\0');
            assertThat(callerSecret.copy()).containsExactly("secret".toCharArray());
        }
    }

    @Test
    void headlessTelemetryProbeUsesAndClearsAnIndependentSecretOwner() {
        AtomicReference<TelemetryConnectionProbe.Request> observed = new AtomicReference<>();
        TelemetryConnectionProbe telemetry = request -> {
            observed.set(request);
            assertThat(request.password().orElseThrow().copy()).containsExactly("secret".toCharArray());
            return Optional.empty();
        };
        SetupRequestValidator validator = new SetupRequestValidator(Clock.systemUTC(),
                ignored -> Optional.empty(), telemetry, ignored -> Optional.empty());
        try (SecretValue callerSecret = SecretValue.of("secret")) {
            validator.validate(new HeadlessSetupWorkflow.Telemetry(
                    "localhost:4001", "http://localhost:4000", "public",
                    Optional.of("telemetry"), Optional.of(callerSecret)));

            assertThat(observed.get().password().orElseThrow().copy()).containsOnly('\0');
            assertThat(callerSecret.copy()).containsExactly("secret".toCharArray());
        }
    }

    @Test
    void headlessMetadataUsesTheSameKindAndJdbcStructureValidatorAsBrowserRequests() {
        MetadataConnectionProbe metadata = ignored -> {
            throw new AssertionError("connection probe must not be called");
        };
        SetupRequestValidator validator = new SetupRequestValidator(Clock.systemUTC(), metadata,
                ignored -> Optional.empty(), ignored -> Optional.empty());
        try (SecretValue password = SecretValue.of("secret")) {
            SetupApiException failure = assertThrows(SetupApiException.class,
                    () -> validator.validate(new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.MYSQL,
                            "jdbc:h2:mem:wrong-kind", "sa", password)));

            assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.METADATA_KIND_UNSUPPORTED);
        }
    }

    private static MetadataDatabaseConfiguration metadata() {
        return new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, "jdbc:h2:mem:setup-probe", "sa", "password");
    }

    private static TelemetryStoreConfiguration telemetry() {
        return new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                "localhost:4001", "http://localhost:4000", "public", null, null);
    }

    private static MailConfiguration mail() {
        return new MailConfiguration("localhost", 2525, MailSecurity.NONE,
                null, null, "hertzbeat@example.test");
    }
}
