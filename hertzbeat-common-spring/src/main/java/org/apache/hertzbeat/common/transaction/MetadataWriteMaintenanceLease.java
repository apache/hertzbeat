/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import java.util.concurrent.atomic.AtomicBoolean;

/** Capability that returns metadata write admission to OPEN when its matching epoch is released. */
public final class MetadataWriteMaintenanceLease implements AutoCloseable {

    private final MetadataWriteAdmissionCoordinator coordinator;
    private final String operationId;
    private final long epoch;
    private final Object token;
    private final AtomicBoolean closed = new AtomicBoolean();

    MetadataWriteMaintenanceLease(
            MetadataWriteAdmissionCoordinator coordinator, String operationId, long epoch, Object token) {
        this.coordinator = coordinator;
        this.operationId = operationId;
        this.epoch = epoch;
        this.token = token;
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            coordinator.release(operationId, epoch, token);
        }
    }
}
