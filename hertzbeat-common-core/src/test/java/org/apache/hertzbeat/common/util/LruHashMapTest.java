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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link LruHashMap}
 */
class LruHashMapTest {

    @Test
    void testLruHashMap() {

        int initThreshold = 3;
        LruHashMap<Integer, String> initLruMap = new LruHashMap<>(initThreshold);
        assertNotNull(initLruMap);
        assertEquals(0, initLruMap.size());

        int putAndGetThreshold = 2;
        LruHashMap<Integer, String> putAndGetLruMap = new LruHashMap<>(putAndGetThreshold);

        putAndGetLruMap.put(1, "one");
        putAndGetLruMap.put(2, "two");

        // Both entries should be present
        assertEquals("one", putAndGetLruMap.get(1));
        assertEquals("two", putAndGetLruMap.get(2));

        int evictionThreshold = 2;
        LruHashMap<Integer, String> evictionLruMap = new LruHashMap<>(evictionThreshold);

        evictionLruMap.put(1, "one");
        evictionLruMap.put(2, "two");
        evictionLruMap.put(3, "three");

        // The least recently used entry (1, "one") should be evicted
        assertNull(evictionLruMap.get(1));
        assertEquals("two", evictionLruMap.get(2));
        assertEquals("three", evictionLruMap.get(3));

        int accessOrderThreshold = 2;
        LruHashMap<Integer, String> accessOrderLruMap = new LruHashMap<>(accessOrderThreshold);

        accessOrderLruMap.put(1, "one");
        accessOrderLruMap.put(2, "two");

        // Access the first entry to make it recently used
        accessOrderLruMap.get(1);

        accessOrderLruMap.put(3, "three");

        // The least recently used entry (2, "two") should be evicted
        assertEquals("one", accessOrderLruMap.get(1));
        assertNull(accessOrderLruMap.get(2));
        assertEquals("three", accessOrderLruMap.get(3));
    }

}
