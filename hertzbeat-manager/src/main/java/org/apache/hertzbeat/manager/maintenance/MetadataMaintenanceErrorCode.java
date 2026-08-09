/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Stable, secret-free control-plane maintenance failure classifications. */
public enum MetadataMaintenanceErrorCode {
    INVALID_REQUEST("invalid_request"),
    OPERATION_CONFLICT("operation_conflict"),
    QUIESCE_TIMEOUT("quiesce_timeout"),
    QUIESCE_INTERRUPTED("quiesce_interrupted"),
    PARTICIPANT_FAILURE("participant_failure"),
    RESUME_FAILURE("resume_failure"),
    STALE_LEASE("stale_lease");

    private final String wireCode;

    MetadataMaintenanceErrorCode(String wireCode) {
        this.wireCode = wireCode;
    }

    public String wireCode() {
        return wireCode;
    }
}
