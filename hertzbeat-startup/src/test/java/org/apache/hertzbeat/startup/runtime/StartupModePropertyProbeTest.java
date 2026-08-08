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
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.junit.jupiter.api.Test;

class StartupModePropertyProbeTest {

    @Test
    void missingOverridePreservesNormalStartup() {
        StartupDecision decision = new StartupModePropertyProbe().decide(new String[0], null, null);

        assertEquals(RuntimeMode.NORMAL, decision.mode());
    }

    @Test
    void systemPropertyTakesPrecedenceOverEnvironment() {
        StartupDecision decision = new StartupModePropertyProbe().decide(
                new String[0], "full_setup_gated", "setup_only");

        assertEquals(RuntimeMode.FULL_SETUP_GATED, decision.mode());
    }

    @Test
    void environmentSelectsSetupOnlyWhenSystemPropertyIsMissing() {
        StartupDecision decision = new StartupModePropertyProbe().decide(new String[0], null, "setup_only");

        assertEquals(RuntimeMode.SETUP_ONLY, decision.mode());
    }

    @Test
    void invalidOverrideFailsClosedForCoordinatorRecovery() {
        StartupModePropertyProbe probe = new StartupModePropertyProbe();

        assertThrows(IllegalArgumentException.class,
                () -> probe.decide(new String[0], "unsupported", null));
    }

    @Test
    void missingOverrideDelegatesToInstallationProbe() {
        StartupDecision expected = StartupDecision.recovery();
        StartupDecisionProbe fallback = ignored -> expected;

        assertEquals(expected, new StartupModePropertyProbe(fallback).decide(new String[0], null, null));
    }
}
