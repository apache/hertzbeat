/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;

/** Advances exact target cleanup before either retaining or releasing maintenance. */
final class RetainedCutoverRelease {

    private RetainedCutoverOutcome outcome;
    private final boolean retainMaintenanceOnSuccess;
    private TargetJdbcConnectionFactory factoryCleanup;
    private TargetJdbcConnectionLease targetLease;
    private MigrationMaintenanceLease maintenanceLease;

    private RetainedCutoverRelease(
            TargetJdbcConnectionFactory factoryCleanup,
            TargetJdbcConnectionLease targetLease,
            MigrationMaintenanceLease maintenanceLease,
            RetainedCutoverOutcome outcome,
            boolean retainMaintenanceOnSuccess) {
        this.factoryCleanup = factoryCleanup;
        this.targetLease = targetLease;
        this.maintenanceLease = maintenanceLease;
        this.outcome = outcome;
        this.retainMaintenanceOnSuccess = retainMaintenanceOnSuccess;
    }

    static RetainedCutoverRelease factoryCleanup(
            TargetJdbcConnectionFactory factory,
            RetainedCutoverOutcome outcome) {
        return new RetainedCutoverRelease(factory, null, null, outcome, false);
    }

    static RetainedCutoverRelease resources(
            TargetJdbcConnectionLease targetLease,
            MigrationMaintenanceLease maintenanceLease,
            RetainedCutoverOutcome outcome,
            boolean retainMaintenanceOnSuccess) {
        return new RetainedCutoverRelease(
                null, targetLease, maintenanceLease, outcome, retainMaintenanceOnSuccess);
    }

    Advance advance(JdbcMetadataMigrationDeadline cleanupDeadline) {
        if (factoryCleanup != null) {
            TargetJdbcFailedAcquireSettlement settlement =
                    factoryCleanup.settleFailedAcquire(cleanupDeadline);
            if (settlement == TargetJdbcFailedAcquireSettlement.TERMINAL_CLOSED) {
                outcome = outcome.terminalFactoryClosedUnlessFatal();
            }
            factoryCleanup = null;
        }
        if (targetLease != null) {
            targetLease.close();
            targetLease = null;
        }
        if (retainMaintenanceOnSuccess && outcome.successful()) {
            return Advance.RETAINED;
        }
        if (maintenanceLease != null) {
            maintenanceLease.close();
            maintenanceLease = null;
        }
        return Advance.RELEASED;
    }

    MigrationMaintenanceLease takeRetainedMaintenance() {
        MigrationMaintenanceLease retained = maintenanceLease;
        maintenanceLease = null;
        return retained;
    }

    RetainedCutoverOutcome outcome() {
        return outcome;
    }

    enum Advance {
        RETAINED,
        RELEASED
    }
}
