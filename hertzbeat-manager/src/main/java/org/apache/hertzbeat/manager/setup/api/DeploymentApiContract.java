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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
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

    private DeploymentApiContract() {
    }

    private interface WireValue {

        @JsonValue
        String value();
    }

    /** Supported external metadata migration target. */
    public enum MigrationTarget implements WireValue {
        MYSQL("mysql", MetadataDatabaseKind.MYSQL),
        POSTGRESQL("postgresql", MetadataDatabaseKind.POSTGRESQL);

        private final String value;
        private final MetadataDatabaseKind databaseKind;

        MigrationTarget(String value, MetadataDatabaseKind databaseKind) {
            this.value = value;
            this.databaseKind = databaseKind;
        }

        @Override
        public String value() {
            return value;
        }

        MetadataDatabaseKind databaseKind() {
            return databaseKind;
        }
    }

    /** Migration verification lifecycle. */
    public enum VerificationState implements WireValue {
        PENDING("pending"),
        RUNNING("running"),
        SUCCEEDED("succeeded"),
        FAILED("failed");

        private final String value;

        VerificationState(String value) {
            this.value = value;
        }

        @Override
        public String value() {
            return value;
        }
    }

    /** Secret-free authenticated deployment view. */
    public record DeploymentView(
            @NotNull Instant observedAt,
            @NotNull @Valid ManagementDatabaseSummary managementDatabase,
            @NotNull @Valid TelemetryStoreSummary telemetryStore,
            @NotNull ApplyMode applyMode,
            boolean maintenanceMode,
            boolean migrationAllowed) {
    }

    /** H2-to-external-database migration input. */
    public record MetadataMigrationRequest(
            @NotNull MigrationTarget target,
            @NotNull @Valid MetadataDatabaseConfiguration targetDatabase,
            @NotNull ApplyMode applyMode) {

        public MetadataMigrationRequest {
            if (target == null || targetDatabase == null || target.databaseKind() != targetDatabase.kind()) {
                throw new IllegalArgumentException("Migration target and target database kind must match");
            }
        }
    }

    /** Safe migration operation view; table identities and verification details are intentionally absent. */
    public record MigrationView(
            @NotBlank String operationId,
            @NotNull SetupOperationState state,
            @NotNull MetadataDatabaseKind source,
            @NotNull MigrationTarget target,
            @NotNull SetupPhase phase,
            @NotNull Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            @PositiveOrZero long tablesTotal,
            @PositiveOrZero long tablesCopied,
            @NotNull VerificationState verificationState,
            SetupErrorCode errorCode,
            boolean activationAvailable,
            boolean externalApplyRequired) {

        public MigrationView {
            if (source != MetadataDatabaseKind.H2) {
                throw new IllegalArgumentException("Migration source must be H2");
            }
            if (phase != SetupPhase.MIGRATION_IN_PROGRESS) {
                throw new IllegalArgumentException("Migration view must report migration in progress");
            }
            if (tablesTotal < 0 || tablesCopied < 0 || tablesCopied > tablesTotal) {
                throw new IllegalArgumentException("Migration table counts are inconsistent");
            }
        }
    }

    /** Explicit migration activation input. */
    public record ActivateMigrationRequest(
            @NotNull SetupOperationState expectedState) {
    }
}
