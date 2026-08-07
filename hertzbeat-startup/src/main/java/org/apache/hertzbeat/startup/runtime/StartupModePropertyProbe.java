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

/** Applies a local/container break-glass override before delegating to the installation probe. */
public final class StartupModePropertyProbe implements StartupDecisionProbe {

    public static final String PROPERTY_NAME = "hertzbeat.startup.mode";
    public static final String ENVIRONMENT_NAME = "HERTZBEAT_STARTUP_MODE";

    private final StartupDecisionProbe fallback;

    public StartupModePropertyProbe() {
        this(StartupDecision::normal);
    }

    public StartupModePropertyProbe(StartupDecisionProbe fallback) {
        this.fallback = Objects.requireNonNull(fallback, "fallback");
    }

    @Override
    public StartupDecision probe() {
        return decide(System.getProperty(PROPERTY_NAME), System.getenv(ENVIRONMENT_NAME));
    }

    StartupDecision decide(String systemValue, String environmentValue) {
        String value = selectConfiguredValue(systemValue, environmentValue);
        return value == null ? fallback.probe() : decisionFor(value);
    }

    static String selectConfiguredValue(String systemValue, String environmentValue) {
        return systemValue == null ? environmentValue : systemValue;
    }

    static StartupDecision decisionFor(String value) {
        RuntimeMode mode = RuntimeMode.fromProperty(value);
        return switch (mode) {
            case NORMAL -> StartupDecision.normal();
            case SETUP_ONLY -> new StartupDecision(mode, SetupPhase.CONFIGURATION_REQUIRED, null);
            case FULL_SETUP_GATED -> new StartupDecision(mode, SetupPhase.ADMINISTRATOR_REQUIRED, null);
            case RECOVERY -> StartupDecision.recovery();
        };
    }
}
