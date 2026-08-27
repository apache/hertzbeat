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

package org.apache.hertzbeat.warehouse.store;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.common.entity.event.CollectionExecutionEvent;
import org.junit.jupiter.api.Test;

class BoundedCollectionExecutionEventBufferTest {

    @Test
    void rejectsImmediatelyAtCapacityAndReportsPressure() {
        BoundedCollectionExecutionEventBuffer buffer = new BoundedCollectionExecutionEventBuffer(2);

        assertTrue(buffer.offer(event(1L)));
        assertTrue(buffer.offer(event(2L)));
        assertFalse(buffer.offer(event(3L)));

        BoundedCollectionExecutionEventBuffer.Stats stats = buffer.stats();
        assertEquals(2L, stats.accepted());
        assertEquals(1L, stats.rejected());
        assertEquals(2, stats.queued());
        assertEquals(2, stats.capacity());
    }

    @Test
    void drainsBoundedBatchesInPublicationOrder() throws InterruptedException {
        BoundedCollectionExecutionEventBuffer buffer = new BoundedCollectionExecutionEventBuffer(4);
        buffer.offer(event(1L));
        buffer.offer(event(2L));
        buffer.offer(event(3L));

        List<CollectionExecutionEvent> first = buffer.takeBatch(2);
        List<CollectionExecutionEvent> second = buffer.takeBatch(2);

        assertEquals(List.of(1L, 2L), first.stream().map(item -> item.entity().monitorId()).toList());
        assertEquals(List.of(3L), second.stream().map(item -> item.entity().monitorId()).toList());
    }

    @Test
    void remainsBoundedWithConcurrentProducers() throws Exception {
        int capacity = 64;
        int producerCount = 8;
        int offersPerProducer = 1_000;
        BoundedCollectionExecutionEventBuffer buffer = new BoundedCollectionExecutionEventBuffer(capacity);
        CollectionExecutionEvent event = event(1L);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(producerCount);
        try {
            List<Future<?>> producers = new ArrayList<>(producerCount);
            for (int producerIndex = 0; producerIndex < producerCount; producerIndex++) {
                producers.add(executor.submit(() -> {
                    start.await();
                    for (int index = 0; index < offersPerProducer; index++) {
                        buffer.offer(event);
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> producer : producers) {
                producer.get();
            }
        } finally {
            executor.shutdownNow();
        }

        BoundedCollectionExecutionEventBuffer.Stats stats = buffer.stats();
        assertEquals(capacity, stats.accepted());
        assertEquals((long) producerCount * offersPerProducer - capacity, stats.rejected());
        assertEquals(capacity, stats.queued());
    }

    private static CollectionExecutionEvent event(long monitorId) {
        return new CollectionExecutionEvent(
                new CollectionExecutionEvent.EntityReference(monitorId, null, "linux"),
                null,
                new CollectionExecutionEvent.Observation(
                        "cpu",
                        1_000L + monitorId,
                        10L,
                        CollectionExecutionEvent.Outcome.SUCCESS,
                        CollectionExecutionEvent.FailureClass.NONE,
                        CollectionExecutionEvent.CollectionPhase.UNKNOWN,
                        1,
                        1));
    }
}
