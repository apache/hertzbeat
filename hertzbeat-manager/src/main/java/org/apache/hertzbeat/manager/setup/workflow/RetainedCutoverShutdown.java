/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Duration;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;

/** Advances only exact retryable cleanup phases during coordinator shutdown. */
final class RetainedCutoverShutdown {

    private static final Duration CLEANUP_TIMEOUT = Duration.ofSeconds(30);

    private RetainedCutoverShutdown() { }

    static void run(RetainedCutoverCoordinator coordinator, String operationId) {
        while (true) {
            RetainedCutoverStatus status = coordinator.status();
            if (status.phase() == RetainedCutoverStatus.Phase.NONE) {
                return;
            }
            if (!status.owns(operationId)) {
                throw MigrationMaintenanceException.operationConflict();
            }
            if (status.phase() == RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED) {
                return;
            }
            switch (status.phase()) {
                case HANDOFF_PENDING -> coordinator.retryHandoff(operationId);
                case RETAINED -> coordinator.releaseRetained(operationId);
                case ACTIVATION_PENDING -> coordinator.retryActivation(operationId);
                case RELEASE_PENDING -> coordinator.retryRelease(operationId, CLEANUP_TIMEOUT);
                default -> throw MigrationMaintenanceException.operationConflict();
            }
        }
    }
}
