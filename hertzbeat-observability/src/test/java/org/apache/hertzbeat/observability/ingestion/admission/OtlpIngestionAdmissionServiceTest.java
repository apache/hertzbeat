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

package org.apache.hertzbeat.observability.ingestion.admission;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.grpc.Context;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.junit.jupiter.api.Test;

class OtlpIngestionAdmissionServiceTest {

    @Test
    void rejectsImmediatelyWhenConcurrencyIsFullAndRecoversAfterCompletion() throws Exception {
        OtlpIngestionAdmissionService service = new OtlpIngestionAdmissionService(1, 0, Duration.ofMillis(50));
        CountDownLatch operationStarted = new CountDownLatch(1);
        CountDownLatch releaseOperation = new CountDownLatch(1);
        AtomicReference<Throwable> operationFailure = new AtomicReference<>();
        Thread activeRequest = startRequest(service, "metrics", operationStarted, releaseOperation, operationFailure);

        assertTrue(operationStarted.await(1, TimeUnit.SECONDS));
        long startedAt = System.nanoTime();
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.execute("metrics", () -> "rejected"));
        long elapsedMillis = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertEquals("1", OtlpIngestionBackpressureHeaders.retryAfter(exception));
        assertTrue(elapsedMillis < 250, "A full admission lane must reject without waiting");

        releaseOperation.countDown();
        activeRequest.join(1_000);
        assertFalse(activeRequest.isAlive());
        assertNull(operationFailure.get());
        assertEquals("recovered", service.execute("metrics", () -> "recovered"));
    }

    @Test
    void boundsQueueWaitBeforeRejecting() throws Exception {
        OtlpIngestionAdmissionService service = new OtlpIngestionAdmissionService(1, 1, Duration.ofMillis(50));
        CountDownLatch operationStarted = new CountDownLatch(1);
        CountDownLatch releaseOperation = new CountDownLatch(1);
        AtomicReference<Throwable> operationFailure = new AtomicReference<>();
        Thread activeRequest = startRequest(service, "logs", operationStarted, releaseOperation, operationFailure);

        assertTrue(operationStarted.await(1, TimeUnit.SECONDS));
        long startedAt = System.nanoTime();
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.execute("logs", () -> "timed-out"));
        long elapsedMillis = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, exception.getStatus().getCode());
        assertTrue(elapsedMillis >= 25, "A queued request should get a short opportunity to run");
        assertTrue(elapsedMillis < 500, "Queue waiting must remain bounded");

        releaseOperation.countDown();
        activeRequest.join(1_000);
        assertFalse(activeRequest.isAlive());
        assertNull(operationFailure.get());
    }

    @Test
    void interruptionCancelsQueuedRequestWithoutLeakingCapacity() throws Exception {
        OtlpIngestionAdmissionService service = new OtlpIngestionAdmissionService(1, 1, Duration.ofSeconds(5));
        CountDownLatch operationStarted = new CountDownLatch(1);
        CountDownLatch releaseOperation = new CountDownLatch(1);
        AtomicReference<Throwable> operationFailure = new AtomicReference<>();
        Thread activeRequest = startRequest(service, "traces", operationStarted, releaseOperation, operationFailure);
        assertTrue(operationStarted.await(1, TimeUnit.SECONDS));

        AtomicReference<Throwable> queuedFailure = new AtomicReference<>();
        Thread queuedRequest = Thread.ofVirtual().start(() -> {
            try {
                service.execute("traces", () -> "queued");
            } catch (Throwable throwable) {
                queuedFailure.set(throwable);
            }
        });
        await().atMost(Duration.ofSeconds(1)).until(() -> isWaiting(queuedRequest));

        queuedRequest.interrupt();
        queuedRequest.join(1_000);
        assertFalse(queuedRequest.isAlive());
        StatusRuntimeException exception = (StatusRuntimeException) queuedFailure.get();
        assertEquals(Status.Code.CANCELLED, exception.getStatus().getCode());

        releaseOperation.countDown();
        activeRequest.join(1_000);
        assertFalse(activeRequest.isAlive());
        assertNull(operationFailure.get());
        assertEquals("recovered", service.execute("traces", () -> "recovered"));
    }

    @Test
    void grpcContextCancellationRemovesQueuedRequest() throws Exception {
        OtlpIngestionAdmissionService service = new OtlpIngestionAdmissionService(1, 1, Duration.ofSeconds(5));
        CountDownLatch operationStarted = new CountDownLatch(1);
        CountDownLatch releaseOperation = new CountDownLatch(1);
        AtomicReference<Throwable> operationFailure = new AtomicReference<>();
        Thread activeRequest = startRequest(service, "logs", operationStarted, releaseOperation, operationFailure);
        assertTrue(operationStarted.await(1, TimeUnit.SECONDS));

        AtomicReference<Throwable> queuedFailure = new AtomicReference<>();
        Context.CancellableContext context = Context.current().withCancellation();
        Thread queuedRequest = Thread.ofVirtual().start(() -> context.run(() -> {
            try {
                service.execute("logs", () -> "queued");
            } catch (Throwable throwable) {
                queuedFailure.set(throwable);
            }
        }));
        await().atMost(Duration.ofSeconds(1)).until(() -> isWaiting(queuedRequest));

        context.cancel(null);
        queuedRequest.join(250);
        boolean cancelledPromptly = !queuedRequest.isAlive();
        if (queuedRequest.isAlive()) {
            queuedRequest.interrupt();
        }
        releaseOperation.countDown();
        queuedRequest.join(1_000);
        activeRequest.join(1_000);

        assertTrue(cancelledPromptly, "A cancelled gRPC request must leave the admission queue promptly");
        StatusRuntimeException exception = (StatusRuntimeException) queuedFailure.get();
        assertEquals(Status.Code.CANCELLED, exception.getStatus().getCode());
        assertFalse(activeRequest.isAlive());
        assertNull(operationFailure.get());
        assertEquals("recovered", service.execute("logs", () -> "recovered"));
    }

    @Test
    void isolatesSignalAdmissionLanes() throws Exception {
        OtlpIngestionAdmissionService service = new OtlpIngestionAdmissionService(1, 0, Duration.ZERO);
        CountDownLatch operationStarted = new CountDownLatch(1);
        CountDownLatch releaseOperation = new CountDownLatch(1);
        AtomicReference<Throwable> operationFailure = new AtomicReference<>();
        Thread activeRequest = startRequest(service, "metrics", operationStarted, releaseOperation, operationFailure);

        assertTrue(operationStarted.await(1, TimeUnit.SECONDS));
        assertEquals("logs-accepted", service.execute("logs", () -> "logs-accepted"));

        releaseOperation.countDown();
        activeRequest.join(1_000);
        assertFalse(activeRequest.isAlive());
        assertNull(operationFailure.get());
    }

    private Thread startRequest(OtlpIngestionAdmissionService service, String signal,
                                CountDownLatch operationStarted, CountDownLatch releaseOperation,
                                AtomicReference<Throwable> failure) {
        return Thread.ofVirtual().start(() -> {
            try {
                service.execute(signal, () -> {
                    operationStarted.countDown();
                    awaitRelease(releaseOperation);
                    return "completed";
                });
            } catch (Throwable throwable) {
                failure.set(throwable);
            }
        });
    }

    private void awaitRelease(CountDownLatch releaseOperation) {
        try {
            releaseOperation.await();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Active test operation was interrupted", exception);
        }
    }

    private boolean isWaiting(Thread thread) {
        return thread.getState() == Thread.State.WAITING || thread.getState() == Thread.State.TIMED_WAITING;
    }
}
