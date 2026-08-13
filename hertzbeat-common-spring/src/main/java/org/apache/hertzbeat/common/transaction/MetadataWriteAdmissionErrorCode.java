/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

/** Stable, secret-free failure classifications for metadata write admission. */
public enum MetadataWriteAdmissionErrorCode {
    MAINTENANCE_ACTIVE("metadata_writes_paused"),
    OPERATION_CONFLICT("operation_conflict"),
    DRAIN_TIMEOUT("drain_timeout"),
    ACQUISITION_INTERRUPTED("acquisition_interrupted"),
    INVALID_REQUEST("invalid_request");

    private final String wireCode;

    MetadataWriteAdmissionErrorCode(String wireCode) {
        this.wireCode = wireCode;
    }

    /** Return the stable, safe code exposed at typed transport boundaries. */
    public String wireCode() {
        return wireCode;
    }
}
