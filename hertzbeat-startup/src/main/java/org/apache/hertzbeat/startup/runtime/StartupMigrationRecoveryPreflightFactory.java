/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.Executor;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoverySession;

/** Creates one migration recovery session after the standalone owner is established. */
@FunctionalInterface
interface StartupMigrationRecoveryPreflightFactory {

    StartupMigrationRecoveryPreflight open(
            Path canonicalRoot,
            StandaloneDeploymentOwnerView ownerView,
            Duration verificationTimeout,
            Executor abortExecutor);

    static StartupMigrationRecoveryPreflightFactory system() {
        return (root, owner, timeout, executor) -> {
            OwnerBoundStartupMigrationRecoveryPreflight.requireValidOwner(root, owner);
            ManagedMigrationStartupRecoverySession session =
                    new ManagedMigrationStartupRecoverySession(root, timeout, executor);
            return new OwnerBoundStartupMigrationRecoveryPreflight(root, owner, session);
        };
    }
}
