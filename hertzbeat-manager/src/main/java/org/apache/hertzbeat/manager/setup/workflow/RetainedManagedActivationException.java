/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Stable, cause-free activation failure that leaves the exact maintenance fence retained. */
final class RetainedManagedActivationException extends RuntimeException {

    private final SetupErrorCode errorCode;

    RetainedManagedActivationException(SetupErrorCode errorCode) {
        super("Retained managed activation failed: "
                + Objects.requireNonNull(errorCode, "errorCode").value());
        this.errorCode = errorCode;
    }

    SetupErrorCode errorCode() {
        return errorCode;
    }
}
