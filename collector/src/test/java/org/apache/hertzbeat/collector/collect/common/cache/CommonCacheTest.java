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

package org.apache.hertzbeat.collector.collect.common.cache;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link ConnectionCommonCache}
 */
@ExtendWith(MockitoExtension.class)
class CommonCacheTest {

    @Mock
    private AbstractConnection<?> mockConnection;

    @InjectMocks
    private ConnectionCommonCache<String, AbstractConnection<?>> cache;

    @BeforeEach
    void setUp() {
        cache = new ConnectionCommonCache<>();
    }

    @Test
    void testAddAndRetrieveCache() {
        String key = "testKey";
        cache.addCache(key, mockConnection);

        Optional<AbstractConnection<?>> retrieved = cache.getCache(key, false);
        assertTrue(retrieved.isPresent());
        assertSame(mockConnection, retrieved.get());
    }

    @Test
    void testCacheTimeout() throws InterruptedException {
        String key = "timeoutKey";
        cache.addCache(key, mockConnection, 1L);

        Thread.sleep(2);
        Optional<AbstractConnection<?>> retrieved = cache.getCache(key, false);
        assertFalse(retrieved.isPresent());
    }

    @Test
    void testRemoveCache() {
        String key = "removeKey";
        cache.addCache(key, mockConnection);
        cache.removeCache(key);

        Optional<AbstractConnection<?>> retrieved = cache.getCache(key, false);
        assertFalse(retrieved.isPresent());
    }

    @Test
    void testRefreshCache() {
        String key = "refreshKey";
        cache.addCache(key, mockConnection, 5000L);

        Optional<AbstractConnection<?>> firstRetrieval = cache.getCache(key, true);
        assertTrue(firstRetrieval.isPresent());


        Optional<AbstractConnection<?>> secondRetrieval = cache.getCache(key, false);
        assertTrue(secondRetrieval.isPresent());
    }

    @Test
    void testConcurrentAccess() throws InterruptedException {
        String key = "concurrentKey";
        cache.addCache(key, mockConnection);

        Runnable accessCache = () -> {
            Optional<AbstractConnection<?>> retrieved = cache.getCache(key, false);
            assertTrue(retrieved.isPresent());
        };

        Thread thread1 = new Thread(accessCache);
        Thread thread2 = new Thread(accessCache);
        thread1.start();
        thread2.start();

        thread1.join();
        thread2.join();
    }
}
