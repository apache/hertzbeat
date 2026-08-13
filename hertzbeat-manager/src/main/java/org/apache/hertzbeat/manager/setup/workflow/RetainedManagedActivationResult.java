/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;

/** Secret-free result while restart ownership remains behind the retained fence. */
record RetainedManagedActivationResult(String operationId, String targetIdentityHash, Status status) {

    RetainedManagedActivationResult {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw new IllegalArgumentException("Invalid operation id");
        }
        if (targetIdentityHash == null || !targetIdentityHash.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Invalid target identity");
        }
        Objects.requireNonNull(status, "status");
    }

    enum Status {
        ACTIVATED,
        ALREADY_AWAITING_RESTART
    }
}
