/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.springframework.http.HttpStatus;

/** Converts only known secret-free failures into the stable deployment HTTP contract. */
final class DeploymentWorkflowFailureMapper {

    RuntimeException translate(RuntimeException failure) {
        if (failure instanceof SetupApiException) {
            return failure;
        }
        SetupErrorCode code = stableCode(failure);
        return new SetupApiException(
                code == null ? SetupErrorCode.MIGRATION_UNAVAILABLE : code,
                status(code == null ? SetupErrorCode.MIGRATION_UNAVAILABLE : code));
    }

    private static SetupErrorCode stableCode(RuntimeException failure) {
        if (failure instanceof MigrationOperationStoreException storeFailure) {
            return storeFailure.errorCode();
        }
        if (failure instanceof DurableCutoverPreparationException preparationFailure) {
            return preparationFailure.errorCode();
        }
        if (failure instanceof RetainedCopyJournalHandoffException handoffFailure) {
            return handoffFailure.errorCode();
        }
        if (failure instanceof RetainedManagedActivationException activationFailure) {
            return activationFailure.errorCode();
        }
        if (failure instanceof TargetJdbcConnectionException connectionFailure) {
            return connectionCode(connectionFailure.code());
        }
        if (failure instanceof MigrationMaintenanceException maintenanceFailure) {
            return maintenanceCode(maintenanceFailure.code());
        }
        if (failure instanceof MetadataMigrationException migrationFailure) {
            return migrationCode(migrationFailure.code());
        }
        if (failure instanceof RetainedCutoverReleaseRequiredException
                || failure instanceof MetadataCopyReleaseRequiredException) {
            return SetupErrorCode.CONFIG_RECOVERY_REQUIRED;
        }
        if (failure instanceof RetainedCutoverException cutoverFailure) {
            return switch (cutoverFailure.code()) {
                case TARGET_IDENTITY_CHANGED -> SetupErrorCode.OPERATION_CONFLICT;
                case PREPARATION_RETRY_REQUIRED -> SetupErrorCode.CONFIG_RECOVERY_REQUIRED;
                case EXECUTION_FAILED -> SetupErrorCode.MIGRATION_UNAVAILABLE;
            };
        }
        return null;
    }

    private static SetupErrorCode migrationCode(MetadataMigrationErrorCode code) {
        return switch (code) {
            case SCHEMA, COPY -> SetupErrorCode.MIGRATION_COPY_FAILED;
            case VERIFICATION, SEQUENCE -> SetupErrorCode.MIGRATION_VERIFICATION_FAILED;
            case TIMEOUT -> SetupErrorCode.MIGRATION_UNAVAILABLE;
            case COMMIT_OUTCOME_UNKNOWN, ROLLBACK_OUTCOME_UNKNOWN ->
                    SetupErrorCode.CONFIG_RECOVERY_REQUIRED;
        };
    }

    private static SetupErrorCode connectionCode(TargetJdbcConnectionErrorCode code) {
        return switch (code) {
            case TARGET_MISMATCH -> SetupErrorCode.METADATA_SCHEMA_MISMATCH;
            case OPERATION_CONFLICT -> SetupErrorCode.OPERATION_CONFLICT;
            case TIMEOUT, UNAVAILABLE, FACTORY_CLOSED, CLEANUP_REQUIRED ->
                    SetupErrorCode.MIGRATION_UNAVAILABLE;
        };
    }

    private static SetupErrorCode maintenanceCode(MigrationMaintenanceErrorCode code) {
        return switch (code) {
            case INVALID_REQUEST -> SetupErrorCode.INVALID_REQUEST;
            case MIGRATION_MULTI_NODE_UNSUPPORTED -> SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED;
            case MIGRATION_OPERATION_CONFLICT -> SetupErrorCode.OPERATION_CONFLICT;
            case MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE,
                    MIGRATION_SOURCE_UNAVAILABLE,
                    MIGRATION_MAINTENANCE_TIMEOUT,
                    MIGRATION_MAINTENANCE_INTERRUPTED,
                    MIGRATION_MAINTENANCE_FAILURE,
                    MIGRATION_RESUME_FAILURE -> SetupErrorCode.MIGRATION_UNAVAILABLE;
        };
    }

    private static HttpStatus status(SetupErrorCode code) {
        return switch (code) {
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case OPERATION_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case OPERATION_CONFLICT,
                    MIGRATION_SOURCE_UNSUPPORTED,
                    MIGRATION_TARGET_NOT_EMPTY,
                    MIGRATION_MULTI_NODE_UNSUPPORTED,
                    METADATA_CONNECTION_FAILED,
                    METADATA_SCHEMA_MISMATCH,
                    MIGRATION_ACTIVATION_NOT_AVAILABLE,
                    MIGRATION_COPY_FAILED,
                    MIGRATION_VERIFICATION_FAILED,
                    MIGRATION_ACTIVATION_FAILED,
                    RESTART_FAILED -> HttpStatus.CONFLICT;
            default -> HttpStatus.SERVICE_UNAVAILABLE;
        };
    }
}
