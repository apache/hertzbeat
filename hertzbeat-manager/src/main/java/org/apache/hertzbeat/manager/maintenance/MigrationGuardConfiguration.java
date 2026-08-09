/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Fail-closed fallbacks for maintenance facts that the runtime cannot prove. */
@Configuration(proxyBeanMethods = false)
public class MigrationGuardConfiguration {

    @Bean
    @ConditionalOnNormalBusinessRuntime
    @ConditionalOnBean(StandaloneDeploymentOwnerView.class)
    @ConditionalOnMissingBean(InstallationConvergenceVerifier.class)
    InstallationConvergenceVerifier normalInstallationConvergenceVerifier(
            InstallationRecordRepository records, StandaloneDeploymentOwnerView owner) {
        return new NormalInstallationConvergenceVerifier(records, owner);
    }

    @Bean
    @ConditionalOnBean({StandaloneDeploymentOwnerView.class, InstallationConvergenceVerifier.class})
    @ConditionalOnMissingBean(DeploymentSingletonAuthority.class)
    DeploymentSingletonAuthority deploymentSingletonAuthority(
            BusinessRuntimeGate runtimeGate,
            StandaloneDeploymentOwnerView owner,
            InstallationConvergenceVerifier convergence) {
        if (runtimeGate.isOpen()) {
            return new StandaloneDeploymentSingletonAuthority(owner, convergence);
        }
        return unavailableDeploymentSingletonAuthority();
    }

    @Bean
    @ConditionalOnMissingBean(DeploymentSingletonAuthority.class)
    DeploymentSingletonAuthority unavailableDeploymentSingletonAuthority() {
        return (operationId, timeout) -> {
            throw MigrationMaintenanceException.deploymentAuthorityUnavailable();
        };
    }

    @Bean
    @ConditionalOnMissingBean(MigrationSourceGuard.class)
    MigrationSourceGuard unavailableMigrationSourceGuard() {
        return (operationId, timeout) -> {
            throw MigrationMaintenanceException.sourceUnavailable();
        };
    }
}
