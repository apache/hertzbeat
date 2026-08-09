/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import org.apache.hertzbeat.common.transaction.MetadataWriteMaintenanceLease;

/** Releases one acquired maintenance window in strict reverse order with retryable progress. */
final class CompositeMigrationMaintenanceLease implements MigrationMaintenanceLease {

    private final DeploymentSingletonLease authorityLease;
    private final MigrationSourceLease sourceLease;
    private final MetadataMaintenanceLease producerLease;
    private final MetadataWriteMaintenanceLease writeLease;
    private final Runnable reservationRelease;
    private boolean writeReleased;
    private boolean producerReleased;
    private boolean sourceReleased;
    private boolean authorityReleased;

    CompositeMigrationMaintenanceLease(
            DeploymentSingletonLease authorityLease,
            MigrationSourceLease sourceLease,
            MetadataMaintenanceLease producerLease,
            MetadataWriteMaintenanceLease writeLease,
            Runnable reservationRelease) {
        this.authorityLease = authorityLease;
        this.sourceLease = sourceLease;
        this.producerLease = producerLease;
        this.writeLease = writeLease;
        this.reservationRelease = reservationRelease;
    }

    @Override
    public synchronized void close() {
        try {
            releaseInOrder();
        } catch (MigrationMaintenanceException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw MigrationMaintenanceException.resumeFailure();
        }
        reservationRelease.run();
    }

    private void releaseInOrder() {
        if (!writeReleased) {
            writeLease.close();
            writeReleased = true;
        }
        if (!producerReleased) {
            producerLease.resume();
            producerReleased = true;
        }
        if (!sourceReleased) {
            sourceLease.close();
            sourceReleased = true;
        }
        if (!authorityReleased) {
            authorityLease.close();
            authorityReleased = true;
        }
    }
}
