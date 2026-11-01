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

package org.apache.hertzbeat.common.entity.job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

class InlineCollectionPermitConcurrencyTest {
    @Test
    void concurrentConsumersHaveExactlyOneWinner() throws Exception {
        var p =
                new InlineCollectionPermit(
                        List.of("bash", "-c", "printf fixture"),
                        "/tmp",
                        InlineCollectionPermit.processAccount(),
                        System.getProperty("os.name"),
                        System.currentTimeMillis() + 10000,
                        Clock.systemUTC(),
                        () -> true);
        var start = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(8)) {
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int i = 0; i < 8; i++)
                tasks.add(
                        workers.submit(
                                () -> {
                                    start.await();
                                    try {
                                        p.consume(List.of("bash", "-c", "printf fixture"), "/tmp");
                                        return true;
                                    } catch (IllegalStateException denied) {
                                        return false;
                                    }
                                }));
            start.countDown();
            int winners = 0;
            for (var task : tasks) if (task.get()) winners++;
            assertEquals(1, winners);
            assertFalse(p.started());
        }
    }

    @Test
    void expiryDuringGrantValidationCannotWinAndExpiredAssociationDoesNotDisappear() {
        var now = new AtomicLong();
        Clock clock =
                new Clock() {
                    public ZoneId getZone() {
                        return ZoneOffset.UTC;
                    }

                    public Clock withZone(ZoneId zone) {
                        return this;
                    }

                    public Instant instant() {
                        return Instant.ofEpochMilli(now.get());
                    }
                };
        var p =
                new InlineCollectionPermit(
                        List.of("bash", "-c", "printf fixture"),
                        "/tmp",
                        InlineCollectionPermit.processAccount(),
                        System.getProperty("os.name"),
                        100,
                        clock,
                        () -> {
                            now.set(100);
                            return true;
                        });
        var m = Metrics.builder().name("fixture").build();
        InlineCollectionPermit.bind(m, p);
        assertThrows(
                IllegalStateException.class,
                () -> p.consume(List.of("bash", "-c", "printf fixture"), "/tmp"));
        assertSame(p, InlineCollectionPermit.find(m));
        assertFalse(p.consumed());
    }

    @Test
    void serializedJobsCannotCarryProcessCapability() {
        var m = Metrics.builder().name("fixture").build();
        String before = org.apache.hertzbeat.common.util.JsonUtil.toJson(m);
        var p =
                new InlineCollectionPermit(
                        List.of("bash", "-c", "printf fixture"),
                        "/tmp",
                        InlineCollectionPermit.processAccount(),
                        System.getProperty("os.name"),
                        System.currentTimeMillis() + 10000,
                        Clock.systemUTC(),
                        () -> true);
        InlineCollectionPermit.bind(m, p);
        assertEquals(before, org.apache.hertzbeat.common.util.JsonUtil.toJson(m));
        var clone = Job.builder().metrics(List.of(m)).build().clone();
        org.junit.jupiter.api.Assertions.assertNull(
                InlineCollectionPermit.find(clone.getMetrics().getFirst()));
    }
}
