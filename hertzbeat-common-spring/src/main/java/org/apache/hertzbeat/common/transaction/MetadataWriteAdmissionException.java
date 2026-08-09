/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

/** Safe admission failure that never exposes operation identifiers or persistence details. */
public final class MetadataWriteAdmissionException extends RuntimeException {

    private static final String MAINTENANCE_MESSAGE = "Metadata writes are temporarily unavailable";
    private static final String CONFLICT_MESSAGE = "Metadata maintenance operation is already active";
    private static final String TIMEOUT_MESSAGE = "Metadata write drain timed out";
    private static final String INTERRUPTED_MESSAGE = "Metadata write drain was interrupted";
    private static final String INVALID_MESSAGE = "Metadata maintenance request is invalid";

    private final MetadataWriteAdmissionErrorCode code;

    private MetadataWriteAdmissionException(MetadataWriteAdmissionErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    /** Return the stable machine-readable classification. */
    public MetadataWriteAdmissionErrorCode code() {
        return code;
    }

    /** Return the stable, secret-free message suitable for typed transport boundaries. */
    public String safeMessage() {
        return getMessage();
    }

    /** Create the stable rejection used by typed metadata-write callers and tests. */
    public static MetadataWriteAdmissionException metadataWritesPaused() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.MAINTENANCE_ACTIVE, MAINTENANCE_MESSAGE);
    }

    static MetadataWriteAdmissionException operationConflict() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.OPERATION_CONFLICT, CONFLICT_MESSAGE);
    }

    static MetadataWriteAdmissionException drainTimeout() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.DRAIN_TIMEOUT, TIMEOUT_MESSAGE);
    }

    static MetadataWriteAdmissionException acquisitionInterrupted() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.ACQUISITION_INTERRUPTED, INTERRUPTED_MESSAGE);
    }

    static MetadataWriteAdmissionException invalidRequest() {
        return new MetadataWriteAdmissionException(
                MetadataWriteAdmissionErrorCode.INVALID_REQUEST, INVALID_MESSAGE);
    }
}
