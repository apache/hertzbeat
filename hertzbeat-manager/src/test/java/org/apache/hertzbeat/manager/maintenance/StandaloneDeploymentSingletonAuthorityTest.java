/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class StandaloneDeploymentSingletonAuthorityTest {

    @Test
    void requiresLiveOwnerAndFreshFullConvergenceForEveryFence() {
        AtomicBoolean valid = new AtomicBoolean(true);
        AtomicBoolean full = new AtomicBoolean(false);
        AtomicInteger checks = new AtomicInteger();
        StandaloneDeploymentOwnerView owner = ownerView(valid, checks);
        StandaloneDeploymentSingletonAuthority authority =
                new StandaloneDeploymentSingletonAuthority(owner, full::get);

        assertThatThrownBy(() -> authority.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE));
        full.set(true);
        DeploymentSingletonLease lease = authority.acquire("operation-a", Duration.ZERO);
        lease.close();
        valid.set(false);
        assertThatThrownBy(() -> authority.acquire("operation-b", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE));
        assertThat(checks).hasValue(3);
    }

    @Test
    void issuesOneOperationCapabilityAndCloseNeverClosesProcessOwner() {
        AtomicBoolean valid = new AtomicBoolean(true);
        AtomicInteger checks = new AtomicInteger();
        StandaloneDeploymentSingletonAuthority authority = new StandaloneDeploymentSingletonAuthority(
                ownerView(valid, checks), () -> true);

        DeploymentSingletonLease lease = authority.acquire("operation-a", Duration.ZERO);
        assertThatThrownBy(() -> authority.acquire("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
        assertThatThrownBy(() -> authority.acquire("operation-b", Duration.ZERO))
                .isInstanceOf(MigrationMaintenanceException.class);
        lease.close();
        lease.close();
        authority.acquire("operation-b", Duration.ZERO).close();

        assertThat(valid).isTrue();
        assertThat(checks).hasValue(2);
    }

    private static StandaloneDeploymentOwnerView ownerView(AtomicBoolean valid, AtomicInteger checks) {
        return new StandaloneDeploymentOwnerView() {
            @Override
            public Path installationRoot() {
                return Path.of(".").toAbsolutePath().normalize();
            }

            @Override
            public boolean isValid() {
                checks.incrementAndGet();
                return valid.get();
            }
        };
    }
}
