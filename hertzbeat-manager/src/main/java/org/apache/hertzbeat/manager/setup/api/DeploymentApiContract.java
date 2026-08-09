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

import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;
import java.util.Locale;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportFormat;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;

/** Authenticated deployment configuration and H2 migration contract. */
public final class DeploymentApiContract {

    public static final String DEPLOYMENT_PATH = "/api/config/deployment";
    public static final String VALIDATE_PATH = "/api/config/deployment/validate";
    public static final String MIGRATION_PATH = "/api/config/deployment/metadata-migrations";
    public static final String MIGRATION_OPERATION_PATH =
            "/api/config/deployment/metadata-migrations/{operationId}";
    public static final String ACTIVATE_PATH =
            "/api/config/deployment/metadata-migrations/{operationId}/activate";
    public static final String EXPORT_PATH =
            "/api/config/deployment/metadata-migrations/{operationId}/export";

    private DeploymentApiContract() {
    }

    private interface WireValue {

        @JsonValue
        default String value() {
            return ((Enum<?>) this).name().toLowerCase(Locale.ROOT);
        }
    }

    /** Whether maintenance mode currently protects migration writes. */
    public enum MaintenanceMode implements WireValue {
        INACTIVE,
        ACTIVE
    }

    /** How a future migration coordinator can satisfy the maintenance precondition. */
    public enum MaintenanceAdmission implements WireValue {
        USE_CURRENT,
        AUTO_ENTER,
        UNAVAILABLE,
        NOT_APPLICABLE
    }

    /** Deployment shape relevant to migration safety. */
    public enum DeploymentTopology implements WireValue {
        SINGLE_NODE,
        MULTI_NODE,
        UNKNOWN
    }

    /** Target schema inspection result supplied by a database-specific adapter. */
    public enum TargetInspection implements WireValue {
        EMPTY,
        NON_EMPTY,
        UNKNOWN
    }

    /** Migration-specific lifecycle; ready-to-activate is deliberately non-terminal. */
    public enum MigrationOperationState implements WireValue {
        PENDING,
        RUNNING,
        READY_TO_ACTIVATE,
        AWAITING_EXTERNAL_APPLY,
        AWAITING_RESTART,
        SUCCEEDED,
        FAILED,
        ROLLED_BACK
    }

    /** Supported external metadata migration target. */
    public enum MigrationTarget implements WireValue {
        MYSQL(MetadataDatabaseKind.MYSQL),
        POSTGRESQL(MetadataDatabaseKind.POSTGRESQL);

        private final MetadataDatabaseKind databaseKind;

        MigrationTarget(MetadataDatabaseKind databaseKind) {
            this.databaseKind = databaseKind;
        }

        MetadataDatabaseKind databaseKind() {
            return databaseKind;
        }
    }

    /** Operator-visible stage without table names, SQL, or verification evidence. */
    public enum MigrationStage implements WireValue {
        QUEUED,
        COPYING,
        VERIFYING,
        READY_TO_ACTIVATE,
        AWAITING_EXTERNAL_APPLY,
        ACTIVATING,
        AWAITING_RESTART,
        COMPLETED,
        ROLLING_BACK,
        ROLLED_BACK,
        FAILED
    }

    /** Migration verification lifecycle. */
    public enum VerificationState implements WireValue {
        PENDING,
        RUNNING,
        SUCCEEDED,
        FAILED
    }

    /** Explicit migration eligibility and safe blocker for the deployment screen. */
    public record MigrationCapability(
            boolean allowed,
            SetupErrorCode blockedBy,
            @NotNull MaintenanceAdmission maintenanceAdmission,
            String activeOperationId) {

        public MigrationCapability {
            MigrationContractValidator.validateCapability(
                    allowed, blockedBy, maintenanceAdmission, activeOperationId);
        }

        public static MigrationCapability permitted(MaintenanceAdmission admission) {
            return new MigrationCapability(true, null, admission, null);
        }

        public static MigrationCapability blocked(SetupErrorCode blocker, MaintenanceAdmission admission) {
            return blocked(blocker, admission, null);
        }

        public static MigrationCapability blocked(
                SetupErrorCode blocker, MaintenanceAdmission admission, String activeOperationId) {
            return new MigrationCapability(false, blocker, admission, activeOperationId);
        }
    }

    /** Secret-free authenticated deployment view. */
    public record DeploymentView(
            @NotNull Instant observedAt,
            @NotNull @Valid ManagementDatabaseSummary managementDatabase,
            @NotNull @Valid TelemetryStoreSummary greptimeDatabase,
            @NotNull ApplyMode applyMode,
            @NotNull MaintenanceMode maintenanceMode,
            @NotNull DeploymentTopology topology,
            @NotNull @Valid MigrationCapability migration) {

        public DeploymentView {
            MigrationContractValidator.validateDeployment(
                    managementDatabase, maintenanceMode, topology, migration);
        }
    }

    /** External target validation input, separate from first-install setup validation. */
    public record MetadataMigrationValidationRequest(
            @NotNull MigrationTarget target,
            @NotNull @Valid MetadataDatabaseConfiguration targetDatabase) {

        public MetadataMigrationValidationRequest {
            MigrationContractValidator.validateTarget(target, targetDatabase);
        }

        @Override
        public String toString() {
            return "MetadataMigrationValidationRequest[target=" + target + ", targetDatabase=<redacted>]";
        }
    }

    /** H2-to-external-database migration input. */
    public record MetadataMigrationRequest(
            @NotNull MigrationTarget target,
            @NotNull @Valid MetadataDatabaseConfiguration targetDatabase,
            @NotNull ApplyMode applyMode) {

        public MetadataMigrationRequest {
            MigrationContractValidator.validateTarget(target, targetDatabase);
        }

        @Override
        public String toString() {
            return "MetadataMigrationRequest[target=" + target + ", targetDatabase=<redacted>, applyMode="
                    + applyMode + "]";
        }
    }

    /** One-shot external-apply export input; target credentials are never retained by the operation. */
    public record MigrationExportRequest(
            @NotNull ExportFormat format,
            @NotNull MigrationOperationState expectedState,
            @NotNull @Valid MetadataDatabaseConfiguration targetDatabase) {

        public MigrationExportRequest {
            if (expectedState != MigrationOperationState.AWAITING_EXTERNAL_APPLY
                    || targetDatabase == null || targetDatabase.kind() == MetadataDatabaseKind.H2) {
                throw new IllegalArgumentException("Migration export requires an external target awaiting apply");
            }
        }

        @Override
        public String toString() {
            return "MigrationExportRequest[format=" + format + ", expectedState=" + expectedState
                    + ", targetDatabase=<redacted>]";
        }
    }

    /** Safe migration operation view; table identities and verification details are intentionally absent. */
    public record MigrationView(
            @NotBlank String operationId,
            @NotNull MigrationOperationState state,
            @NotNull MetadataDatabaseKind source,
            @NotNull MigrationTarget target,
            @NotNull MigrationStage stage,
            @Min(0) @Max(100) int progressPercent,
            @NotNull Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            @NotNull VerificationState verificationState,
            SetupErrorCode errorCode,
            @PositiveOrZero long nextPollAfterMillis,
            boolean activationAvailable,
            boolean restartRequired,
            boolean externalApplyRequired) {

        public MigrationView {
            MigrationContractValidator.validateMigration(operationId, source, target, state, stage, progressPercent,
                    createdAt, startedAt, completedAt, verificationState, errorCode, nextPollAfterMillis,
                    activationAvailable, restartRequired, externalApplyRequired);
        }
    }

    /** Explicit migration activation input. */
    public record ActivateMigrationRequest(
            @NotNull MigrationOperationState expectedState) {
    }

}
