/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Optional;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;

/** Secret-free signal that a completed copy still owns an unreleased maintenance lease. */
public final class MetadataCopyReleaseRequiredException extends RuntimeException {

    private final MetadataMigrationErrorCode stableCopyFailure;
    private final MigrationMaintenanceErrorCode stableMaintenanceFailure;

    MetadataCopyReleaseRequiredException(
            MetadataMigrationErrorCode stableCopyFailure,
            MigrationMaintenanceErrorCode stableMaintenanceFailure) {
        super("Metadata copy maintenance release requires recovery");
        this.stableCopyFailure = stableCopyFailure;
        this.stableMaintenanceFailure = stableMaintenanceFailure;
    }

    public Optional<MetadataMigrationErrorCode> stableCopyFailure() {
        return Optional.ofNullable(stableCopyFailure);
    }

    public Optional<MigrationMaintenanceErrorCode> stableMaintenanceFailure() {
        return Optional.ofNullable(stableMaintenanceFailure);
    }

    static void attachMarker(
            Error fatal,
            MetadataMigrationErrorCode stableCopyFailure,
            MigrationMaintenanceErrorCode stableMaintenanceFailure) {
        for (Throwable suppressed : fatal.getSuppressed()) {
            if (suppressed instanceof MetadataCopyReleaseRequiredException) {
                return;
            }
        }
        fatal.addSuppressed(new MetadataCopyReleaseRequiredException(
                stableCopyFailure, stableMaintenanceFailure));
    }
}
