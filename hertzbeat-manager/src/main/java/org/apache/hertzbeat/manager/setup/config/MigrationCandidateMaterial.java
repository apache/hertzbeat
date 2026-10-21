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

/** Closeable decoded material kept internal to one synchronous candidate operation. */
record MigrationCandidateMaterial(
        ManagedMigrationConfigurationTransaction.Inspection inspection,
        Optional<MigrationCandidateManifest> manifest,
        Optional<ManagedApplicationConfig> application,
        Optional<ManagedSecrets> secrets) implements AutoCloseable {

    static MigrationCandidateMaterial missing() {
        return empty(ManagedMigrationConfigurationTransaction.CandidateState.MISSING);
    }

    static MigrationCandidateMaterial recoveryRequired() {
        return empty(ManagedMigrationConfigurationTransaction.CandidateState.RECOVERY_REQUIRED);
    }

    static MigrationCandidateMaterial ready(MigrationCandidateManifest manifest,
                                            ManagedApplicationConfig application, ManagedSecrets secrets) {
        return new MigrationCandidateMaterial(new ManagedMigrationConfigurationTransaction.Inspection(
                ManagedMigrationConfigurationTransaction.CandidateState.READY,
                Optional.of(manifest.baseGeneration()), Optional.of(manifest.targetIdentityHash())),
                Optional.of(manifest), Optional.of(application), Optional.of(secrets));
    }

    private static MigrationCandidateMaterial empty(
            ManagedMigrationConfigurationTransaction.CandidateState state) {
        return new MigrationCandidateMaterial(new ManagedMigrationConfigurationTransaction.Inspection(
                state, Optional.empty(), Optional.empty()), Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public void close() {
        secrets.ifPresent(ManagedSecrets::close);
    }
}
