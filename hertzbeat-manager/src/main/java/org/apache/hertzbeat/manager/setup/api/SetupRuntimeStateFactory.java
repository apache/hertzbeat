/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import java.net.InetAddress;
import java.nio.file.Path;
import java.time.Clock;
import java.util.Optional;
import org.apache.hertzbeat.common.runtime.BusinessRuntimeGate;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.State;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.identity.DatabaseAccountRepository;
import org.apache.hertzbeat.manager.setup.installation.InstallationConvergenceService;
import org.apache.hertzbeat.manager.setup.installation.InstallationMode;
import org.apache.hertzbeat.manager.setup.installation.InstallationRecordRepository;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.springframework.core.env.Environment;

/** Derives the initial HTTP setup state from runtime, managed files, identity, and installation truth. */
final class SetupRuntimeStateFactory {
    SetupRuntimeState create(Environment environment, Path root, InetAddress bindAddress, BusinessRuntimeGate gate,
                             ManagedConfigCapability capability, Optional<DatabaseAccountRepository> accounts,
                             Optional<InstallationRecordRepository> installations) {
        var inspection = new ManagedActiveConfigurationInspector(root).inspect();
        var administrator = accounts.flatMap(DatabaseAccountRepository::findByBootstrapSlotIsNotNull);
        Optional<InstallationMode> installationMode = installations.map(repository ->
                new InstallationConvergenceService(repository,
                        root,
                        root.resolve("data/config/.installation-fingerprint")).classify());
        SetupPhase phase = phase(gate.mode(), inspection.state(), administrator.isPresent(), installationMode);
        return new SetupRuntimeState(Clock.systemUTC(), capability, phase,
                bindAddress.isLoopbackAddress() ? SetupAccess.LOCAL : SetupAccess.LOCKED,
                administrator.isPresent(), administrator.map(account -> account.username()).orElse(null),
                new SetupStatusProjectionFactory().create(environment, inspection));
    }

    private static SetupPhase phase(RuntimeMode mode, State inspection, boolean administratorConfigured,
                                    Optional<InstallationMode> installationMode) {
        if (mode == RuntimeMode.RECOVERY || inspection == State.RECOVERY_REQUIRED) {
            return SetupPhase.RECOVERY_REQUIRED;
        }
        return switch (mode) {
            case SETUP_ONLY -> inspection == State.LOADABLE
                    ? SetupPhase.APPLICATION_STARTING : SetupPhase.CONFIGURATION_REQUIRED;
            case FULL_SETUP_GATED -> fullSetupPhase(administratorConfigured, installationMode);
            case NORMAL -> SetupPhase.COMPLETE;
            case RECOVERY -> SetupPhase.RECOVERY_REQUIRED;
        };
    }

    private static SetupPhase fullSetupPhase(boolean administratorConfigured,
                                             Optional<InstallationMode> installationMode) {
        if (installationMode.filter(mode -> mode == InstallationMode.FULL).isPresent()) {
            return SetupPhase.COMPLETE;
        }
        if (installationMode.filter(mode -> mode == InstallationMode.RECOVERY).isPresent()) {
            return SetupPhase.RECOVERY_REQUIRED;
        }
        return administratorConfigured
                ? SetupPhase.OPTIONAL_CONFIGURATION : SetupPhase.ADMINISTRATOR_REQUIRED;
    }
}
