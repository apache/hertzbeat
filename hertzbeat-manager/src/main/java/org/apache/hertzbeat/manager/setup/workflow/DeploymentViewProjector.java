/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Clock;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenancePhase;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceSnapshot;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;

/** Builds the secret-free deployment view from authoritative in-process facts. */
final class DeploymentViewProjector {

    private final SetupRuntimeState state;
    private final ManagedConfigCapability capability;
    private final StandaloneDeploymentOwnerView owner;
    private final MetadataMaintenanceCoordinator maintenance;
    private final Supplier<Optional<String>> activeOperation;
    private final Clock clock;
    private final boolean forceUnavailable;

    DeploymentViewProjector(
            SetupRuntimeState state,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            MetadataMaintenanceCoordinator maintenance,
            ManagedDeploymentMigrationCommands commands,
            Clock clock) {
        this(state, capability, owner, maintenance, commands::activeOperationId, clock);
    }

    DeploymentViewProjector(
            SetupRuntimeState state,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            MetadataMaintenanceCoordinator maintenance,
            Supplier<Optional<String>> activeOperation,
            Clock clock) {
        this(state, capability, owner, maintenance, activeOperation, clock, false);
    }

    private DeploymentViewProjector(
            SetupRuntimeState state,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            MetadataMaintenanceCoordinator maintenance,
            Supplier<Optional<String>> activeOperation,
            Clock clock,
            boolean forceUnavailable) {
        this.state = Objects.requireNonNull(state, "state");
        this.capability = Objects.requireNonNull(capability, "capability");
        this.owner = Objects.requireNonNull(owner, "owner");
        this.maintenance = Objects.requireNonNull(maintenance, "maintenance");
        this.activeOperation = Objects.requireNonNull(activeOperation, "activeOperation");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.forceUnavailable = forceUnavailable;
    }

    static DeploymentViewProjector unavailable(
            SetupRuntimeState state,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            MetadataMaintenanceCoordinator maintenance,
            Clock clock) {
        return new DeploymentViewProjector(
                state, capability, owner, maintenance, Optional::empty, clock, true);
    }

    DeploymentView project() {
        StatusResponse status = state.status();
        if (forceUnavailable) {
            DeploymentTopology topology = owner.isValid()
                    ? DeploymentTopology.SINGLE_NODE : DeploymentTopology.UNKNOWN;
            return new DeploymentView(
                    clock.instant(), status.managementDatabase(), status.telemetryStore(),
                    capability.applyMode(), MaintenanceMode.INACTIVE, topology, unavailable());
        }
        MetadataMaintenanceSnapshot maintenanceSnapshot = maintenance.snapshot();
        MaintenanceMode maintenanceMode = maintenanceSnapshot.phase() == MetadataMaintenancePhase.RUNNING
                ? MaintenanceMode.INACTIVE : MaintenanceMode.ACTIVE;
        DeploymentTopology topology = owner.isValid()
                ? DeploymentTopology.SINGLE_NODE : DeploymentTopology.UNKNOWN;
        Optional<String> operationId = activeOperation.get();
        MigrationCapability migration = migration(
                status.managementDatabase().kind(), topology, maintenanceSnapshot, operationId);
        return new DeploymentView(
                clock.instant(), status.managementDatabase(), status.telemetryStore(),
                capability.applyMode(), maintenanceMode, topology, migration);
    }

    private MigrationCapability migration(
            MetadataDatabaseKind database,
            DeploymentTopology topology,
            MetadataMaintenanceSnapshot snapshot,
            Optional<String> active) {
        if (database != MetadataDatabaseKind.H2) {
            return structural(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        }
        if (topology != DeploymentTopology.SINGLE_NODE) {
            return structural(SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE);
        }
        if (!capability.writableManagedConfig()
                || capability.applyMode() != ApplyMode.MANAGED_WRITE) {
            return unavailable();
        }
        if (snapshot.phase() == MetadataMaintenancePhase.QUIESCING
                || snapshot.phase() == MetadataMaintenancePhase.RECOVERY_REQUIRED) {
            return unavailable();
        }
        if (active.isPresent()) {
            return conflict(active.orElseThrow());
        }
        if (snapshot.operationId() != null) {
            return OperationIdValidator.isSafe(snapshot.operationId())
                    ? conflict(snapshot.operationId()) : unavailable();
        }
        return switch (snapshot.phase()) {
            case RUNNING -> MigrationCapability.permitted(MaintenanceAdmission.AUTO_ENTER);
            case QUIESCED -> MigrationCapability.permitted(MaintenanceAdmission.USE_CURRENT);
            case QUIESCING, RECOVERY_REQUIRED -> unavailable();
        };
    }

    private static MigrationCapability structural(SetupErrorCode blocker) {
        return MigrationCapability.blocked(blocker, MaintenanceAdmission.NOT_APPLICABLE);
    }

    private static MigrationCapability unavailable() {
        return MigrationCapability.blocked(
                SetupErrorCode.MIGRATION_UNAVAILABLE, MaintenanceAdmission.UNAVAILABLE);
    }

    private static MigrationCapability conflict(String operationId) {
        return MigrationCapability.blocked(
                SetupErrorCode.OPERATION_CONFLICT, MaintenanceAdmission.UNAVAILABLE, operationId);
    }
}
