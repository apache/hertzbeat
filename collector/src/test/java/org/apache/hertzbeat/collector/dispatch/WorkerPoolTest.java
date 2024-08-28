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

package org.apache.hertzbeat.collector.dispatch;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import java.util.concurrent.RejectedExecutionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link WorkerPool}
 */
class WorkerPoolTest {

    private WorkerPool workerPool;

    private Runnable mockTask;

    @BeforeEach
    void setUp() {

        workerPool = new WorkerPool();
        mockTask = mock(Runnable.class);
    }

    @Test
    void testExecuteJob() {

        assertDoesNotThrow(() -> workerPool.executeJob(mockTask));
    }

    @Test
    void testExecuteJobThrowsException() {

        workerPool = mock(WorkerPool.class);
        doThrow(new RejectedExecutionException()).when(workerPool).executeJob(mockTask);

        assertThrows(RejectedExecutionException.class, () -> workerPool.executeJob(mockTask));
    }

    @Test
    void testDestroy() {
        assertDoesNotThrow(() -> workerPool.destroy());
    }

}
