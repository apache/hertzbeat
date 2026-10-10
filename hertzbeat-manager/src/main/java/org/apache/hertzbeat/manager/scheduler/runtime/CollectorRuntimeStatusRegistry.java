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

package org.apache.hertzbeat.manager.scheduler.runtime;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.springframework.stereotype.Component;

/**
 * Keeps short-lived runtime status separate from persistent Collector scheduling state.
 */
@Component
public class CollectorRuntimeStatusRegistry {

    private static final Duration DEFAULT_TTL = Duration.ofSeconds(20);

    private final Map<String, ReportedStatus> statuses = new ConcurrentHashMap<>();
    private final Clock clock;
    private final Duration ttl;

    public CollectorRuntimeStatusRegistry() {
        this(Clock.systemUTC(), DEFAULT_TTL);
    }

    CollectorRuntimeStatusRegistry(Clock clock, Duration ttl) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.ttl = Objects.requireNonNull(ttl, "ttl");
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("Collector runtime status TTL must be positive");
        }
    }

    public void report(String collectorIdentity, ManagedOtelRuntimeStatus status) {
        String identity = StringUtils.trimToNull(collectorIdentity);
        if (identity == null) {
            throw new IllegalArgumentException("Collector identity is required for runtime status");
        }
        statuses.put(identity, new ReportedStatus(Objects.requireNonNull(status, "status"), clock.instant()));
    }

    public Optional<ReportedStatus> current(String collectorIdentity) {
        String identity = StringUtils.trimToNull(collectorIdentity);
        if (identity == null) {
            return Optional.empty();
        }
        ReportedStatus reported = statuses.get(identity);
        if (reported == null) {
            return Optional.empty();
        }
        if (!reported.receivedAt().plus(ttl).isAfter(clock.instant())) {
            statuses.remove(identity, reported);
            return Optional.empty();
        }
        return Optional.of(reported);
    }

    public void remove(String collectorIdentity) {
        if (collectorIdentity != null) {
            statuses.remove(collectorIdentity);
        }
    }

    /**
     * Runtime status and the manager receive time used to detect stale heartbeats.
     */
    public record ReportedStatus(ManagedOtelRuntimeStatus status, Instant receivedAt) {
    }
}
