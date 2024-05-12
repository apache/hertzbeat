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

package org.apache.hertzbeat.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AlerterWorkerPool}
 */
class AlerterWorkerPoolTest {

    private static final int NUMBER_OF_THREADS = 10;
    private AlerterWorkerPool pool;
    private AtomicInteger counter;
    private CountDownLatch latch;

    @BeforeEach
    void setUp() {
        pool = new AlerterWorkerPool();
        counter = new AtomicInteger();
        latch = new CountDownLatch(NUMBER_OF_THREADS);
    }

    @Test
    void executeJob() throws InterruptedException {
        for (int i = 0; i < NUMBER_OF_THREADS; i++) {
            pool.executeJob(() -> {
                counter.incrementAndGet();
                latch.countDown();
            });
        }
        latch.await();

        assertEquals(NUMBER_OF_THREADS, counter.get());
    }
}
