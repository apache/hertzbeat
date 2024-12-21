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

package org.apache.hertzbeat.common.cache;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.Duration;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link CaffeineCacheServiceImpl}
 */
class CaffeineCacheTest {
    private CommonCacheService<String, String> cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new CaffeineCacheServiceImpl<>(10, 100, Duration.ofMillis(3000), false);
    }

    @Test
    void testCache() throws InterruptedException {
        String key = "key";
        String value = "value";

        // test get & put
        cacheService.put(key, value);
        Assertions.assertEquals(value, cacheService.get(key));
        Assertions.assertTrue(cacheService.containsKey(key));

        // test remove
        cacheService.remove(key);
        Assertions.assertNull(cacheService.get(key));

        // test expire time
        cacheService.put(key, value);
        Thread.sleep(3000);
        Assertions.assertNull(cacheService.get(key));
        Assertions.assertNull(cacheService.get(key));

        // test clear
        for (int i = 0; i < 10; i++) {
            cacheService.put(key + i, value);
        }
        cacheService.clear();
        for (int i = 0; i < 10; i++) {
            Assertions.assertNull(cacheService.get(key + i));
        }
    }

    @Test
    void weekCache() {
        CommonCacheService<String, String> cache = new CaffeineCacheServiceImpl<>(10, 100, Duration.ofMillis(3000), true);
        assertNotNull(cache);
    }
}
