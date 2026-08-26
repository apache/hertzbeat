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

package org.apache.hertzbeat.warehouse.query.admission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class ObservabilityQueryAdmissionServiceTest {

    @AfterEach
    void clearContext() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void preservesAllRequestContextOnTheCallingThread() {
        ObservabilityQueryAdmissionService service = service(1, 0, Duration.ZERO);
        AuthTokenRequestContext.bindWorkspaceId("workspace-a");
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("workspace-authenticated");
        AuthTokenRequestContext.bindCollectorId("collector-a");
        Thread requestThread = Thread.currentThread();

        assertEquals("workspace-a|workspace-authenticated|collector-a|true", service.execute("logs", () ->
                AuthTokenRequestContext.currentWorkspaceId() + "|"
                        + AuthTokenRequestContext.currentAuthenticatedWorkspaceId() + "|"
                        + AuthTokenRequestContext.currentCollectorId() + "|"
                        + (Thread.currentThread() == requestThread)));
    }

    @Test
    void rejectsFullLaneAndRecoversAfterActiveQueryCompletes() throws Exception {
        ObservabilityQueryAdmissionService service = service(1, 0, Duration.ZERO);
        CountDownLatch queryStarted = new CountDownLatch(1);
        CountDownLatch releaseQuery = new CountDownLatch(1);
        Thread activeRequest = startBlockingQuery(service, "metrics", queryStarted, releaseQuery);
        assertTrue(queryStarted.await(1, TimeUnit.SECONDS));

        ObservabilityQueryAdmissionException exception = assertThrows(
                ObservabilityQueryAdmissionException.class,
                () -> service.execute("metrics", () -> "rejected"));

        assertEquals(ObservabilityQueryAdmissionException.Reason.OVERLOADED, exception.getReason());
        assertEquals("metrics", exception.getSignal());
        releaseQuery.countDown();
        activeRequest.join(1_000);
        assertFalse(activeRequest.isAlive());
        assertEquals("recovered", service.execute("metrics", () -> "recovered"));
    }

    @Test
    void boundsQueueWaitAndNeverRunsExpiredOperation() throws Exception {
        ObservabilityQueryAdmissionService service = service(1, 1, Duration.ofMillis(50));
        CountDownLatch queryStarted = new CountDownLatch(1);
        CountDownLatch releaseQuery = new CountDownLatch(1);
        Thread activeRequest = startBlockingQuery(service, "logs", queryStarted, releaseQuery);
        assertTrue(queryStarted.await(1, TimeUnit.SECONDS));
        AtomicReference<String> result = new AtomicReference<>();
        long startedAt = System.nanoTime();

        ObservabilityQueryAdmissionException exception = assertThrows(
                ObservabilityQueryAdmissionException.class,
                () -> service.execute("logs", () -> {
                    result.set("ran");
                    return "late";
                }));
        long elapsedMillis = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();

        assertEquals(ObservabilityQueryAdmissionException.Reason.OVERLOADED, exception.getReason());
        assertTrue(elapsedMillis >= 25 && elapsedMillis < 500);
        assertNull(result.get());
        releaseQuery.countDown();
        activeRequest.join(1_000);
    }

    @Test
    void isolatesMetricsLogsTracesAndTopologyLanes() throws Exception {
        ObservabilityQueryAdmissionService service = service(1, 0, Duration.ZERO);
        CountDownLatch queryStarted = new CountDownLatch(1);
        CountDownLatch releaseQuery = new CountDownLatch(1);
        Thread activeRequest = startBlockingQuery(service, "metrics", queryStarted, releaseQuery);
        assertTrue(queryStarted.await(1, TimeUnit.SECONDS));

        assertEquals("logs", service.execute("logs", () -> "logs"));
        assertEquals("traces", service.execute("traces", () -> "traces"));
        assertEquals("topology", service.execute("topology", () -> "topology"));

        releaseQuery.countDown();
        activeRequest.join(1_000);
    }

    @Test
    void releasesCapacityWhenQueryFails() {
        ObservabilityQueryAdmissionService service = service(1, 0, Duration.ZERO);

        assertThrows(IllegalStateException.class,
                () -> service.execute("traces", () -> {
                    throw new IllegalStateException("query failed");
                }));

        assertEquals("recovered", service.execute("traces", () -> "recovered"));
    }

    @Test
    void interruptionWhileWaitingPreservesInterruptAndReleasesQueueCapacity() throws Exception {
        ObservabilityQueryAdmissionService service = service(1, 1, Duration.ofSeconds(5));
        CountDownLatch queryStarted = new CountDownLatch(1);
        CountDownLatch releaseQuery = new CountDownLatch(1);
        Thread activeRequest = startBlockingQuery(service, "topology", queryStarted, releaseQuery);
        assertTrue(queryStarted.await(1, TimeUnit.SECONDS));
        AtomicReference<Throwable> failure = new AtomicReference<>();
        AtomicReference<Boolean> interrupted = new AtomicReference<>(false);
        Thread queuedRequest = Thread.ofVirtual().start(() -> {
            try {
                service.execute("topology", () -> "unexpected");
            } catch (Throwable throwable) {
                failure.set(throwable);
                interrupted.set(Thread.currentThread().isInterrupted());
            }
        });

        queuedRequest.interrupt();
        queuedRequest.join(1_000);

        ObservabilityQueryAdmissionException exception =
                (ObservabilityQueryAdmissionException) failure.get();
        assertEquals(ObservabilityQueryAdmissionException.Reason.CANCELLED, exception.getReason());
        assertTrue(interrupted.get());
        releaseQuery.countDown();
        activeRequest.join(1_000);
        assertEquals("recovered", service.execute("topology", () -> "recovered"));
    }

    private ObservabilityQueryAdmissionService service(
            int maxConcurrentRequests, int queueCapacity, Duration maxQueueWait) {
        return new ObservabilityQueryAdmissionService(
                maxConcurrentRequests, maxConcurrentRequests, maxConcurrentRequests, maxConcurrentRequests,
                queueCapacity, maxQueueWait);
    }

    private Thread startBlockingQuery(
            ObservabilityQueryAdmissionService service,
            String signal,
            CountDownLatch queryStarted,
            CountDownLatch releaseQuery) {
        return Thread.ofVirtual().start(() -> service.execute(signal, () -> {
            queryStarted.countDown();
            try {
                releaseQuery.await();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Test query interrupted", exception);
            }
            return "completed";
        }));
    }
}
