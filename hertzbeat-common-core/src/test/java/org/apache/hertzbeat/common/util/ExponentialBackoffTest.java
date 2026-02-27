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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ExponentialBackoff}
 */
class ExponentialBackoffTest {

    @Test
    void testProgressionAndCap() {
        ExponentialBackoff backoff = new ExponentialBackoff(50L, 1000L);
        Assertions.assertEquals(50L, backoff.nextDelay());
        Assertions.assertEquals(100L, backoff.nextDelay());
        Assertions.assertEquals(200L, backoff.nextDelay());
        Assertions.assertEquals(400L, backoff.nextDelay());
        Assertions.assertEquals(800L, backoff.nextDelay());
        Assertions.assertEquals(1000L, backoff.nextDelay());
        Assertions.assertEquals(1000L, backoff.nextDelay());
    }

    @Test
    void testReset() {
        ExponentialBackoff backoff = new ExponentialBackoff(50L, 1000L);
        Assertions.assertEquals(50L, backoff.nextDelay());
        Assertions.assertEquals(100L, backoff.nextDelay());
        backoff.reset();
        Assertions.assertEquals(50L, backoff.nextDelay());
    }

    @Test
    void testInvalidParams() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> new ExponentialBackoff(0L, 1000L));
        Assertions.assertThrows(IllegalArgumentException.class, () -> new ExponentialBackoff(50L, 10L));
    }
}
