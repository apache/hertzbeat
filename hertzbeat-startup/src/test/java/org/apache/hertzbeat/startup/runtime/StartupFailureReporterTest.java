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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.slf4j.LoggerFactory;

class StartupFailureReporterTest {

    private static final String SECRET = "password=change-me";
    private static final String JDBC_URL = "jdbc:postgresql://database.internal/hertzbeat";
    private static final String CLI_SECRET = "--spring.datasource.password=command-line-secret";

    private final Logger logger = (Logger) LoggerFactory.getLogger(StartupFailureReporter.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    void probeFailureFallsBackToRecoveryWithSafeDiagnostic() {
        RuntimeException probeFailure = new IllegalStateException(SECRET + " " + JDBC_URL);
        probeFailure.setStackTrace(new StackTraceElement[]{new StackTraceElement(
                "secret." + SECRET, "connect." + JDBC_URL, CLI_SECRET, 7)});
        RecordingLauncher launcher = new RecordingLauncher();
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> {
                    throw probeFailure;
                }, launcher);

        RunningApplicationContext context = coordinator.start(new String[]{CLI_SECRET});

        assertEquals(RuntimeMode.RECOVERY, context.mode());
        assertEquals(List.of(RuntimeMode.RECOVERY), launcher.attempts);
        assertSafeDiagnostic(appender.list.getFirst(), "startup-probe", RuntimeMode.RECOVERY, probeFailure);
    }

    @ParameterizedTest
    @EnumSource(value = RuntimeMode.class, names = {"NORMAL", "FULL_SETUP_GATED"})
    void contextFailureRetainsSafeDiagnosticWhenRecoverySucceeds(RuntimeMode failedMode) {
        RuntimeException launchFailure = new IllegalArgumentException(SECRET + " config=" + JDBC_URL);
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failure(failedMode, launchFailure);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> new StartupDecision(failedMode), launcher);

        RunningApplicationContext context = coordinator.start(new String[]{CLI_SECRET});

        assertEquals(RuntimeMode.RECOVERY, context.mode());
        assertEquals(List.of(failedMode, RuntimeMode.RECOVERY), launcher.attempts);
        assertSafeDiagnostic(appender.list.getFirst(), "context-launch", failedMode, launchFailure);
    }

    @Test
    void recoveryFailurePreservesPropagationAndSuppressionWithoutDiagnosticLeaks() {
        RuntimeException launchFailure = new IllegalStateException(SECRET + " " + CLI_SECRET);
        RuntimeException recoveryFailure = new UnsupportedOperationException(JDBC_URL + " " + SECRET);
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failure(RuntimeMode.NORMAL, launchFailure);
        launcher.failure(RuntimeMode.RECOVERY, recoveryFailure);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), launcher);

        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> coordinator.start(new String[]{CLI_SECRET}));

        assertSame(recoveryFailure, thrown);
        assertEquals(1, thrown.getSuppressed().length);
        assertSame(launchFailure, thrown.getSuppressed()[0]);
        assertEquals(2, appender.list.size());
        assertSafeDiagnostic(appender.list.get(0), "context-launch", RuntimeMode.NORMAL, launchFailure);
        assertSafeDiagnostic(appender.list.get(1), "recovery-launch", RuntimeMode.RECOVERY, recoveryFailure);
    }

    @Test
    void diagnosticSinkFailureCannotPreventFailClosedRecovery() {
        RecordingLauncher launcher = new RecordingLauncher();
        StartupFailureReporter reporter = new StartupFailureReporter((stage, mode, exceptionClass) -> {
            throw new IllegalStateException("diagnostic sink unavailable " + SECRET);
        });
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> {
                    throw new IllegalArgumentException(JDBC_URL);
                }, launcher, reporter);

        RunningApplicationContext context = coordinator.start(new String[]{CLI_SECRET});

        assertEquals(RuntimeMode.RECOVERY, context.mode());
        assertEquals(List.of(RuntimeMode.RECOVERY), launcher.attempts);
        assertEquals(0, appender.list.size());
    }

    @Test
    void identicalContextAndRecoveryFailureDoesNotAttemptSelfSuppression() {
        RuntimeException sharedFailure = new IllegalStateException(SECRET);
        RecordingLauncher launcher = new RecordingLauncher();
        launcher.failure(RuntimeMode.NORMAL, sharedFailure);
        launcher.failure(RuntimeMode.RECOVERY, sharedFailure);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), launcher);

        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> coordinator.start(new String[]{CLI_SECRET}));

        assertSame(sharedFailure, thrown);
        assertEquals(0, thrown.getSuppressed().length);
        assertEquals(2, appender.list.size());
        assertSafeDiagnostic(appender.list.get(0), "context-launch", RuntimeMode.NORMAL, sharedFailure);
        assertSafeDiagnostic(appender.list.get(1), "recovery-launch", RuntimeMode.RECOVERY, sharedFailure);
    }

    private static void assertSafeDiagnostic(
            ILoggingEvent event, String stage, RuntimeMode mode, RuntimeException originalFailure) {
        assertEquals("Startup failure stage=" + stage + " mode=" + mode.value() + " exception="
                + originalFailure.getClass().getName(), event.getFormattedMessage());
        assertFalse(event.getFormattedMessage().contains(SECRET));
        assertFalse(event.getFormattedMessage().contains(JDBC_URL));
        assertFalse(event.getFormattedMessage().contains(CLI_SECRET));
        assertEquals(3, event.getArgumentArray().length);
        assertEquals(stage, event.getArgumentArray()[0]);
        assertEquals(mode.value(), event.getArgumentArray()[1]);
        assertEquals(originalFailure.getClass().getName(), event.getArgumentArray()[2]);
        assertNull(event.getThrowableProxy());
    }

    private static final class RecordingLauncher implements StartupContextLauncher {

        private final List<RuntimeMode> attempts = new java.util.ArrayList<>();
        private final java.util.Map<RuntimeMode, RuntimeException> failures = new java.util.EnumMap<>(RuntimeMode.class);

        void failure(RuntimeMode mode, RuntimeException failure) {
            failures.put(mode, failure);
        }

        @Override
        public RunningApplicationContext launch(
                StartupDecision decision, String[] args,
                org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition transition) {
            RuntimeMode mode = decision.mode();
            attempts.add(mode);
            RuntimeException failure = failures.get(mode);
            if (failure != null) {
                throw failure;
            }
            return new RunningApplicationContext() {
                @Override
                public RuntimeMode mode() {
                    return mode;
                }

                @Override
                public boolean isActive() {
                    return true;
                }

                @Override
                public void close() {
                    // Nothing to release in this test context.
                }
            };
        }
    }
}
