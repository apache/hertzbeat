/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.api.DeploymentWorkflow;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.springframework.beans.factory.FactoryBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/** NORMAL-only construction boundary for the single managed migration runtime graph. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnNormalBusinessRuntime
@ConditionalOnBean(StandaloneDeploymentOwnerView.class)
public class DeploymentMigrationConfiguration {

    private static final Duration OPERATION_TIMEOUT = Duration.ofMinutes(5);

    @Bean
    @ConditionalOnMissingBean(DeploymentMigrationRuntime.Opener.class)
    DeploymentMigrationRuntime.Opener deploymentMigrationRuntimeOpener() {
        return DeploymentMigrationRuntime::open;
    }

    @Bean(destroyMethod = "destroySafely")
    DeploymentMigrationRuntime deploymentMigrationRuntime(
            Environment environment,
            BusinessRuntimeGate runtimeGate,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            SetupRuntimeState state,
            MetadataMaintenanceCoordinator maintenance,
            MigrationMaintenanceOrchestrator maintenanceOrchestrator,
            DeploymentMigrationRuntime.Opener opener) {
        Path root = SetupInstallationPaths.root(environment);
        Clock clock = Clock.systemUTC();
        if (!admitted(runtimeGate, capability, owner, root)) {
            DeploymentViewProjector projector = DeploymentViewProjector.unavailable(
                    state, capability, owner, maintenance, clock);
            DefaultDeploymentWorkflow unavailable = DefaultDeploymentWorkflow.unavailable(
                    projector, new DeploymentWorkflowFailureMapper(), clock);
            return DeploymentMigrationRuntime.unavailable(unavailable);
        }
        return opener.open(new DeploymentMigrationRuntime.OpenContext(
                root, owner, state, capability, maintenance, maintenanceOrchestrator,
                clock, OPERATION_TIMEOUT, System::nanoTime));
    }

    @Bean
    FactoryBean<DeploymentWorkflow> deploymentWorkflow(DeploymentMigrationRuntime runtime) {
        return new DeploymentWorkflowFactory(runtime);
    }

    private static boolean admitted(
            BusinessRuntimeGate gate,
            ManagedConfigCapability capability,
            StandaloneDeploymentOwnerView owner,
            Path root) {
        if (!gate.isOpen()
                || !capability.writableManagedConfig()
                || capability.applyMode() != ApplyMode.MANAGED_WRITE
                || !owner.isValid()) {
            return false;
        }
        return root.equals(owner.installationRoot().toAbsolutePath().normalize());
    }

    private static final class DeploymentWorkflowFactory implements FactoryBean<DeploymentWorkflow> {

        private final DeploymentMigrationRuntime runtime;

        private DeploymentWorkflowFactory(DeploymentMigrationRuntime runtime) {
            this.runtime = runtime;
        }

        @Override
        public DeploymentWorkflow getObject() {
            return runtime.available() ? runtime.workflow() : null;
        }

        @Override
        public Class<?> getObjectType() {
            return runtime.available() ? DeploymentWorkflow.class : null;
        }

        @Override
        public boolean isSingleton() {
            return true;
        }
    }
}
