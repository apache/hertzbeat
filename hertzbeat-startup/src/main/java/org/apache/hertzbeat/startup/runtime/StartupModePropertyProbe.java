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

import java.nio.file.Path;
import java.util.Objects;
import org.apache.hertzbeat.common.runtime.RuntimeMode;

/** Applies a local/container break-glass override before delegating to the installation probe. */
public final class StartupModePropertyProbe implements StartupDecisionProbe {

    public static final String PROPERTY_NAME = "hertzbeat.startup.mode";
    public static final String ENVIRONMENT_NAME = "HERTZBEAT_STARTUP_MODE";

    private final StartupDecisionProbe fallback;

    public StartupModePropertyProbe(StartupDecisionProbe fallback) {
        this.fallback = Objects.requireNonNull(fallback, "fallback");
    }

    @Override
    public StartupDecision probe(String[] args) {
        return decide(args, System.getProperty(PROPERTY_NAME), System.getenv(ENVIRONMENT_NAME));
    }

    @Override
    public StartupDecision probe(String[] args, Path installationRoot) {
        String value = StartupArgumentProperties.resolve(
                args, PROPERTY_NAME, System.getProperty(PROPERTY_NAME), System.getenv(ENVIRONMENT_NAME));
        return value == null ? fallback.probe(args, installationRoot) : decisionFor(value);
    }

    StartupDecision decide(String[] args, String systemValue, String environmentValue) {
        String value = StartupArgumentProperties.resolve(args, PROPERTY_NAME, systemValue, environmentValue);
        return value == null ? fallback.probe(args) : decisionFor(value);
    }

    static StartupDecision decisionFor(String value) {
        RuntimeMode mode = RuntimeMode.fromProperty(value);
        return new StartupDecision(mode);
    }
}
