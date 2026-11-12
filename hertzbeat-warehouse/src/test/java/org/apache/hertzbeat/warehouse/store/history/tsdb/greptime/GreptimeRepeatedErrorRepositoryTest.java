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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GreptimeRepeatedErrorRepositoryTest {
    private final LogRepeatedErrors.Scope scope = new LogRepeatedErrors.Scope("workspace", 1000, 901000, null, null);

    @Test
    void leavesOptionalReadPathUnsupportedWhenNotConfigured() {
        try (var guard = guard(Duration.ofSeconds(1))) {
            var reader = new GreptimeRepeatedErrorRepository(null, guard);
            assertEquals("unsupported", reader.summary(scope).state());
        }
    }

    @Test
    void endpointCannotOverrideScopeCredentialsBindingOrDeadlines() {
        var properties = new GreptimeProperties(true, "127.0.0.1:14101", "http://127.0.0.1:14100",
                "public", "greptime", null, null);
        try (var guard = guard(Duration.ofSeconds(1))) {
            for (var url : java.util.List.of("jdbc:postgresql://127.0.0.1:14103/other",
                    "jdbc:postgresql://user@127.0.0.1:14103/public",
                    "jdbc:postgresql://127.0.0.1:14103/public?preferQueryMode=%73imple",
                    "jdbc:postgresql://127.0.0.1:14103/public?socketTimeout=0",
                    "jdbc:postgresql://127.0.0.1:14103/public?user=other")) {
                assertThrows(IllegalArgumentException.class, () -> new GreptimeRepeatedErrorRepository(properties, guard, url));
            }
            new GreptimeRepeatedErrorRepository(properties, guard, "jdbc:postgresql://127.0.0.1:14103/public?sslmode=require");
        }
    }

    @Test
    void closesConnectionWhenPreparationFailsAndAllowsRetry() throws Exception {
        var connection = mock(Connection.class);
        when(connection.prepareStatement(org.mockito.ArgumentMatchers.anyString())).thenThrow(new SQLException("private"));
        try (var guard = guard(Duration.ofSeconds(1))) {
            var reader = new GreptimeRepeatedErrorRepository(() -> connection, guard);
            assertEquals("unavailable", reader.summary(scope).state());
            verify(connection).close();
            assertEquals("unavailable", reader.summary(scope).state());
            verify(connection, org.mockito.Mockito.times(2)).close();
        }
    }

    @Test
    void summaryDoesNotExposeConventionalCredentialValues() {
        assertEquals("password=[redacted] Bearer [redacted] failure 123",
                GreptimeRepeatedErrorRepository.safeSummary("password=secret Bearer abc123\nfailure 123"));
        assertEquals(240, GreptimeRepeatedErrorRepository.safeSummary("x".repeat(500)).length());
    }

    @Test
    void timeoutRetainsAdmissionUntilWorkerActuallyExits() throws Exception {
        var release = new CountDownLatch(1);
        var entered = new AtomicInteger();
        var exited = new CountDownLatch(2);
        try (var guard = guard(Duration.ofMillis(40))) {
            var reader = new GreptimeRepeatedErrorRepository(() -> {
                entered.incrementAndGet();
                try {
                    while (true) {
                        try {
                            release.await();
                            break;
                        } catch (InterruptedException interrupted) {
                            // JDBC cancellation can return before network work exits.
                        }
                    }
                    throw new SQLException("blocked connection failed");
                } finally {
                    exited.countDown();
                }
            }, guard);
            try {
                assertEquals("unavailable", reader.summary(scope).state());
                assertEquals("unavailable", reader.summary(scope).state());
                assertEquals("over_budget", reader.summary(scope).state());
                assertEquals(2, entered.get());
            } finally {
                release.countDown();
                assertTrue(exited.await(1, TimeUnit.SECONDS));
            }
        }
    }

    private static GreptimeQueryGuard guard(Duration timeout) {
        return new GreptimeQueryGuard(4, timeout, Duration.ZERO);
    }
}
