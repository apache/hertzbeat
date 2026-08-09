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

package org.apache.hertzbeat.manager.setup.runtime;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore.Intent;
import org.apache.hertzbeat.startup.runtime.HertzBeatStartupCoordinator;
import org.apache.hertzbeat.startup.runtime.RunningApplicationContext;
import org.apache.hertzbeat.startup.runtime.StartupContextLauncher;
import org.apache.hertzbeat.startup.runtime.StartupDecision;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SetupTransitionSplitLockTest {
    @TempDir
    private Path installationRoot;

    @Test
    void completionBetweenMarkerReadsCannotLetStaleContextDowngradeSharedRuntime() throws Exception {
        RecordingLauncher launcher = new RecordingLauncher();
        AtomicInteger probeCalls = new AtomicInteger();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> {
                    probeCalls.incrementAndGet();
                    return new StartupDecision(RuntimeMode.FULL_SETUP_GATED);
                }, launcher);
        coordinator.start(new String[0]);
        new FileSetupTransitionIntentStore(installationRoot).save(Intent.CONFIGURATION_APPLIED);

        FileSetupTransitionIntentStore completingContext = storeWithLock("completion");
        AtomicBoolean interleaved = new AtomicBoolean();
        Path completionMarker = installationRoot.resolve(
                FileSetupTransitionIntentStore.COMPLETION_RELATIVE_PATH);
        FileSetupTransitionIntentStore staleContext = new FileSetupTransitionIntentStore(
                installationRoot, ignored -> { },
                new FileSetupTransitionIntentLock(
                        installationRoot, "data/config/.setup-transition-stale.lock"),
                (path, present) -> {
                    if (path.equals(completionMarker) && !present
                            && interleaved.compareAndSet(false, true)) {
                        completingContext.save(Intent.INSTALLATION_COMPLETED);
                        coordinator.completeSetup();
                        completingContext.clear(Intent.INSTALLATION_COMPLETED);
                    }
                });
        SetupRuntimeTransitionScheduler staleScheduler = new SetupRuntimeTransitionScheduler(
                coordinator, staleContext, (task, delayMillis) -> task.run());

        staleScheduler.onApplicationReady(null);

        assertThat(interleaved).isTrue();
        assertThat(coordinator.mode()).isEqualTo(RuntimeMode.NORMAL);
        assertThat(probeCalls).hasValue(1);
        assertThat(launcher.events).containsExactly(
                "open:full_setup_gated", "close:full_setup_gated", "open:normal");
    }

    private FileSetupTransitionIntentStore storeWithLock(String identity) {
        return new FileSetupTransitionIntentStore(
                installationRoot, ignored -> { },
                new FileSetupTransitionIntentLock(
                        installationRoot, "data/config/.setup-transition-" + identity + ".lock"),
                FileSetupTransitionIntentStore.MarkerObservation.NONE);
    }

    private static final class RecordingLauncher implements StartupContextLauncher {
        private final List<String> events = new ArrayList<>();

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args, SetupRuntimeTransition transition) {
            events.add("open:" + decision.mode().value());
            return new RecordingContext(decision.mode(), events);
        }
    }

    private static final class RecordingContext implements RunningApplicationContext {
        private final RuntimeMode mode;
        private final List<String> events;
        private boolean active = true;

        private RecordingContext(RuntimeMode mode, List<String> events) {
            this.mode = mode;
            this.events = events;
        }

        @Override
        public RuntimeMode mode() {
            return mode;
        }

        @Override
        public boolean isActive() {
            return active;
        }

        @Override
        public void close() {
            active = false;
            events.add("close:" + mode.value());
        }
    }
}
