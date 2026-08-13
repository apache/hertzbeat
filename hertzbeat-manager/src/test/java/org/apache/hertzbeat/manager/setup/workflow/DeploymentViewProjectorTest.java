/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenancePhase;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceSnapshot;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.config.DeploymentConstraint;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.junit.jupiter.api.Test;

class DeploymentViewProjectorTest {

    private static final String ACTIVE = "operation-a";
    private static final Path ROOT = Path.of(".").toAbsolutePath().normalize();

    @Test
    void validManagedH2OwnerIsSingleNodeAndCanAutoEnterMaintenance() {
        Fixture fixture = fixture(MetadataDatabaseKind.H2, writable());

        var view = fixture.projector.project();

        assertThat(view.topology()).isEqualTo(DeploymentTopology.SINGLE_NODE);
        assertThat(view.maintenanceMode()).isEqualTo(MaintenanceMode.INACTIVE);
        assertThat(view.migration().allowed()).isTrue();
        assertThat(view.migration().maintenanceAdmission()).isEqualTo(MaintenanceAdmission.AUTO_ENTER);
    }

    @Test
    void durableActiveOperationAndMaintenanceOwnershipAreProjectedAsConflict() {
        Fixture fixture = fixture(MetadataDatabaseKind.H2, writable());
        when(fixture.commands.activeOperationId()).thenReturn(Optional.of(ACTIVE));
        when(fixture.maintenance.snapshot()).thenReturn(
                new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.QUIESCED, ACTIVE, 2));

        var capability = fixture.projector.project().migration();

        assertThat(capability.allowed()).isFalse();
        assertThat(capability.blockedBy()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT);
        assertThat(capability.activeOperationId()).isEqualTo(ACTIVE);
    }

    @Test
    void invalidOwnerAndNonH2SourceUseStructuralFailClosedBlockers() {
        Fixture invalidOwner = fixture(MetadataDatabaseKind.H2, writable());
        when(invalidOwner.owner.isValid()).thenReturn(false);
        assertThat(invalidOwner.projector.project().migration().blockedBy())
                .isEqualTo(SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE);

        Fixture nonH2 = fixture(MetadataDatabaseKind.POSTGRESQL, writable());
        assertThat(nonH2.projector.project().migration().blockedBy())
                .isEqualTo(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
    }

    @Test
    void externalConfigurationAndUnsettledMaintenanceRemainUnavailable() {
        Fixture external = fixture(MetadataDatabaseKind.H2, new ManagedConfigCapability(
                ApplyMode.EXTERNAL_APPLY, false, DeploymentConstraint.READ_ONLY));
        assertThat(external.projector.project().migration().blockedBy())
                .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE);

        Fixture recovering = fixture(MetadataDatabaseKind.H2, writable());
        when(recovering.maintenance.snapshot()).thenReturn(
                new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.RECOVERY_REQUIRED, ACTIVE, 3));
        assertThat(recovering.projector.project().migration().blockedBy())
                .isEqualTo(SetupErrorCode.MIGRATION_UNAVAILABLE);
    }

    private static Fixture fixture(
            MetadataDatabaseKind kind, ManagedConfigCapability capability) {
        SetupConfigurationProjection configuration = new SetupConfigurationProjection(
                new ManagementDatabaseSummary(kind, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(
                        TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                new OptionalConfigurationSummary(false, false, false, false, false), List.of());
        SetupRuntimeState state = new SetupRuntimeState(
                Clock.fixed(Instant.parse("2026-08-10T01:00:00Z"), ZoneOffset.UTC),
                capability, SetupPhase.COMPLETE, SetupAccess.LOCAL, true, "admin", configuration);
        StandaloneDeploymentOwnerView owner = mock(StandaloneDeploymentOwnerView.class);
        when(owner.installationRoot()).thenReturn(ROOT);
        when(owner.isValid()).thenReturn(true);
        MetadataMaintenanceCoordinator maintenance = mock(MetadataMaintenanceCoordinator.class);
        when(maintenance.snapshot()).thenReturn(
                new MetadataMaintenanceSnapshot(MetadataMaintenancePhase.RUNNING, null, 1));
        ManagedDeploymentMigrationCommands commands = mock(ManagedDeploymentMigrationCommands.class);
        when(commands.activeOperationId()).thenReturn(Optional.empty());
        DeploymentViewProjector projector = new DeploymentViewProjector(
                state, capability, owner, maintenance, commands,
                Clock.fixed(Instant.parse("2026-08-10T02:00:00Z"), ZoneOffset.UTC));
        return new Fixture(owner, maintenance, commands, projector);
    }

    private static ManagedConfigCapability writable() {
        return new ManagedConfigCapability(ApplyMode.MANAGED_WRITE, true, DeploymentConstraint.NONE);
    }

    private record Fixture(
            StandaloneDeploymentOwnerView owner,
            MetadataMaintenanceCoordinator maintenance,
            ManagedDeploymentMigrationCommands commands,
            DeploymentViewProjector projector) {
    }
}
