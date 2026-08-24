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

package org.apache.hertzbeat.collector.collect.common.ssh;

import com.google.common.base.Ticker;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.util.concurrent.Striped;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import lombok.extern.slf4j.Slf4j;

/**
 * Stops repeated SSH connection attempts after consecutive authentication failures.
 */
@Slf4j
final class SshCircuitBreaker {

    static final int MAX_FAILURES = 3;
    static final Duration COOLDOWN = Duration.ofMinutes(5);

    private final int maxFailures;
    private final Cache<Target, Integer> failureCounts;
    private final Striped<Lock> connectionLocks;

    SshCircuitBreaker() {
        this(MAX_FAILURES, COOLDOWN, Ticker.systemTicker());
    }

    SshCircuitBreaker(int maxFailures, Duration cooldown, Ticker ticker) {
        if (maxFailures <= 0) {
            throw new IllegalArgumentException("maxFailures must be positive");
        }
        if (cooldown.isZero() || cooldown.isNegative()) {
            throw new IllegalArgumentException("cooldown must be positive");
        }
        this.maxFailures = maxFailures;
        this.failureCounts = CacheBuilder.newBuilder()
                .expireAfterWrite(cooldown.toNanos(), TimeUnit.NANOSECONDS)
                .ticker(ticker)
                .build();
        this.connectionLocks = Striped.lock(1_024);
    }

    Target buildTarget(String host, String port, String username, List<String> credentials) {
        return new Target(host, port, username, List.copyOf(credentials));
    }

    Lock connectionLock(Target target) {
        return connectionLocks.get(target);
    }

    void checkOpen(Target target) throws IOException {
        Integer failureCount = failureCounts.getIfPresent(target);
        if (failureCount != null && failureCount >= maxFailures) {
            throw new IOException("SSH authentication is temporarily blocked for " + target.displayName()
                    + " after " + failureCount + " consecutive failures");
        }
    }

    void recordFailure(Target target) {
        int failureCount = failureCounts.asMap().merge(target, 1, Integer::sum);
        if (failureCount == maxFailures) {
            log.warn("SSH authentication is temporarily blocked for {} after {} consecutive failures",
                    target.displayName(), failureCount);
        }
    }

    void recordSuccess(Target target) {
        failureCounts.invalidate(target);
    }

    record Target(String host, String port, String username, List<String> credentials) {

        private String displayName() {
            return username + "@" + host + ":" + port;
        }

        @Override
        public String toString() {
            return displayName();
        }
    }
}
