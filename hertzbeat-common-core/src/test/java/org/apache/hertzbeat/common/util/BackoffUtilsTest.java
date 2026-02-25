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

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link BackoffUtils}
 */
class BackoffUtilsTest {

    @Test
    void shouldContinueAfterBackoff() {
        ExponentialBackoff backoff = new ExponentialBackoff(10L, 100L);
        boolean shouldContinue = BackoffUtils.shouldContinueAfterBackoff(backoff);
        assertTrue(shouldContinue);
    }

    @Test
    void shouldNotContinueWhenInterrupted() {
        Thread.currentThread().interrupt();
        ExponentialBackoff backoff = new ExponentialBackoff(10L, 100L);
        boolean shouldContinue = BackoffUtils.shouldContinueAfterBackoff(backoff);
        assertFalse(shouldContinue);
    }

    @Test
    void shouldHandleInterruptedException() throws InterruptedException {
        final Thread mainThread = Thread.currentThread();
        ExponentialBackoff backoff = new ExponentialBackoff(1000L, 2000L);

        Thread interruptingThread = new Thread(() -> {
            try {
                // Give the main thread some time to enter the sleep
                Thread.sleep(200);
                mainThread.interrupt();
            } catch (InterruptedException ignored) {
            }
        });

        interruptingThread.start();

        boolean shouldContinue = BackoffUtils.shouldContinueAfterBackoff(backoff);

        interruptingThread.join();

        assertFalse(shouldContinue);
        assertTrue(Thread.currentThread().isInterrupted());
    }
}