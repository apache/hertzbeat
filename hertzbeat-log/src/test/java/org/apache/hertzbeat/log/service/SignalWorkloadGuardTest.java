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

package org.apache.hertzbeat.log.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard.Limits;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard.Workload;
import org.junit.jupiter.api.Test;

/** Tests bounded signal workload isolation and recovery. */
class SignalWorkloadGuardTest {

    @Test
    void shouldRejectOverflowAndRecoverAfterPressureStops() throws Exception {
        SignalWorkloadGuard guard = new SignalWorkloadGuard(Map.of(Workload.METRICS, new Limits(1, 1)));
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<String> active = executor.submit(() -> guard.execute(Workload.METRICS, () -> {
                entered.countDown();
                try {
                    release.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
                return "done";
            }));
            entered.await();

            assertThrows(SignalQueryRejectedException.class,
                    () -> guard.execute(Workload.METRICS, () -> "overflow"));

            release.countDown();
            assertEquals("done", active.get());
            assertEquals("recovered", guard.execute(Workload.METRICS, () -> "recovered"));
        } finally {
            executor.shutdownNow();
        }
    }
}
