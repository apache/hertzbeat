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

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.atomic.LongAdder;
import org.apache.hertzbeat.common.entity.event.CollectionExecutionEvent;

/**
 * Fixed-capacity, non-blocking publication buffer for collection events.
 */
final class BoundedCollectionExecutionEventBuffer {

    private final ArrayBlockingQueue<CollectionExecutionEvent> queue;
    private final int capacity;
    private final LongAdder accepted = new LongAdder();
    private final LongAdder rejected = new LongAdder();

    BoundedCollectionExecutionEventBuffer(int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be positive");
        }
        this.capacity = capacity;
        this.queue = new ArrayBlockingQueue<>(capacity);
    }

    boolean offer(CollectionExecutionEvent event) {
        Objects.requireNonNull(event, "event");
        if (queue.offer(event)) {
            accepted.increment();
            return true;
        }
        rejected.increment();
        return false;
    }

    List<CollectionExecutionEvent> takeBatch(int maxBatchSize) throws InterruptedException {
        if (maxBatchSize <= 0) {
            throw new IllegalArgumentException("maxBatchSize must be positive");
        }
        List<CollectionExecutionEvent> batch = new ArrayList<>(maxBatchSize);
        batch.add(queue.take());
        queue.drainTo(batch, maxBatchSize - 1);
        return batch;
    }

    Stats stats() {
        return new Stats(accepted.sum(), rejected.sum(), queue.size(), capacity);
    }

    /** Buffer pressure snapshot. */
    record Stats(long accepted, long rejected, int queued, int capacity) {
    }
}
