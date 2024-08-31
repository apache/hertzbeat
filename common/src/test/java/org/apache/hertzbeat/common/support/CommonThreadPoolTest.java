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

package org.apache.hertzbeat.common.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import java.lang.reflect.Field;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test for {@link CommonThreadPool}
 */

class CommonThreadPoolTest {

    private CommonThreadPool commonThreadPool;

    private ThreadPoolExecutor executorMock;

    @BeforeEach
    public void setUp() throws Exception {

        commonThreadPool = new CommonThreadPool();

        Field workerExecutorField = CommonThreadPool.class.getDeclaredField("workerExecutor");
        workerExecutorField.setAccessible(true);
        executorMock = mock(ThreadPoolExecutor.class);
        workerExecutorField.set(commonThreadPool, executorMock);
    }

    @Test
    public void testExecuteTask() {

        Runnable task = mock(Runnable.class);
        commonThreadPool.execute(task);
        verify(executorMock).execute(task);
    }

    @Test
    public void testExecuteTaskThrowsEx() {

        Runnable task = mock(Runnable.class);
        doThrow(RejectedExecutionException.class).when(executorMock).execute(task);

        assertThrows(
                RejectedExecutionException.class,
                () -> commonThreadPool.execute(task)
        );
    }

    @Test
    public void testDestroy() throws Exception {

        commonThreadPool.destroy();
        verify(executorMock).shutdownNow();
    }

    @Test
    public void testDestroyWithNull() throws Exception {

        Field workerExecutorField = CommonThreadPool.class.getDeclaredField("workerExecutor");
        workerExecutorField.setAccessible(true);
        workerExecutorField.set(commonThreadPool, null);

        commonThreadPool.destroy();
    }

    @Test
    public void testInitialization() throws Exception {
        CommonThreadPool pool = new CommonThreadPool();

        Field workerExecutorField = CommonThreadPool.class.getDeclaredField("workerExecutor");
        workerExecutorField.setAccessible(true);
        ThreadPoolExecutor workerExecutor = (ThreadPoolExecutor) workerExecutorField.get(pool);

        assertNotNull(workerExecutor);
        assertEquals(1, workerExecutor.getCorePoolSize());
        assertEquals(Integer.MAX_VALUE, workerExecutor.getMaximumPoolSize());
        assertEquals(10, workerExecutor.getKeepAliveTime(TimeUnit.SECONDS));
        assertTrue(workerExecutor.getQueue() instanceof SynchronousQueue);
    }

}
