/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Secret-free migration maintenance failure. */
public final class MigrationMaintenanceException extends RuntimeException {

    private final MigrationMaintenanceErrorCode code;

    private MigrationMaintenanceException(MigrationMaintenanceErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public MigrationMaintenanceErrorCode code() {
        return code;
    }

    public String safeMessage() {
        return getMessage();
    }

    public static MigrationMaintenanceException deploymentAuthorityUnavailable() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE,
                "Migration deployment authority is unavailable");
    }

    public static MigrationMaintenanceException sourceUnavailable() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE,
                "Migration metadata source is unavailable");
    }

    public static MigrationMaintenanceException multiNodeUnsupported() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
                "Multi-node metadata migration is unsupported");
    }

    public static MigrationMaintenanceException operationConflict() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT,
                "Migration maintenance operation is already active");
    }

    static MigrationMaintenanceException timeout() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_TIMEOUT,
                "Migration maintenance acquisition timed out");
    }

    static MigrationMaintenanceException interrupted() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_INTERRUPTED,
                "Migration maintenance acquisition was interrupted");
    }

    public static MigrationMaintenanceException maintenanceFailure() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_FAILURE,
                "Migration maintenance acquisition failed");
    }

    static MigrationMaintenanceException resumeFailure() {
        return failure(MigrationMaintenanceErrorCode.MIGRATION_RESUME_FAILURE,
                "Migration maintenance release failed");
    }

    public static MigrationMaintenanceException invalidRequest() {
        return failure(MigrationMaintenanceErrorCode.INVALID_REQUEST,
                "Migration maintenance request is invalid");
    }

    private static MigrationMaintenanceException failure(
            MigrationMaintenanceErrorCode code, String message) {
        return new MigrationMaintenanceException(code, message);
    }
}
