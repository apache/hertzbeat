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

package org.apache.hertzbeat.collector.dispatch.entrance.internal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Interrupt cleanup cannot consume a late response or lose cancellation at the native write gate.
 */
class CollectJobServiceCancellationTest {
    @Test
    void interruptionRestoresFlagRemovesWaiterAndDiscardsLateResponse() throws Exception {
        var timer = mock(TimerDispatch.class);
        var entered = new CountDownLatch(1);
        var listener = new AtomicReference<CollectResponseEventListener>();
        doAnswer(
                        call -> {
                            listener.set(call.getArgument(1));
                            entered.countDown();
                            return null;
                        })
                .when(timer)
                .addJob(any(), any());
        var collector =
                new CollectJobService(timer, new DispatchProperties(), mock(WorkerPool.class));
        var job = Job.builder().id(0).monitorId(123).build();
        var interrupted = new AtomicBoolean();
        var complete = new AtomicBoolean();
        var thread =
                new Thread(
                        () -> {
                            assertEquals(List.of(), collector.collectSyncJobData(job));
                            interrupted.set(Thread.currentThread().isInterrupted());
                            complete.set(true);
                        });
        thread.start();
        assertTrue(entered.await(3, TimeUnit.SECONDS));
        thread.interrupt();
        thread.join(3000);
        assertFalse(thread.isAlive());
        assertTrue(complete.get());
        assertTrue(interrupted.get());
        assertTrue(job.getId() != 0);
        assertEquals(123, job.getMonitorId());
        verify(timer).deleteJob(job.getId(), false);
        var late = mock(CollectRep.MetricsData.class);
        listener.get().response(List.of(late));
        verify(late).close();
    }
}
