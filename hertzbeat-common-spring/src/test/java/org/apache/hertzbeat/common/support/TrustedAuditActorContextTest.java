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

package org.apache.hertzbeat.common.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;

class TrustedAuditActorContextTest {

    @Test
    void nestedAndExceptionalScopesRestorePreviousActor() {
        assertFalse(TrustedAuditActorContext.isBound());
        try (var outer = TrustedAuditActorContext.bind("operator-a")) {
            assertThrows(IllegalStateException.class, () -> {
                try (var inner = TrustedAuditActorContext.bind("operator-b")) {
                    assertEquals("operator-b", TrustedAuditActorContext.currentActor().orElseThrow());
                    throw new IllegalStateException("handler failed");
                }
            });
            assertEquals("operator-a", TrustedAuditActorContext.currentActor().orElseThrow());
            try (var anonymous = TrustedAuditActorContext.bind(null)) {
                assertTrue(TrustedAuditActorContext.isBound());
                assertTrue(TrustedAuditActorContext.currentActor().isEmpty());
            }
            assertEquals("operator-a", TrustedAuditActorContext.currentActor().orElseThrow());
        }
        assertFalse(TrustedAuditActorContext.isBound());
    }

    @Test
    void reusedThreadDoesNotRetainActorOrInheritParentScope() throws Exception {
        try (var executor = Executors.newSingleThreadExecutor();
                var parent = TrustedAuditActorContext.bind("parent")) {
            assertFalse(executor.submit(TrustedAuditActorContext::isBound).get());
            executor.submit(() -> {
                try (var actor = TrustedAuditActorContext.bind("operator-a")) {
                    assertEquals("operator-a", TrustedAuditActorContext.currentActor().orElseThrow());
                }
            }).get();
            assertFalse(executor.submit(TrustedAuditActorContext::isBound).get());
            assertEquals("parent", TrustedAuditActorContext.currentActor().orElseThrow());
        }
    }
}
