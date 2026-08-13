/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.util.List;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.api.DeploymentWorkflow;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.DeploymentConstraint;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class DeploymentMigrationConfigurationTest {

    @TempDir
    private Path root;

    @Test
    void validNormalManagedOwnerOpensOneRuntimeAndExposesOneWorkflow() {
        DeploymentMigrationRuntime.Opener opener = mock(DeploymentMigrationRuntime.Opener.class);
        DeploymentMigrationRuntime runtime = mock(DeploymentMigrationRuntime.class);
        DefaultDeploymentWorkflow workflow = mock(DefaultDeploymentWorkflow.class);
        when(runtime.workflow()).thenReturn(workflow);
        when(runtime.available()).thenReturn(true);
        when(opener.open(any())).thenReturn(runtime);

        context(RuntimeMode.NORMAL, writable(), owner(root), opener).run(result -> {
            assertThat(result).hasNotFailed();
            assertThat(result).hasSingleBean(DeploymentMigrationRuntime.class);
            assertThat(result).hasSingleBean(DeploymentWorkflow.class);
            assertThat(result.getBean(DeploymentWorkflow.class)).isSameAs(workflow);
            verify(opener).open(any());
        });
    }

    @Test
    void configurationIsAbsentOutsideNormalWithoutOpeningRuntime() {
        for (RuntimeMode mode : List.of(
                RuntimeMode.SETUP_ONLY, RuntimeMode.FULL_SETUP_GATED, RuntimeMode.RECOVERY)) {
            DeploymentMigrationRuntime.Opener opener = mock(DeploymentMigrationRuntime.Opener.class);
            context(mode, writable(), owner(root), opener).run(result -> {
                assertThat(result).doesNotHaveBean(DeploymentMigrationRuntime.class);
                assertThat(result).doesNotHaveBean(DeploymentWorkflow.class);
                verify(opener, never()).open(any());
            });
        }
    }

    @Test
    void closedGateInvalidOwnerAndReadOnlyCapabilityPerformNoRuntimeIo() {
        DeploymentMigrationRuntime.Opener closedGate = mock(DeploymentMigrationRuntime.Opener.class);
        context(RuntimeMode.NORMAL, RuntimeMode.FULL_SETUP_GATED, writable(), owner(root), closedGate)
                .run(result -> assertUnavailable(result, closedGate));

        StandaloneDeploymentOwnerView invalid = owner(root);
        when(invalid.isValid()).thenReturn(false);
        DeploymentMigrationRuntime.Opener invalidOwner = mock(DeploymentMigrationRuntime.Opener.class);
        context(RuntimeMode.NORMAL, writable(), invalid, invalidOwner)
                .run(result -> assertUnavailable(result, invalidOwner));

        DeploymentMigrationRuntime.Opener readOnly = mock(DeploymentMigrationRuntime.Opener.class);
        context(RuntimeMode.NORMAL, new ManagedConfigCapability(
                ApplyMode.EXTERNAL_APPLY, false, DeploymentConstraint.READ_ONLY), owner(root), readOnly)
                .run(result -> assertUnavailable(result, readOnly));
    }

    @Test
    void mismatchedOwnerRootPerformsNoRuntimeIo() {
        DeploymentMigrationRuntime.Opener opener = mock(DeploymentMigrationRuntime.Opener.class);
        StandaloneDeploymentOwnerView owner = owner(root.resolve("foreign"));

        context(RuntimeMode.NORMAL, writable(), owner, opener)
                .run(result -> assertUnavailable(result, opener));
    }

    private static void assertUnavailable(
            org.springframework.boot.test.context.assertj.AssertableApplicationContext context,
            DeploymentMigrationRuntime.Opener opener) {
        assertThat(context).doesNotHaveBean(DeploymentWorkflow.class);
        DeploymentMigrationRuntime runtime = context.getBean(DeploymentMigrationRuntime.class);
        assertThat(runtime.workflow().deployment().migration().allowed()).isFalse();
        assertThat(runtime.workflow().deployment().migration().blockedBy())
                .isEqualTo(org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode
                        .MIGRATION_UNAVAILABLE);
        verify(opener, never()).open(any());
    }

    private ApplicationContextRunner context(
            RuntimeMode propertyMode,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            DeploymentMigrationRuntime.Opener opener) {
        return context(propertyMode, propertyMode, capability, owner, opener);
    }

    private ApplicationContextRunner context(
            RuntimeMode propertyMode,
            RuntimeMode gateMode,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            DeploymentMigrationRuntime.Opener opener) {
        return new ApplicationContextRunner()
                .withPropertyValues(
                        RuntimeMode.PROPERTY_NAME + "=" + propertyMode.value(),
                        SetupInstallationPaths.ROOT_PROPERTY + "=" + root)
                .withUserConfiguration(DeploymentMigrationConfiguration.class)
                .withBean(BusinessRuntimeGate.class, () -> BusinessRuntimeGate.fixed(gateMode))
                .withBean(ManagedConfigCapability.class, () -> capability)
                .withBean(StandaloneDeploymentOwnerView.class, () -> owner)
                .withBean(SetupRuntimeState.class, () -> new SetupRuntimeState(
                        Clock.systemUTC(), capability, SetupPhase.COMPLETE,
                        SetupAccess.LOCAL, true, "admin"))
                .withBean(MetadataMaintenanceCoordinator.class,
                        () -> mock(MetadataMaintenanceCoordinator.class))
                .withBean(MigrationMaintenanceOrchestrator.class,
                        () -> mock(MigrationMaintenanceOrchestrator.class))
                .withBean(DeploymentMigrationRuntime.Opener.class, () -> opener);
    }

    private static StandaloneDeploymentOwnerView owner(Path root) {
        StandaloneDeploymentOwnerView owner = mock(StandaloneDeploymentOwnerView.class);
        when(owner.installationRoot()).thenReturn(root.toAbsolutePath().normalize());
        when(owner.isValid()).thenReturn(true);
        return owner;
    }

    private static ManagedConfigCapability writable() {
        return new ManagedConfigCapability(ApplyMode.MANAGED_WRITE, true, DeploymentConstraint.NONE);
    }
}
