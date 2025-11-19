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

/**
 * Exponential backoff utility class
 */
public final class ExponentialBackoff {
    private final long initial;
    private final long max;
    private long current;

    public ExponentialBackoff(long initial, long max) {
        if (initial <= 0 || max < initial) {
            throw new IllegalArgumentException("Invalid exponential backoff params");
        }
        this.initial = initial;
        this.max = max;
        this.current = initial;
    }

    /**
     * Returns the current delay value and advances to the next delay.
     * The delay doubles on each call until it reaches the maximum value.
     *
     * @return the delay in milliseconds to wait before the next retry
     */
    public long nextDelay() {
        long delay = this.current;
        if (this.current <= this.max / 2) {
            this.current = this.current * 2;
        } else {
            this.current = this.max;
        }
        return delay;
    }

    /**
     * Resets the backoff to the initial delay value.
     * Should be called when an operation succeeds after previous failures.
     */
    public void reset() {
        this.current = this.initial;
    }
}
