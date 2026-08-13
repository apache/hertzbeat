/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceErrorCode;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;

/** Completed JDBC copy result retained while its exact maintenance lease is pending release. */
final class MetadataCopyOutcome {

    private final MetadataMigrationErrorCode stableFailure;
    private final MigrationMaintenanceException stableMaintenanceFailure;
    private final Error fatal;

    private MetadataCopyOutcome(
            MetadataMigrationErrorCode stableFailure,
            MigrationMaintenanceException stableMaintenanceFailure,
            Error fatal) {
        this.stableFailure = stableFailure;
        this.stableMaintenanceFailure = stableMaintenanceFailure;
        this.fatal = fatal;
    }

    static MetadataCopyOutcome success() {
        return new MetadataCopyOutcome(null, null, null);
    }

    static MetadataCopyOutcome stableFailure(MetadataMigrationErrorCode code) {
        return new MetadataCopyOutcome(code, null, null);
    }

    static MetadataCopyOutcome stableMaintenanceFailure(MigrationMaintenanceException failure) {
        return new MetadataCopyOutcome(null, failure, null);
    }

    static MetadataCopyOutcome fatal(Error fatal) {
        return new MetadataCopyOutcome(null, null, fatal);
    }

    MetadataMigrationErrorCode stableFailure() {
        return stableFailure;
    }

    MigrationMaintenanceErrorCode stableMaintenanceFailure() {
        return stableMaintenanceFailure == null ? null : stableMaintenanceFailure.code();
    }

    void replay() {
        if (fatal != null) {
            throw fatal;
        }
        if (stableFailure != null) {
            throw new MetadataMigrationException(stableFailure);
        }
        if (stableMaintenanceFailure != null) {
            throw stableMaintenanceFailure;
        }
    }

    void releaseRequired() {
        if (fatal != null) {
            MetadataCopyReleaseRequiredException.attachMarker(fatal, null, null);
            throw fatal;
        }
        throw new MetadataCopyReleaseRequiredException(
                stableFailure, stableMaintenanceFailure());
    }

    void releaseFatal(Error releaseFatal) {
        if (fatal != null) {
            releaseRequired();
        }
        MetadataCopyReleaseRequiredException.attachMarker(
                releaseFatal, stableFailure, stableMaintenanceFailure());
        throw releaseFatal;
    }
}
