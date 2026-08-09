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

package org.apache.hertzbeat.manager.setup.api;

import java.time.Instant;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Cross-field invariants for secret-free deployment and migration projections. */
final class MigrationContractValidator {

    private static final Set<SetupErrorCode> OPERATION_ERRORS = Set.of(
            SetupErrorCode.MIGRATION_COPY_FAILED,
            SetupErrorCode.MIGRATION_VERIFICATION_FAILED,
            SetupErrorCode.MIGRATION_ACTIVATION_FAILED,
            SetupErrorCode.RESTART_FAILED);
    private static final Set<SetupErrorCode> CAPABILITY_BLOCKERS = Set.of(
            SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED,
            SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
            SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE,
            SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED,
            SetupErrorCode.MIGRATION_UNAVAILABLE,
            SetupErrorCode.OPERATION_CONFLICT);

    private MigrationContractValidator() {
    }

    static void validateCapability(
            boolean allowed, SetupErrorCode blockedBy,
            MaintenanceAdmission admission, String activeOperationId) {
        if (allowed != (blockedBy == null)
                || admission == null
                || blockedBy != null && !CAPABILITY_BLOCKERS.contains(blockedBy)) {
            invalid("Migration capability and blocker are inconsistent");
        }
        boolean validAdmission = switch (admission) {
            case USE_CURRENT, AUTO_ENTER -> allowed && activeOperationId == null;
            case NOT_APPLICABLE -> !allowed && structuralBlocker(blockedBy) && activeOperationId == null;
            case UNAVAILABLE -> unavailable(blockedBy, activeOperationId);
        };
        if (!validAdmission) {
            invalid("Migration maintenance admission is inconsistent");
        }
    }

    static void validateTarget(MigrationTarget target, MetadataDatabaseConfiguration database) {
        if (target == null || database == null || target.databaseKind() != database.kind()) {
            invalid("Migration target and target database kind must match");
        }
    }

    static void validateDeployment(
            ManagementDatabaseSummary database, MaintenanceMode maintenance,
            DeploymentTopology topology, MigrationCapability capability) {
        if (database == null || maintenance == null || topology == null || capability == null) {
            invalid("Deployment migration context is incomplete");
        }
        if (database.kind() != MetadataDatabaseKind.H2) {
            requireBlocker(capability, SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED,
                    MaintenanceAdmission.NOT_APPLICABLE);
        } else if (topology == DeploymentTopology.MULTI_NODE) {
            requireBlocker(capability, SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
                    MaintenanceAdmission.NOT_APPLICABLE);
        } else if (topology == DeploymentTopology.UNKNOWN) {
            requireBlocker(capability, SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE,
                    MaintenanceAdmission.NOT_APPLICABLE);
        } else {
            validateSingleNodeAdmission(maintenance, capability);
        }
    }

    static void validateMigration(
            String operationId, MetadataDatabaseKind source, MigrationTarget target,
            MigrationOperationState state, MigrationStage stage,
            int progress, Instant createdAt, Instant startedAt, Instant completedAt,
            VerificationState verification, SetupErrorCode errorCode, long pollAfterMillis,
            boolean activationAvailable, boolean restartRequired, boolean externalApplyRequired) {
        if (!OperationIdValidator.isSafe(operationId) || source != MetadataDatabaseKind.H2 || target == null
                || state == null || stage == null
                || createdAt == null || verification == null || progress < 0 || progress > 100
                || pollAfterMillis < 0) {
            invalid("Migration projection is incomplete or out of range");
        }
        validateTimes(state, createdAt, startedAt, completedAt);
        validateState(state, stage, progress, verification, errorCode, pollAfterMillis);
        validateOutcome(state, errorCode, activationAvailable, restartRequired, externalApplyRequired);
    }

    private static void validateTimes(
            MigrationOperationState state, Instant createdAt, Instant startedAt, Instant completedAt) {
        boolean pending = state == MigrationOperationState.PENDING;
        boolean terminal = terminal(state);
        if (pending != (startedAt == null) || terminal != (completedAt != null)) {
            invalid("Migration timestamps do not match lifecycle state");
        }
        if (startedAt != null && startedAt.isBefore(createdAt)
                || completedAt != null && completedAt.isBefore(startedAt)) {
            invalid("Migration timestamps are out of order");
        }
    }

    private static void validateState(
            MigrationOperationState state, MigrationStage stage, int progress,
            VerificationState verification, SetupErrorCode errorCode, long pollAfterMillis) {
        boolean valid = switch (state) {
            case PENDING -> stage == MigrationStage.QUEUED && progress == 0
                    && verification == VerificationState.PENDING && pollAfterMillis > 0;
            case RUNNING -> running(stage, progress, verification) && pollAfterMillis > 0;
            case READY_TO_ACTIVATE -> stage == MigrationStage.READY_TO_ACTIVATE && progress == 100
                    && verification == VerificationState.SUCCEEDED && pollAfterMillis == 0;
            case AWAITING_EXTERNAL_APPLY -> stage == MigrationStage.AWAITING_EXTERNAL_APPLY && progress == 100
                    && verification == VerificationState.SUCCEEDED && pollAfterMillis == 0;
            case AWAITING_RESTART -> stage == MigrationStage.AWAITING_RESTART && progress == 100
                    && verification == VerificationState.SUCCEEDED && pollAfterMillis > 0;
            case SUCCEEDED -> stage == MigrationStage.COMPLETED && progress == 100
                    && verification == VerificationState.SUCCEEDED && pollAfterMillis == 0;
            case FAILED -> stage == MigrationStage.FAILED && failureMatches(errorCode, verification, progress)
                    && pollAfterMillis == 0;
            case ROLLED_BACK -> stage == MigrationStage.ROLLED_BACK
                    && failureMatches(errorCode, verification, progress)
                    && pollAfterMillis == 0;
        };
        if (!valid) {
            invalid("Migration state, stage, progress, verification, or polling is inconsistent");
        }
    }

    private static boolean failureMatches(
            SetupErrorCode errorCode, VerificationState verification, int progress) {
        if (errorCode == null) {
            return false;
        }
        return switch (errorCode) {
            case MIGRATION_COPY_FAILED -> verification == VerificationState.PENDING && progress < 100;
            case MIGRATION_VERIFICATION_FAILED -> verification == VerificationState.FAILED && progress == 100;
            case MIGRATION_ACTIVATION_FAILED, RESTART_FAILED ->
                    verification == VerificationState.SUCCEEDED && progress == 100;
            default -> false;
        };
    }

    private static boolean running(MigrationStage stage, int progress, VerificationState verification) {
        return switch (stage) {
            case COPYING -> progress < 100 && verification == VerificationState.PENDING;
            case VERIFYING -> progress == 100 && verification == VerificationState.RUNNING;
            case ACTIVATING -> progress == 100 && verification == VerificationState.SUCCEEDED;
            case ROLLING_BACK -> verification == VerificationState.SUCCEEDED
                    || verification == VerificationState.FAILED;
            default -> false;
        };
    }

    private static void validateOutcome(
            MigrationOperationState state, SetupErrorCode errorCode,
            boolean activationAvailable, boolean restartRequired, boolean externalApplyRequired) {
        boolean failure = state == MigrationOperationState.FAILED || state == MigrationOperationState.ROLLED_BACK;
        boolean activatable = state == MigrationOperationState.READY_TO_ACTIVATE;
        if (failure != (errorCode != null) || errorCode != null && !OPERATION_ERRORS.contains(errorCode)
                || activationAvailable != activatable
                || restartRequired != (state == MigrationOperationState.AWAITING_RESTART)
                || externalApplyRequired != (state == MigrationOperationState.AWAITING_EXTERNAL_APPLY)) {
            invalid("Migration outcome and transition flags are inconsistent");
        }
    }

    private static boolean terminal(MigrationOperationState state) {
        return state == MigrationOperationState.SUCCEEDED
                || state == MigrationOperationState.FAILED
                || state == MigrationOperationState.ROLLED_BACK;
    }

    private static void validateSingleNodeAdmission(
            MaintenanceMode maintenance, MigrationCapability capability) {
        if (capability.allowed()) {
            MaintenanceAdmission expected = maintenance == MaintenanceMode.ACTIVE
                    ? MaintenanceAdmission.USE_CURRENT : MaintenanceAdmission.AUTO_ENTER;
            if (capability.maintenanceAdmission() != expected) {
                invalid("Migration admission does not match maintenance state");
            }
            return;
        }
        if (structuralBlocker(capability.blockedBy())) {
            invalid("Single-node migration cannot report a structural blocker");
        }
        if (capability.blockedBy() == SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED
                && maintenance != MaintenanceMode.INACTIVE) {
            invalid("Maintenance-required blocker is stale");
        }
    }

    private static boolean structuralBlocker(SetupErrorCode blocker) {
        return blocker == SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED
                || blocker == SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED
                || blocker == SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE;
    }

    private static boolean unavailable(SetupErrorCode blocker, String activeOperationId) {
        if (blocker == SetupErrorCode.OPERATION_CONFLICT) {
            return OperationIdValidator.isSafe(activeOperationId);
        }
        return (blocker == SetupErrorCode.MIGRATION_UNAVAILABLE
                || blocker == SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED)
                && activeOperationId == null;
    }

    private static void requireBlocker(
            MigrationCapability capability, SetupErrorCode expected, MaintenanceAdmission admission) {
        if (capability.allowed() || capability.blockedBy() != expected
                || capability.maintenanceAdmission() != admission || capability.activeOperationId() != null) {
            invalid("Deployment migration blocker does not match its structure");
        }
    }

    private static void invalid(String message) {
        throw new IllegalArgumentException(message);
    }
}
