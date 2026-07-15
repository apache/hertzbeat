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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Test;

class OtelRuntimeStatusProviderTest {

    @Test
    void reportsLifecycleRevisionsAndLocalCredentialPresence() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setConfigRevision(12);
        properties.setToken("managed-intake-token");
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.RUNNING, 42, 2, Instant.parse("2026-07-15T06:00:00Z"), ""));
        when(supervisor.activeRevision()).thenReturn(11L);
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(properties, supervisor);

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, status.state());
        assertEquals(12, status.desiredRevision());
        assertEquals(11, status.activeRevision());
        assertEquals(ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                status.intakeCredentialState());
    }

    @Test
    void disabledRuntimeDoesNotRequireIntakeCredential() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        OtelRuntimeSupervisor supervisor = mock(OtelRuntimeSupervisor.class);
        when(supervisor.snapshot()).thenReturn(new OtelRuntimeSnapshot(
                OtelRuntimeState.STOPPED, -1, 0, Instant.parse("2026-07-15T06:00:00Z"), ""));
        OtelRuntimeStatusProvider provider = new OtelRuntimeStatusProvider(properties, supervisor);

        ManagedOtelRuntimeStatus status = provider.status();

        assertEquals(ManagedOtelRuntimeStatus.IntakeCredentialState.NOT_REQUIRED,
                status.intakeCredentialState());
    }
}
