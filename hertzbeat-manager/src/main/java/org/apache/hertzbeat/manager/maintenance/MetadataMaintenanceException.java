/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Safe maintenance failure that never exposes participant work or persistence details. */
public final class MetadataMaintenanceException extends RuntimeException {

    private static final String INVALID_MESSAGE = "Metadata maintenance request is invalid";
    private static final String CONFLICT_MESSAGE = "Metadata maintenance operation is already active";
    private static final String TIMEOUT_MESSAGE = "Metadata producer drain timed out";
    private static final String INTERRUPTED_MESSAGE = "Metadata producer drain was interrupted";
    private static final String PARTICIPANT_MESSAGE = "Metadata producer could not be paused";
    private static final String RESUME_MESSAGE = "Metadata producer could not be resumed";
    private static final String STALE_MESSAGE = "Metadata maintenance lease is stale";

    private final MetadataMaintenanceErrorCode code;

    private MetadataMaintenanceException(MetadataMaintenanceErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public MetadataMaintenanceErrorCode code() {
        return code;
    }

    public String safeMessage() {
        return getMessage();
    }

    static MetadataMaintenanceException invalidRequest() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.INVALID_REQUEST, INVALID_MESSAGE);
    }

    static MetadataMaintenanceException operationConflict() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.OPERATION_CONFLICT, CONFLICT_MESSAGE);
    }

    public static MetadataMaintenanceException quiesceTimeout() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT, TIMEOUT_MESSAGE);
    }

    public static MetadataMaintenanceException quiesceInterrupted() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.QUIESCE_INTERRUPTED, INTERRUPTED_MESSAGE);
    }

    static MetadataMaintenanceException participantFailure() {
        return new MetadataMaintenanceException(
                MetadataMaintenanceErrorCode.PARTICIPANT_FAILURE, PARTICIPANT_MESSAGE);
    }

    static MetadataMaintenanceException resumeFailure() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.RESUME_FAILURE, RESUME_MESSAGE);
    }

    static MetadataMaintenanceException staleLease() {
        return new MetadataMaintenanceException(MetadataMaintenanceErrorCode.STALE_LEASE, STALE_MESSAGE);
    }
}
