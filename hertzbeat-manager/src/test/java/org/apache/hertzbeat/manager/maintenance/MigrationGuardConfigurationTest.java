/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.nio.file.Path;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class MigrationGuardConfigurationTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withPropertyValues(RuntimeMode.PROPERTY_NAME + "=" + RuntimeMode.NORMAL.value())
            .withUserConfiguration(MigrationGuardConfiguration.class)
            .withBean(BusinessRuntimeGate.class, () -> BusinessRuntimeGate.fixed(RuntimeMode.NORMAL))
            .withBean(StandaloneDeploymentOwnerView.class, MigrationGuardConfigurationTest::owner)
            .withBean(InstallationRecordRepository.class, () -> mock(InstallationRecordRepository.class));

    @Test
    void customConvergenceVerifierReplacesDefaultAndKeepsAuthorityUnique() {
        InstallationConvergenceVerifier custom = () -> true;

        context.withBean(InstallationConvergenceVerifier.class, () -> custom).run(result -> {
            assertThat(result).hasNotFailed();
            assertThat(result).hasSingleBean(InstallationConvergenceVerifier.class);
            assertThat(result.getBean(InstallationConvergenceVerifier.class)).isSameAs(custom);
            assertThat(result).hasSingleBean(DeploymentSingletonAuthority.class);
        });
    }

    @Test
    void customAuthorityReplacesStandaloneWhileDefaultVerifierRemainsUnique() {
        DeploymentSingletonAuthority custom = (operationId, timeout) -> () -> { };

        context.withBean(DeploymentSingletonAuthority.class, () -> custom).run(result -> {
            assertThat(result).hasNotFailed();
            assertThat(result).hasSingleBean(DeploymentSingletonAuthority.class);
            assertThat(result.getBean(DeploymentSingletonAuthority.class)).isSameAs(custom);
            assertThat(result).hasSingleBean(InstallationConvergenceVerifier.class);
        });
    }

    private static StandaloneDeploymentOwnerView owner() {
        return new StandaloneDeploymentOwnerView() {
            @Override
            public Path installationRoot() {
                return Path.of(".").toAbsolutePath().normalize();
            }

            @Override
            public boolean isValid() {
                return true;
            }
        };
    }
}
