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

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

/** Rebuilds the managed two-file aggregate for an optional-settings update. */
final class ManagedOptionsUpdate {
    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;

    ManagedOptionsUpdate(ManagedApplicationConfigStore applicationStore, ManagedSecretStore secretStore) {
        this.applicationStore = applicationStore;
        this.secretStore = secretStore;
    }

    ManagedConfigurationTransaction.Outcome apply(ManagedOptionalConfiguration options,
                                                   Optional<SecretValue> mailPassword,
                                                   ManagedConfigurationTransaction.Publisher publisher)
            throws IOException {
        CandidateRead<ManagedApplicationConfig> application = applicationStore.readActive();
        CandidateRead<ManagedSecrets> secrets = secretStore.readActive();
        if (!ManagedConfigurationTransaction.validPair(application, secrets)) {
            ManagedConfigurationTransaction.close(secrets);
            return ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED;
        }
        ManagedApplicationConfig currentApplication = application.value().orElseThrow();
        ManagedSecrets currentSecrets = secrets.value().orElseThrow();
        try {
            ManagedSecrets updatedSecrets = copyWithMailPassword(currentSecrets, mailPassword);
            try {
                return publisher.publish(new ManagedConfigurationBundle(
                        new ManagedApplicationConfig(currentApplication.metadataDatabase(),
                                currentApplication.telemetryStore(), options), updatedSecrets));
            } finally {
                updatedSecrets.close();
            }
        } finally {
            currentSecrets.close();
        }
    }

    private static ManagedSecrets copyWithMailPassword(
            ManagedSecrets current, Optional<SecretValue> mailPassword) {
        return new ManagedSecrets(copy(current.metadataDatabasePassword()),
                current.telemetryPassword().map(ManagedOptionsUpdate::copy),
                mailPassword.map(ManagedOptionsUpdate::copy));
    }

    private static SecretValue copy(SecretValue secret) {
        char[] clear = secret.copy();
        try {
            return SecretValue.of(clear);
        } finally {
            Arrays.fill(clear, '\0');
        }
    }
}
