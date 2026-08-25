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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

/** Current authority verification for canonical entity-monitor metric targets. */
class EntityMonitorMetricTargetVerifierTest {

    private final EntityMonitorMetricTargetCanonicalizer canonicalizer =
            mock(EntityMonitorMetricTargetCanonicalizer.class);
    private final EntityMonitorMetricTargetVerifier verifier =
            new EntityMonitorMetricTargetVerifier(canonicalizer);

    @Test
    void exactCurrentSnapshotShouldVerifyWhileAnyAuthorityDriftFailsClosed() {
        var expected = target("hash-a");
        when(canonicalizer.canonicalize("workspace-a", intent())).thenReturn(expected, target("hash-b"));

        assertTrue(verifier.verify("workspace-a", expected));
        assertFalse(verifier.verify("workspace-a", expected));
    }

    @Test
    void runtimeAndOrdinaryErrorsShouldFailClosedButFatalErrorsMustPropagate() {
        var expected = target("hash-a");
        when(canonicalizer.canonicalize("workspace-a", intent()))
                .thenThrow(new IllegalStateException("internal detail"))
                .thenThrow(new AssertionError("internal detail"))
                .thenThrow(new LinkageError("fatal"));

        assertFalse(verifier.verify("workspace-a", expected));
        assertFalse(verifier.verify("workspace-a", expected));
        assertThrows(LinkageError.class, () -> verifier.verify("workspace-a", expected));
    }

    @Test
    void interruptedThreadShouldFailClosedWithoutClearingInterruptFlag() {
        Thread.currentThread().interrupt();
        try {
            assertFalse(verifier.verify("workspace-a", target("hash-a")));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
        when(canonicalizer.canonicalize("workspace-a", intent())).thenAnswer(ignored -> {
            Thread.currentThread().interrupt();
            return target("hash-a");
        });
        try {
            assertFalse(verifier.verify("workspace-a", target("hash-a")));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    private EntityMonitorMetricTargetCanonicalizer.SourceIntent intent() {
        return new EntityMonitorMetricTargetCanonicalizer.SourceIntent(
                42L, "metrics", "basic.qps", 1_000L, 2_000L, "UTC");
    }

    private EntityMonitorMetricTargetCanonicalizer.CanonicalTarget target(String hash) {
        return new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget(
                EntityMonitorMetricTargetCanonicalizer.TARGET_VERSION, 7L, 42L,
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity("checkout", "commerce", "prod"),
                new EntityMonitorMetricTargetCanonicalizer.CanonicalSignal(
                        "metrics", "basic.qps", 1_000L, 2_000L, "UTC"),
                new EntityMonitorMetricTargetCanonicalizer.Authority(11L, "2026-08-15T00:00", hash));
    }
}
