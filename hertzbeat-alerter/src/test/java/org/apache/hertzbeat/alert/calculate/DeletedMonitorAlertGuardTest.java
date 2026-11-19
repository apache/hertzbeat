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

package org.apache.hertzbeat.alert.calculate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

/**
 * Tests for deleted-monitor alert suppression.
 */
class DeletedMonitorAlertGuardTest {

    @Test
    void markDeletedSuppressesOnlyThatMonitorUntilRetentionExpires() {
        AtomicLong now = new AtomicLong(1_000L);
        DeletedMonitorAlertGuard guard = new DeletedMonitorAlertGuard(10L, now::get);

        guard.markDeleted(42L);
        guard.markDeleted(0L);

        assertTrue(guard.isDeleted(42L));
        assertFalse(guard.isDeleted(7L));
        assertFalse(guard.isDeleted(0L));

        now.addAndGet(11L);
        assertFalse(guard.isDeleted(42L));
    }

    @Test
    void allowAllNeverSuppresses() {
        DeletedMonitorAlertGuard guard = DeletedMonitorAlertGuard.allowAll();

        guard.markDeleted(42L);

        assertFalse(guard.isDeleted(42L));
    }
}
