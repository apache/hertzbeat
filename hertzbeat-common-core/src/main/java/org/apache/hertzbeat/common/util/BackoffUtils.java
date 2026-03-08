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

import java.util.concurrent.TimeUnit;

/**
 * Backoff utility class.
 */
public final class BackoffUtils {

    /** Private constructor to prevent instantiation */
    private BackoffUtils() {}

    /**
     * Sleeps for the next delay specified by the ExponentialBackoff instance.
     * If the thread is interrupted during sleep, it resets the interrupt status
     * and returns false to indicate that the operation should not continue.
     *
     * @param backoff the ExponentialBackoff instance to get the next delay from
     * @return true if the sleep completed without interruption, false otherwise
     */
    public static boolean shouldContinueAfterBackoff(ExponentialBackoff backoff) {
        if (Thread.currentThread().isInterrupted()) {
            return false;
        }
        try {
            TimeUnit.MILLISECONDS.sleep(backoff.nextDelay());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
        return true;
    }
}