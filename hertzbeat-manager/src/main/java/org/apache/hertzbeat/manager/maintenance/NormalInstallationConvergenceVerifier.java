/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.installation.InstallationConvergenceService;
import org.apache.hertzbeat.manager.setup.installation.InstallationMode;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;

/** Normal-context adapter that re-reads fingerprint and database installation state. */
public final class NormalInstallationConvergenceVerifier implements InstallationConvergenceVerifier {

    private final InstallationRecordRepository records;
    private final StandaloneDeploymentOwnerView owner;

    public NormalInstallationConvergenceVerifier(
            InstallationRecordRepository records, StandaloneDeploymentOwnerView owner) {
        this.records = records;
        this.owner = owner;
    }

    @Override
    public boolean isFullyConverged() {
        Path root = owner.installationRoot();
        return new InstallationConvergenceService(
                records, root, root.resolve("data/config/.installation-fingerprint")).classify()
                == InstallationMode.FULL;
    }
}
