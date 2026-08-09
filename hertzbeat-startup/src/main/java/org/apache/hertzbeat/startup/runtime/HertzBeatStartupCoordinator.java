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

package org.apache.hertzbeat.startup.runtime;

import java.util.Objects;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;

/** Serializes setup-to-normal transitions and always closes the old context first. */
public final class HertzBeatStartupCoordinator implements SetupRuntimeTransition {

    private final StartupDecisionProbe probe;
    private final StartupContextLauncher launcher;
    private final StartupFailureReporter failureReporter;
    private String[] args = new String[0];
    private RunningApplicationContext currentContext;
    private boolean normalRuntimeSelected;

    public HertzBeatStartupCoordinator(StartupDecisionProbe probe, StartupContextLauncher launcher) {
        this(probe, launcher, new StartupFailureReporter());
    }

    HertzBeatStartupCoordinator(
            StartupDecisionProbe probe, StartupContextLauncher launcher, StartupFailureReporter failureReporter) {
        this.probe = Objects.requireNonNull(probe, "probe");
        this.launcher = Objects.requireNonNull(launcher, "launcher");
        this.failureReporter = Objects.requireNonNull(failureReporter, "failureReporter");
    }

    public synchronized RunningApplicationContext start(String[] applicationArgs) {
        args = applicationArgs == null ? new String[0] : applicationArgs.clone();
        StartupDecision decision;
        try {
            decision = Objects.requireNonNull(probe.probe(args.clone()), "startup decision");
        } catch (RuntimeException exception) {
            failureReporter.report(StartupFailureReporter.Stage.STARTUP_PROBE, RuntimeMode.RECOVERY, exception);
            decision = StartupDecision.recovery();
        }
        return transition(decision);
    }

    @Override
    public synchronized void configurationApplied() {
        if (normalRuntimeSelected) {
            return;
        }
        // The intent may be stale; the durable startup probe remains authoritative for the target mode.
        StartupDecision currentDecision = Objects.requireNonNull(
                probe.probe(args.clone()), "startup decision");
        transition(currentDecision);
    }

    @Override
    public synchronized void completeSetup() {
        transition(StartupDecision.normal());
    }

    public synchronized RunningApplicationContext transition(StartupDecision decision) {
        Objects.requireNonNull(decision, "decision");
        if (currentContext != null && currentContext.isActive() && currentContext.mode() == decision.mode()) {
            recordNormalSelection();
            return currentContext;
        }
        closeCurrent();
        try {
            currentContext = launch(decision);
        } catch (RuntimeException launchFailure) {
            if (decision.mode() == RuntimeMode.RECOVERY) {
                failureReporter.report(StartupFailureReporter.Stage.RECOVERY_LAUNCH, RuntimeMode.RECOVERY, launchFailure);
                throw launchFailure;
            }
            failureReporter.report(StartupFailureReporter.Stage.CONTEXT_LAUNCH, decision.mode(), launchFailure);
            try {
                currentContext = launch(StartupDecision.recovery());
            } catch (RuntimeException recoveryFailure) {
                failureReporter.report(
                        StartupFailureReporter.Stage.RECOVERY_LAUNCH, RuntimeMode.RECOVERY, recoveryFailure);
                if (recoveryFailure != launchFailure) {
                    recoveryFailure.addSuppressed(launchFailure);
                }
                throw recoveryFailure;
            }
        }
        recordNormalSelection();
        return currentContext;
    }

    private void recordNormalSelection() {
        if (currentContext != null && currentContext.isActive()
                && currentContext.mode() == RuntimeMode.NORMAL) {
            normalRuntimeSelected = true;
        }
    }

    public synchronized RuntimeMode mode() {
        return currentContext == null ? null : currentContext.mode();
    }

    public synchronized RunningApplicationContext currentContext() {
        return currentContext;
    }

    private void closeCurrent() {
        if (currentContext != null) {
            currentContext.close();
            currentContext = null;
        }
    }

    private RunningApplicationContext launch(StartupDecision decision) {
        return Objects.requireNonNull(
                launcher.launch(decision, args.clone(), this),
                "startup context launcher returned null for " + decision.mode().value());
    }
}
