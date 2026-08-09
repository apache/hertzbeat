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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedOptionalConfigurationPersistenceTest {
    @TempDir
    private java.nio.file.Path root;

    @Test
    void optionsUpdatePreservesRequiredSettingsAndStoresMailPasswordOnlyInSecrets() throws Exception {
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(root);
        assertThat(transaction.apply(required())).isEqualTo(ManagedConfigurationTransaction.Outcome.APPLIED);
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.of("https://hertzbeat.example"),
                        Optional.of("https://hertzbeat.example/otlp"),
                        Optional.of("https://hertzbeat.example:4317"))),
                Optional.of(new ManagedOptionalConfiguration.RetentionSettings(30)),
                Optional.of(new ManagedOptionalConfiguration.MailSettings(
                        "smtp.example", 465, MailSecurity.TLS, Optional.of("mailer"), "alerts@example.test")));

        assertThat(transaction.applyOptions(options, Optional.of(SecretValue.of("mail-secret"))))
                .isEqualTo(ManagedConfigurationTransaction.Outcome.APPLIED);

        ManagedApplicationConfig application = new FileManagedApplicationConfigStore(root)
                .readActive().value().orElseThrow();
        ManagedSecrets secrets = new FileManagedSecretStore(root).readActive().value().orElseThrow();
        assertThat(application.metadataDatabase()).isEqualTo(required().application().metadataDatabase());
        assertThat(application.optional()).isEqualTo(options);
        assertThat(secrets.mailPassword()).get().isEqualTo(SecretValue.of("mail-secret"));
        var properties = ApplicationConfigDocumentCodec.springProperties(application);
        assertThat(properties)
                .containsEntry("hertzbeat.setup.public-base-url", "https://hertzbeat.example")
                .containsEntry("hertzbeat.instrumentation.server.otlp-http-endpoint",
                        "https://hertzbeat.example/otlp")
                .containsEntry("hertzbeat.instrumentation.server.otlp-grpc-endpoint",
                        "https://hertzbeat.example:4317")
                .containsEntry("hertzbeat.instrumentation.server.profile-id", "server-direct")
                .containsEntry("hertzbeat.instrumentation.server.authentication", "bearer_token")
                .containsEntry("warehouse.store.greptime.expire-time", "30d")
                .containsEntry("spring.mail.properties.mail.smtp.ssl.enable", "true")
                .containsEntry("spring.mail.properties.mail.smtp.starttls.enable", "false")
                .containsEntry("hertzbeat.mail.from-address", "alerts@example.test")
                .doesNotContainKey("hertzbeat.setup.mail.security");
        assertThat(properties.toString()).doesNotContain("mail-secret");
    }

    @Test
    void rejectsServerEndpointsWithoutCompleteInternalProfileSettings() throws Exception {
        ManagedApplicationConfig application = required().application();
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.empty(), Optional.of("https://hertzbeat.example/otlp"), Optional.empty())),
                Optional.empty(), Optional.empty());
        application = new ManagedApplicationConfig(
                application.metadataDatabase(), application.telemetryStore(), options);
        ApplicationConfigDocumentCodec codec = new ApplicationConfigDocumentCodec();
        ManagedDocumentCodec.Integrity.VerifiedBody encoded = ManagedDocumentCodec.Integrity.extract(
                codec.encode(application, "generation"));
        String incomplete = encoded.content().replace(
                "hertzbeat.instrumentation.server.authentication: 'bearer_token'\n", "");

        byte[] document = ManagedDocumentCodec.Integrity.envelope(incomplete, encoded.generation());
        assertThatThrownBy(() -> codec.decode(document))
                .isInstanceOf(ManagedDocumentCodec.DocumentException.class);
    }

    @Test
    void publicBaseUrlRoundTripsWithoutInventingServerEndpoints() throws Exception {
        ManagedApplicationConfig application = required().application();
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.of("http://192.168.10.5:1157"), Optional.empty(), Optional.empty())),
                Optional.empty(), Optional.empty());
        application = new ManagedApplicationConfig(
                application.metadataDatabase(), application.telemetryStore(), options);
        ApplicationConfigDocumentCodec codec = new ApplicationConfigDocumentCodec();

        ManagedApplicationConfig decoded = codec.decode(codec.encode(application, "generation")).value();

        assertThat(decoded.optional()).isEqualTo(options);
        assertThat(ApplicationConfigDocumentCodec.springProperties(decoded))
                .containsEntry("hertzbeat.setup.public-base-url", "http://192.168.10.5:1157")
                .doesNotContainKeys("hertzbeat.instrumentation.server.otlp-http-endpoint",
                        "hertzbeat.instrumentation.server.otlp-grpc-endpoint",
                        "hertzbeat.instrumentation.server.profile-id",
                        "hertzbeat.instrumentation.server.authentication");
    }

    @Test
    void rejectsBlankManagedPublicAddress() {
        assertThatThrownBy(() -> new ManagedOptionalConfiguration.PublicAccessSettings(
                Optional.of("  "), Optional.empty(), Optional.empty()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsControlOnlyManagedPublicAddress() {
        assertThatThrownBy(() -> new ManagedOptionalConfiguration.PublicAccessSettings(
                Optional.of("\u0000"), Optional.empty(), Optional.empty()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsBlankServerEndpointInManagedDocument() throws Exception {
        ManagedApplicationConfig application = required().application();
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.empty(), Optional.of("https://hertzbeat.example/otlp"), Optional.empty())),
                Optional.empty(), Optional.empty());
        application = new ManagedApplicationConfig(
                application.metadataDatabase(), application.telemetryStore(), options);
        ApplicationConfigDocumentCodec codec = new ApplicationConfigDocumentCodec();
        ManagedDocumentCodec.Integrity.VerifiedBody encoded = ManagedDocumentCodec.Integrity.extract(
                codec.encode(application, "generation"));
        String blankEndpoint = encoded.content().replace(
                "hertzbeat.instrumentation.server.otlp-http-endpoint: 'https://hertzbeat.example/otlp'",
                "hertzbeat.instrumentation.server.otlp-http-endpoint: '  '");

        byte[] document = ManagedDocumentCodec.Integrity.envelope(blankEndpoint, encoded.generation());
        assertThatThrownBy(() -> codec.decode(document))
                .isInstanceOf(ManagedDocumentCodec.DocumentException.class);
    }

    @Test
    void rejectsInvalidPublicAddressInManagedDocument() throws Exception {
        ManagedApplicationConfig application = required().application();
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                        Optional.of("https://hertzbeat.example.test"), Optional.empty(), Optional.empty())),
                Optional.empty(), Optional.empty());
        application = new ManagedApplicationConfig(
                application.metadataDatabase(), application.telemetryStore(), options);
        ApplicationConfigDocumentCodec codec = new ApplicationConfigDocumentCodec();
        ManagedDocumentCodec.Integrity.VerifiedBody encoded = ManagedDocumentCodec.Integrity.extract(
                codec.encode(application, "generation"));
        String invalid = encoded.content().replace(
                "hertzbeat.setup.public-base-url: 'https://hertzbeat.example.test'",
                "hertzbeat.setup.public-base-url: 'http://0.0.0.0:1157'");

        byte[] document = ManagedDocumentCodec.Integrity.envelope(invalid, encoded.generation());
        assertThatThrownBy(() -> codec.decode(document))
                .isInstanceOf(ManagedDocumentCodec.DocumentException.class);
    }

    private static ManagedConfigurationBundle required() {
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(MetadataDatabaseKind.H2, "jdbc:h2:./data/hertzbeat", "sa"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("localhost:4001", "http://localhost:4000"), "public"));
        return new ManagedConfigurationBundle(application,
                ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-secret")));
    }
}
