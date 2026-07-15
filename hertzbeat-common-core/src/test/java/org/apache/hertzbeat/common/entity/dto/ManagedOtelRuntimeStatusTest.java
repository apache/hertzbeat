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

package org.apache.hertzbeat.common.entity.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class ManagedOtelRuntimeStatusTest {

    @Test
    void acceptsBoundedVersionedRuntimeStatus() {
        ManagedOtelRuntimeStatus status = new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                12,
                11,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                2,
                Instant.parse("2026-07-15T06:00:00Z"),
                "recovered with last-known-good"
        );

        assertEquals(12, status.desiredRevision());
        assertEquals(11, status.activeRevision());
    }

    @Test
    void rejectsInvalidOrUnboundedDiagnostics() {
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeStatus(
                99,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                1,
                1,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                Instant.now(),
                ""
        ));
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                true,
                ManagedOtelRuntimeStatus.RuntimeState.FAILED,
                1,
                0,
                ManagedOtelRuntimeStatus.IntakeCredentialState.MISSING,
                1,
                Instant.now(),
                "x".repeat(513)
        ));
    }
}
