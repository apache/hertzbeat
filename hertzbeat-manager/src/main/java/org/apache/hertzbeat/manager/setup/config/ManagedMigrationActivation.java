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

/** Reconciles one exact migration candidate without owning snapshot classification or file I/O. */
final class ManagedMigrationActivation {

    private static final int MAXIMUM_RECONCILIATION_STEPS = 16;

    private final MigrationActivationClassifier classifier = new MigrationActivationClassifier();
    private final MigrationActivationStepExecutor executor;

    ManagedMigrationActivation(FileManagedApplicationConfigStore applications,
                               FileManagedSecretStore secrets) {
        executor = new MigrationActivationStepExecutor(applications, secrets);
    }

    ManagedMigrationConfigurationTransaction.ActivationOutcome activate(MigrationCandidateMaterial material) {
        MigrationActivationCandidate candidate = MigrationActivationCandidate.from(material);
        boolean changed = false;
        for (int step = 0; step < MAXIMUM_RECONCILIATION_STEPS; step++) {
            try (MigrationActivationSnapshots snapshots = executor.readSnapshots()) {
                MigrationActivationClassifier.Decision decision = classifier.activation(candidate, snapshots);
                if (decision == MigrationActivationClassifier.Decision.COMPLETE) {
                    executor.confirmDurability();
                    return changed ? ManagedMigrationConfigurationTransaction.ActivationOutcome.ACTIVATED
                            : ManagedMigrationConfigurationTransaction.ActivationOutcome.ALREADY_ACTIVE;
                }
                if (decision == MigrationActivationClassifier.Decision.STALE) {
                    return ManagedMigrationConfigurationTransaction.ActivationOutcome.STALE;
                }
                if (decision == MigrationActivationClassifier.Decision.RECOVERY_REQUIRED) {
                    return ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED;
                }
                changed = true;
                executor.activate(decision, candidate);
            } catch (IOException ignored) {
                return ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED;
            }
        }
        return ManagedMigrationConfigurationTransaction.ActivationOutcome.RECOVERY_REQUIRED;
    }

    ManagedMigrationConfigurationTransaction.RollbackOutcome rollback(MigrationCandidateMaterial material) {
        MigrationActivationCandidate candidate = MigrationActivationCandidate.from(material);
        boolean changed = false;
        for (int step = 0; step < MAXIMUM_RECONCILIATION_STEPS; step++) {
            try (MigrationActivationSnapshots snapshots = executor.readSnapshots()) {
                MigrationActivationClassifier.Decision decision = classifier.rollback(candidate, snapshots);
                if (decision == MigrationActivationClassifier.Decision.COMPLETE) {
                    executor.confirmDurability();
                    return changed ? ManagedMigrationConfigurationTransaction.RollbackOutcome.ROLLED_BACK
                            : ManagedMigrationConfigurationTransaction.RollbackOutcome.ALREADY_ROLLED_BACK;
                }
                if (decision == MigrationActivationClassifier.Decision.STALE) {
                    return ManagedMigrationConfigurationTransaction.RollbackOutcome.STALE;
                }
                if (decision == MigrationActivationClassifier.Decision.RECOVERY_REQUIRED) {
                    return ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED;
                }
                changed = true;
                executor.rollback(decision, candidate);
            } catch (IOException ignored) {
                return ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED;
            }
        }
        return ManagedMigrationConfigurationTransaction.RollbackOutcome.RECOVERY_REQUIRED;
    }
}
