/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;

/** Secret-free total projection of the process-local retained-cutover capability. */
record RetainedCutoverStatus(String operationId, Phase phase) {

    RetainedCutoverStatus {
        Objects.requireNonNull(phase, "phase");
        if (phase == Phase.NONE) {
            if (operationId != null) {
                throw new IllegalArgumentException("Empty retained status cannot own an operation");
            }
        } else if (!OperationIdValidator.isSafe(operationId)) {
            throw new IllegalArgumentException("Invalid retained operation identifier");
        }
    }

    static RetainedCutoverStatus empty() {
        return new RetainedCutoverStatus(null, Phase.NONE);
    }

    boolean owns(String requestedOperationId) {
        return operationId != null && operationId.equals(requestedOperationId);
    }

    enum Phase {
        NONE,
        EXECUTING,
        HANDOFFING,
        HANDOFF_PENDING,
        RETAINED,
        ACTIVATING,
        ACTIVATION_PENDING,
        AWAITING_RESTART_RETAINED,
        RELEASING,
        RELEASE_PENDING
    }
}
