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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Emits startup diagnostics without retaining exception messages or causes. */
final class StartupFailureReporter {

    private static final Logger LOGGER = LoggerFactory.getLogger(StartupFailureReporter.class);
    private final DiagnosticSink sink;

    StartupFailureReporter() {
        this((stage, mode, exceptionClass) -> LOGGER.warn(
                "Startup failure stage={} mode={} exception={}", stage, mode, exceptionClass));
    }

    StartupFailureReporter(DiagnosticSink sink) {
        this.sink = Objects.requireNonNull(sink, "sink");
    }

    void report(Stage stage, RuntimeMode mode, RuntimeException failure) {
        try {
            sink.report(stage.value(), safeMode(mode), failure.getClass().getName());
        } catch (RuntimeException ignored) {
            // Diagnostics are best-effort and must never change startup recovery control flow.
        }
    }

    private static String safeMode(RuntimeMode mode) {
        return switch (mode) {
            case SETUP_ONLY -> "setup_only";
            case FULL_SETUP_GATED -> "full_setup_gated";
            case NORMAL -> "normal";
            case RECOVERY -> "recovery";
        };
    }

    @FunctionalInterface
    interface DiagnosticSink {

        void report(String stage, String mode, String exceptionClass);
    }

    enum Stage {
        STARTUP_PROBE("startup-probe"),
        CONTEXT_LAUNCH("context-launch"),
        RECOVERY_LAUNCH("recovery-launch");

        private final String value;

        Stage(String value) {
            this.value = value;
        }

        String value() {
            return value;
        }
    }
}
