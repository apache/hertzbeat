/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Clock;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;

/** Synchronized secret-free setup projection; durable stores remain the source of completion truth. */
public final class SetupRuntimeState {
    private final Clock clock;
    private final ManagedConfigCapability capability;
    private SetupPhase phase;
    private SetupAccess access;
    private boolean administratorConfigured;
    private String administratorUsername;
    private SetupConfigurationProjection configuration;
    private String operationId;

    public SetupRuntimeState(Clock clock, ManagedConfigCapability capability, SetupPhase phase,
                             SetupAccess access, boolean administratorConfigured,
                             String administratorUsername) {
        this(clock, capability, phase, access, administratorConfigured,
                administratorUsername, SetupConfigurationProjection.defaults());
    }

    public SetupRuntimeState(Clock clock, ManagedConfigCapability capability, SetupPhase phase,
                             SetupAccess access, boolean administratorConfigured,
                             String administratorUsername, SetupConfigurationProjection configuration) {
        this.clock = clock;
        this.capability = capability;
        this.phase = phase;
        this.access = access;
        this.administratorConfigured = administratorConfigured;
        this.administratorUsername = administratorUsername;
        this.configuration = configuration;
    }

    public synchronized StatusResponse status() {
        return new StatusResponse(phase, clock.instant(), access, capability.applyMode(),
                capability.writableManagedConfig(), operationId, errorFor(phase),
                configuration.managementDatabase(), configuration.telemetryStore(),
                administratorConfigured, configuration.optional(), configuration.warnings());
    }

    public synchronized SetupPhase phase() {
        return phase;
    }

    public synchronized void ensurePhase(SetupPhase expected) {
        requirePhase(expected);
    }

    public synchronized void unlocked() {
        if (access == SetupAccess.UNLOCKED) {
            return;
        }
        if (access != SetupAccess.LOCKED) {
            throw new SetupWorkflowConflict();
        }
        access = SetupAccess.UNLOCKED;
    }

    /** Revokes remote mutation access when a fresh owner proof replaces an expired session. */
    public synchronized void locked() {
        if (access == SetupAccess.LOCKED) {
            return;
        }
        if (access != SetupAccess.UNLOCKED) {
            throw new SetupWorkflowConflict();
        }
        access = SetupAccess.LOCKED;
    }

    public synchronized void configurationApplied(String id, SetupPhase next) {
        configurationApplied(SetupPhase.CONFIGURATION_REQUIRED, id, next);
    }

    public synchronized void configurationApplied(SetupPhase expected, String id, SetupPhase next) {
        requirePhase(expected);
        operationId = id;
        phase = next;
    }

    public synchronized void administratorCreated(String username) {
        requirePhase(SetupPhase.ADMINISTRATOR_REQUIRED);
        administratorConfigured = true;
        administratorUsername = username;
        phase = SetupPhase.OPTIONAL_CONFIGURATION;
    }

    public synchronized void optionsConfigured(OptionalConfigurationSummary configured,
                                               List<SetupWarningCode> warnings) {
        requirePhase(SetupPhase.OPTIONAL_CONFIGURATION);
        configuration = new SetupConfigurationProjection(configuration.managementDatabase(),
                configuration.telemetryStore(), configured, warnings);
    }

    public synchronized List<SetupWarningCode> pendingWarnings() {
        return configuration.warnings();
    }

    public synchronized MetadataDatabaseKind managementDatabaseKind() {
        return configuration.managementDatabase().kind();
    }

    public synchronized String administratorUsername() {
        return administratorUsername;
    }

    public synchronized void complete() {
        requirePhase(SetupPhase.OPTIONAL_CONFIGURATION);
        phase = SetupPhase.COMPLETE;
        operationId = null;
    }

    private void requirePhase(SetupPhase expected) {
        if (phase != expected) {
            throw new SetupWorkflowConflict();
        }
    }

    private static SetupErrorCode errorFor(SetupPhase phase) {
        return phase == SetupPhase.RECOVERY_REQUIRED ? SetupErrorCode.CONFIG_RECOVERY_REQUIRED : null;
    }
}
