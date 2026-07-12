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

package org.apache.hertzbeat.collector.collect.common.ssh;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.common.base.Ticker;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Tests for {@link SshCircuitBreaker}.
 */
class SshCircuitBreakerTest {

    private TestTicker ticker;
    private SshCircuitBreaker circuitBreaker;
    private SshCircuitBreaker.Target target;

    @BeforeEach
    void setUp() {
        ticker = new TestTicker();
        circuitBreaker = new SshCircuitBreaker(3, Duration.ofMinutes(5), ticker);
        target = circuitBreaker.buildTarget(
                "127.0.0.1", "22", "root", List.of("target-password", "bad-password"));
    }

    @Test
    void opensAfterThresholdAndExpiresAfterCooldown() {
        circuitBreaker.recordFailure(target);
        circuitBreaker.recordFailure(target);
        assertDoesNotThrow(() -> circuitBreaker.checkOpen(target));

        circuitBreaker.recordFailure(target);
        assertThrows(IOException.class, () -> circuitBreaker.checkOpen(target));

        ticker.advance(Duration.ofMinutes(5).plusNanos(1));
        assertDoesNotThrow(() -> circuitBreaker.checkOpen(target));
    }

    @Test
    void successAndCredentialChangeBypassPreviousFailures() {
        circuitBreaker.recordFailure(target);
        circuitBreaker.recordFailure(target);
        circuitBreaker.recordFailure(target);

        SshCircuitBreaker.Target correctedCredentials = circuitBreaker.buildTarget(
                "127.0.0.1", "22", "root", List.of("target-password", "correct-password"));
        assertNotEquals(target, correctedCredentials);
        assertDoesNotThrow(() -> circuitBreaker.checkOpen(correctedCredentials));

        circuitBreaker.recordSuccess(target);
        assertDoesNotThrow(() -> circuitBreaker.checkOpen(target));
    }

    @Test
    void equalTargetsShareConnectionLockWithoutExposingCredentials() {
        SshCircuitBreaker.Target equalTarget = circuitBreaker.buildTarget(
                "127.0.0.1", "22", "root", List.of("target-password", "bad-password"));

        assertSame(circuitBreaker.connectionLock(target), circuitBreaker.connectionLock(equalTarget));
        assertEquals("root@127.0.0.1:22", target.toString());
    }

    @Test
    void rejectsInvalidConfiguration() {
        assertThrows(IllegalArgumentException.class,
                () -> new SshCircuitBreaker(0, Duration.ofMinutes(5), ticker));
        assertThrows(IllegalArgumentException.class,
                () -> new SshCircuitBreaker(3, Duration.ZERO, ticker));
        assertThrows(IllegalArgumentException.class,
                () -> new SshCircuitBreaker(3, Duration.ofSeconds(-1), ticker));
    }

    private static final class TestTicker extends Ticker {

        private final AtomicLong nanos = new AtomicLong();

        @Override
        public long read() {
            return nanos.get();
        }

        private void advance(Duration duration) {
            nanos.addAndGet(duration.toNanos());
        }
    }
}
