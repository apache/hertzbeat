/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.nio.file.Path;
import java.util.Objects;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoverySession;

/** Revalidates the non-owning standalone capability around every recovery attempt. */
final class OwnerBoundStartupMigrationRecoveryPreflight implements StartupMigrationRecoveryPreflight {

    private final Path canonicalRoot;
    private final StandaloneDeploymentOwnerView ownerView;
    private final ManagedMigrationStartupRecoverySession session;

    OwnerBoundStartupMigrationRecoveryPreflight(
            Path canonicalRoot,
            StandaloneDeploymentOwnerView ownerView,
            ManagedMigrationStartupRecoverySession session) {
        this.canonicalRoot = Objects.requireNonNull(canonicalRoot, "canonicalRoot");
        this.ownerView = Objects.requireNonNull(ownerView, "ownerView");
        this.session = Objects.requireNonNull(session, "session");
    }

    @Override
    public ManagedMigrationStartupRecoveryDisposition reconcile() {
        requireValidOwner(canonicalRoot, ownerView);
        ManagedMigrationStartupRecoveryDisposition disposition =
                Objects.requireNonNull(session.reconcile(), "migration recovery disposition");
        requireValidOwner(canonicalRoot, ownerView);
        return disposition;
    }

    @Override
    public void close() {
        session.close();
    }

    static void requireValidOwner(Path canonicalRoot, StandaloneDeploymentOwnerView ownerView) {
        if (!ownerView.isValid() || !canonicalRoot.equals(ownerView.installationRoot())) {
            throw StandaloneDeploymentOwnerException.unavailable();
        }
    }
}
