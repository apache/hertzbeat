/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Cause-free startup migration failure that keeps the business runtime gated. */
final class MigrationStartupReconciliationException extends RuntimeException {

    private final SetupErrorCode errorCode;

    MigrationStartupReconciliationException(SetupErrorCode errorCode) {
        super("Metadata migration startup reconciliation requires recovery");
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode");
    }

    SetupErrorCode errorCode() {
        return errorCode;
    }
}
