/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.ServerAvailability.AVAILABLE;
import static org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.ServerAvailability.UNAVAILABLE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpTimeoutException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.warehouse.store.history.tsdb.WarehouseStorageProbeException;
import org.junit.jupiter.api.Test;

class GreptimeServerAvailabilityProbeTest {

    @Test
    void cachesConnectionRefusalThenRecoversAfterTheShortExpiry() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-23T00:00:00Z"));
        AtomicInteger attempts = new AtomicInteger();
        AtomicReference<URI> observedUri = new AtomicReference<>();
        AtomicReference<Duration> observedTimeout = new AtomicReference<>();
        GreptimeServerAvailabilityProbe probe = new GreptimeServerAvailabilityProbe(
                "http://127.0.0.1:4000/",
                clock,
                Duration.ofSeconds(5),
                (uri, timeout) -> {
                    observedUri.set(uri);
                    observedTimeout.set(timeout);
                    if (attempts.getAndIncrement() == 0) {
                        throw new ConnectException("connection refused at private endpoint");
                    }
                    return 200;
                });

        assertEquals(UNAVAILABLE, probe.current());
        assertEquals(UNAVAILABLE, probe.current());
        assertEquals(1, attempts.get());
        assertEquals("/health", observedUri.get().getPath());
        assertEquals(Duration.ofSeconds(1), observedTimeout.get());

        clock.advance(Duration.ofSeconds(6));
        assertEquals(AVAILABLE, probe.current());
        assertEquals(AVAILABLE, probe.current());
        assertEquals(2, attempts.get());
    }

    @Test
    void treatsTimeoutAndServerFailureAsUnavailableButRejectsBrokenProbeResponses() {
        MutableClock clock = new MutableClock(Instant.parse("2026-07-23T00:00:00Z"));
        GreptimeServerAvailabilityProbe timeoutProbe = new GreptimeServerAvailabilityProbe(
                "http://127.0.0.1:4000",
                clock,
                Duration.ZERO,
                (uri, timeout) -> {
                    throw new HttpTimeoutException("private endpoint timed out");
                });
        GreptimeServerAvailabilityProbe serverFailureProbe = new GreptimeServerAvailabilityProbe(
                "http://127.0.0.1:4000",
                clock,
                Duration.ZERO,
                (uri, timeout) -> 503);
        GreptimeServerAvailabilityProbe brokenContractProbe = new GreptimeServerAvailabilityProbe(
                "http://127.0.0.1:4000",
                clock,
                Duration.ZERO,
                (uri, timeout) -> 404);

        assertEquals(UNAVAILABLE, timeoutProbe.current());
        assertEquals(UNAVAILABLE, serverFailureProbe.current());
        WarehouseStorageProbeException failure = assertThrows(
                WarehouseStorageProbeException.class, brokenContractProbe::current);
        assertEquals("Warehouse storage availability probe failed", failure.getMessage());
        assertFalse(failure.getMessage().contains("127.0.0.1"));
    }

    private static final class MutableClock extends Clock {

        private Instant current;

        private MutableClock(Instant current) {
            this.current = current;
        }

        void advance(Duration duration) {
            current = current.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }
}
