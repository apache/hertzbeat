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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import org.junit.jupiter.api.Test;

/**
 * Same-run runtime control admission tests.
 */
class AgentRuntimeControlRegistryTest {

    @Test
    void duplicateRegistrationShouldNotReplaceTheFirstControl() throws Exception {
        AgentRuntimeControlRegistry registry = new AgentRuntimeControlRegistry();
        AgentRuntimeControl first = new AgentRuntimeControl("trace-1", "run-1", Clock.systemUTC());
        AgentRuntimeControl duplicate = new AgentRuntimeControl("trace-2", "run-1", Clock.systemUTC());

        try (AutoCloseable ignored = registry.register(first)) {
            assertThrows(IllegalStateException.class, () -> registry.register(duplicate));

            assertTrue(registry.cancel("run-1", "stop first"));
            assertTrue(first.isStopRequested());
            assertFalse(duplicate.isStopRequested());
        }
    }
}
