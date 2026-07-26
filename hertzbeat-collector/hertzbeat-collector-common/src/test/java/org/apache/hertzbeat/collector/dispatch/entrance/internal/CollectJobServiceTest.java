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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link CollectJobService}.
 */
@ExtendWith(MockitoExtension.class)
class CollectJobServiceTest {

    @Mock
    private TimerDispatch timerDispatch;

    @Mock
    private WorkerPool workerPool;

    @Test
    void shouldPropagateSynchronousCollectionInterruption() {
        CollectJobService service = new CollectJobService(timerDispatch, null, workerPool);
        Thread.currentThread().interrupt();

        try {
            assertThrows(IllegalStateException.class, () -> service.collectSyncJobData(new Job()));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }
}
