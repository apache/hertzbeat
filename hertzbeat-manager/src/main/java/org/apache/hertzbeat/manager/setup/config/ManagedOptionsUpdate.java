/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
