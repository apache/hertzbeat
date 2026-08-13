/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Executes scoped provision and copy steps without owning workflow state or cleanup. */
final class RetainedCutoverSteps {

    private final TargetJdbcConnectionFactory targetFactory;
    private final FlywayTargetSchemaProvisioner provisioner;
    private final MigrationMaintenanceOrchestrator maintenance;
    private final JdbcMetadataMigrationExecutor executor;

    RetainedCutoverSteps(
            TargetJdbcConnectionFactory targetFactory,
            FlywayTargetSchemaProvisioner provisioner,
            MigrationMaintenanceOrchestrator maintenance,
            JdbcMetadataMigrationExecutor executor) {
        this.targetFactory = Objects.requireNonNull(targetFactory, "targetFactory");
        this.provisioner = Objects.requireNonNull(provisioner, "provisioner");
        this.maintenance = Objects.requireNonNull(maintenance, "maintenance");
        this.executor = Objects.requireNonNull(executor, "executor");
    }

    TargetJdbcConnectionLease acquire(
            MetadataDatabaseSettings target,
            SecretValue password,
            JdbcMetadataMigrationDeadline deadline) {
        return targetFactory.acquire(target, password, deadline);
    }

    RetainedCutoverOutcome prepare(
            RetainedCutoverPreparation preparation,
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword,
            JdbcMetadataMigrationDeadline deadline) {
        try {
            requirePreparationBudget(deadline);
            preparation.prepare(context, target, borrowedPassword);
            requirePreparationBudget(deadline);
            return RetainedCutoverOutcome.success();
        } catch (RuntimeException | Error failure) {
            return RetainedCutoverOutcome.failure(failure);
        }
    }

    private static void requirePreparationBudget(JdbcMetadataMigrationDeadline deadline) {
        if (Thread.currentThread().isInterrupted()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        deadline.remainingDuration();
    }

    RetainedCutoverOutcome provision(
            TargetJdbcConnectionLease lease,
            MetadataDatabaseSettings target,
            JdbcMetadataMigrationDeadline deadline) {
        try {
            lease.withConnection(connection -> provisioner.provision(
                    connection, target.kind(), deadline));
            return RetainedCutoverOutcome.success();
        } catch (RuntimeException | Error failure) {
            return RetainedCutoverOutcome.failure(failure);
        }
    }

    MigrationMaintenanceLease acquireMaintenance(
            String operationId, JdbcMetadataMigrationDeadline deadline) {
        MigrationMaintenanceLease lease = maintenance.acquire(
                operationId, deadline.remainingDuration());
        if (lease == null) {
            throw MigrationMaintenanceException.maintenanceFailure();
        }
        return lease;
    }

    RetainedCutoverOutcome copy(
            TargetJdbcConnectionLease targetLease,
            MigrationMaintenanceLease maintenanceLease,
            MetadataDatabaseSettings target,
            JdbcMetadataMigrationDeadline deadline,
            MetadataMigrationProgressSink progress) {
        try {
            targetLease.withConnection(targetConnection ->
                    maintenanceLease.withSourceConnection(sourceConnection ->
                            executor.execute(sourceConnection, targetConnection,
                                    target.kind(), deadline, progress)));
            return RetainedCutoverOutcome.success();
        } catch (RuntimeException | Error failure) {
            return RetainedCutoverOutcome.failure(failure);
        }
    }
}
