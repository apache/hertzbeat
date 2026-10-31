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

package org.apache.hertzbeat.common.observability.dto.log;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LogRepeatedErrorsTest {
    private final LogRepeatedErrors.Scope scope = new LogRepeatedErrors.Scope("workspace-a", 1000, 901000, "service", "prod");


    @Test void rejectsUnboundedOrUntrustedScopes() {
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Scope("", 0, 1, null, null));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Scope("a", 0, 900001, null, null));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Scope("a", 1, 1, null, null));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Scope("a", 0, 1, "bad\nservice", null));
    }

    @Test void preservesExactMessagesAndWorkspaceIdentity() {
        var key = LogRepeatedErrors.groupKey(scope, "service", "prod", "error 123");
        assertNotEquals(key, LogRepeatedErrors.groupKey(scope, "service", "prod", "error 124"));
        assertNotEquals(key, LogRepeatedErrors.groupKey(new LogRepeatedErrors.Scope("b", 1000, 901000, "service", "prod"), "service", "prod", "error 123"));
        assertEquals(key, LogRepeatedErrors.groupKey(scope, "service", "prod", "error 123"));
        assertNotEquals(LogRepeatedErrors.groupKey(scope, "a", "bc", "d"), LogRepeatedErrors.groupKey(scope, "ab", "c", "d"));
    }

    @Test void acceptsValidEmptyWindowButNeverFakeUnavailableZeros() {
        assertEquals("window", new LogRepeatedErrors.Result("ready", scope, "window", 0L, List.of()).coverage());
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("unavailable", scope, "window", 0L, List.of()));
        assertNull(LogRepeatedErrors.unavailable("over_budget", scope).matchingEvents());
    }

    @Test void rejectsContradictoryCoverageAndCounts() {
        var group = group(3, 1000);
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("ready", scope, "bounded", 3L, List.of(group)));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("ready", scope, "window", 2L, List.of(group)));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("ready", scope, "window", 10001L, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("ready", scope, "window", 3L, List.of(group, group)));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Result("ready", scope, "window", 3L, List.of(group(3, 999))));
    }

    @Test void selectionDoesNotCarryMessagesOrPermitArbitraryIdentities() {
        new LogRepeatedErrors.Selection("a".repeat(64), "record-1");
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Selection("a".repeat(64), "_record"));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Selection("a".repeat(64), "' OR 1=1"));
        assertThrows(IllegalArgumentException.class, () -> new LogRepeatedErrors.Selection("a", "record-1"));
    }

    private LogRepeatedErrors.Group group(long count, long time) {
        return new LogRepeatedErrors.Group("a".repeat(64), "service", "prod", count, time, "Repeated error", "record-1");
    }
}
