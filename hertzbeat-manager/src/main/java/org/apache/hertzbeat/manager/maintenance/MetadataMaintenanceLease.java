/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Epoch-bound capability that resumes metadata producers exactly once. */
public final class MetadataMaintenanceLease implements AutoCloseable {

    private final MetadataMaintenanceCoordinator coordinator;
    private final String operationId;
    private final long epoch;
    private final Object token;
    private boolean resumed;

    MetadataMaintenanceLease(
            MetadataMaintenanceCoordinator coordinator, String operationId, long epoch, Object token) {
        this.coordinator = coordinator;
        this.operationId = operationId;
        this.epoch = epoch;
        this.token = token;
    }

    public synchronized void resume() {
        if (resumed) {
            return;
        }
        coordinator.resume(operationId, epoch, token);
        resumed = true;
    }

    @Override
    public void close() {
        resume();
    }
}
