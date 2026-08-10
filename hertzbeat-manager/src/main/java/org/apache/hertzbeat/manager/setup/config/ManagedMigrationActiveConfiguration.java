/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateReader;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;

/** Proves that the active aggregate is the complete configuration named by one candidate. */
final class ManagedMigrationActiveConfiguration {

    private final ManagedApplicationConfigStore applications;
    private final ManagedSecretStore secrets;
    private final MigrationCandidateStore candidates;

    ManagedMigrationActiveConfiguration(
            ManagedApplicationConfigStore applications,
            ManagedSecretStore secrets,
            MigrationCandidateStore candidates) {
        this.applications = Objects.requireNonNull(applications, "applications");
        this.secrets = Objects.requireNonNull(secrets, "secrets");
        this.candidates = Objects.requireNonNull(candidates, "candidates");
    }

    <T> T readExact(
            CandidateRef reference, String targetIdentityHash, CandidateReader<T> reader) throws IOException {
        ActiveRead<T> result = candidates.readExact(reference, targetIdentityHash,
                candidate -> readActive(reference, candidate, reader));
        if (!result.exact()) {
            throw new IOException("Active managed migration configuration requires recovery");
        }
        return result.value();
    }

    private <T> ActiveRead<T> readActive(
            CandidateRef reference, ManagedConfigurationBundle candidate, CandidateReader<T> reader) {
        CandidateRead<ManagedApplicationConfig> activeApplication = applications.readActive();
        CandidateRead<ManagedSecrets> activeSecrets = secrets.readActive();
        try {
            if (!ManagedConfigurationTransaction.validPair(activeApplication, activeSecrets)
                    || activeApplication.generation()
                            .filter(reference.candidateGeneration()::equals).isEmpty()) {
                return ActiveRead.mismatch();
            }
            ManagedConfigurationBundle active;
            try {
                active = new ManagedConfigurationBundle(
                        activeApplication.value().orElseThrow(), activeSecrets.value().orElseThrow());
            } catch (IllegalArgumentException failure) {
                return ActiveRead.mismatch();
            }
            if (!active.application().equals(candidate.application())
                    || !active.secrets().equals(candidate.secrets())) {
                return ActiveRead.mismatch();
            }
            return ActiveRead.exact(reader.read(active));
        } finally {
            ManagedConfigurationTransaction.close(activeSecrets);
        }
    }

    private record ActiveRead<T>(boolean exact, T value) {

        static <T> ActiveRead<T> exact(T value) {
            return new ActiveRead<>(true, value);
        }

        static <T> ActiveRead<T> mismatch() {
            return new ActiveRead<>(false, null);
        }
    }
}
