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
                        Optional.of("https://hertzbeat.example/otlp"), Optional.of("hertzbeat.example:4317"))),
                Optional.of(new ManagedOptionalConfiguration.RetentionSettings(30, 14, 7)),
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
        assertThat(ApplicationConfigDocumentCodec.springProperties(application).toString())
                .doesNotContain("mail-secret");
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
