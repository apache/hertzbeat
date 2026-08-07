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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;

/** Serializes setup-to-normal transitions and always closes the old context first. */
public final class HertzBeatStartupCoordinator implements SetupRuntimeTransition {

    private final StartupDecisionProbe probe;
    private final StartupContextLauncher launcher;
    private String[] args = new String[0];
    private RunningApplicationContext currentContext;

    public HertzBeatStartupCoordinator(StartupDecisionProbe probe, StartupContextLauncher launcher) {
        this.probe = Objects.requireNonNull(probe, "probe");
        this.launcher = Objects.requireNonNull(launcher, "launcher");
    }

    public synchronized RunningApplicationContext start(String[] applicationArgs) {
        args = applicationArgs == null ? new String[0] : applicationArgs.clone();
        StartupDecision decision;
        try {
            decision = Objects.requireNonNull(probe.probe(), "startup decision");
        } catch (RuntimeException exception) {
            decision = StartupDecision.recovery();
        }
        return transition(decision);
    }

    @Override
    public synchronized void completeSetup() {
        transition(new StartupDecision(RuntimeMode.NORMAL, SetupPhase.COMPLETE, null));
    }

    public synchronized RunningApplicationContext transition(StartupDecision decision) {
        Objects.requireNonNull(decision, "decision");
        if (currentContext != null && currentContext.isActive() && currentContext.mode() == decision.mode()) {
            return currentContext;
        }
        closeCurrent();
        try {
            currentContext = launch(decision);
        } catch (RuntimeException launchFailure) {
            if (decision.mode() == RuntimeMode.RECOVERY) {
                throw launchFailure;
            }
            try {
                currentContext = launch(StartupDecision.recovery());
            } catch (RuntimeException recoveryFailure) {
                recoveryFailure.addSuppressed(launchFailure);
                throw recoveryFailure;
            }
        }
        return currentContext;
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
