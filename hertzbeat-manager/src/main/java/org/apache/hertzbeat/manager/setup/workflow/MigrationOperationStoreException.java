/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/**
 * Stable store failure whose own message never retains provider messages, paths, or operation payloads.
 * An optional cause may be attached for diagnostics without changing the stable public message.
 */
public final class MigrationOperationStoreException extends RuntimeException {

    private final SetupErrorCode errorCode;

    MigrationOperationStoreException(SetupErrorCode errorCode) {
        this(errorCode, null);
    }

    MigrationOperationStoreException(SetupErrorCode errorCode, Throwable cause) {
        super("Migration operation store failed: " + Objects.requireNonNull(errorCode, "errorCode").value(),
                cause);
        this.errorCode = errorCode;
    }

    public SetupErrorCode errorCode() {
        return errorCode;
    }
}
