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

package org.apache.hertzbeat.alert.calculate;

import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;

/**
 * Remembers recently deleted monitors so a late metrics sample cannot open a new firing alert.
 */
@Component
public class DeletedMonitorAlertGuard {

    static final long DEFAULT_RETENTION_MILLIS = 30L * 60L * 1000L;

    private static final DeletedMonitorAlertGuard ALLOW_ALL =
            new DeletedMonitorAlertGuard(true, DEFAULT_RETENTION_MILLIS, System::currentTimeMillis);

    private final boolean allowAll;

    private final long retentionMillis;

    private final LongSupplier clock;

    private final ConcurrentHashMap<Long, Long> deletedAt = new ConcurrentHashMap<>();

    public DeletedMonitorAlertGuard() {
        this(false, DEFAULT_RETENTION_MILLIS, System::currentTimeMillis);
    }

    DeletedMonitorAlertGuard(long retentionMillis, LongSupplier clock) {
        this(false, retentionMillis, clock);
    }

    private DeletedMonitorAlertGuard(boolean allowAll, long retentionMillis, LongSupplier clock) {
        this.allowAll = allowAll;
        this.retentionMillis = retentionMillis;
        this.clock = clock;
    }

    /**
     * Guard used by tests that do not model monitor deletion.
     * @return a guard that never treats a monitor as deleted
     */
    public static DeletedMonitorAlertGuard allowAll() {
        return ALLOW_ALL;
    }

    /**
     * Record that a monitor was deleted.
     * @param monitorId deleted monitor id
     */
    public void markDeleted(long monitorId) {
        if (allowAll || monitorId <= 0) {
            return;
        }
        long now = clock.getAsLong();
        deletedAt.put(monitorId, now);
        deletedAt.entrySet().removeIf(entry -> now - entry.getValue() > retentionMillis);
    }

    /**
     * Whether alerts for this monitor must not be opened again.
     * @param monitorId monitor id carried by the metrics sample
     * @return true when the monitor was deleted inside the retention window
     */
    public boolean isDeleted(long monitorId) {
        if (allowAll || monitorId <= 0) {
            return false;
        }
        Long markedAt = deletedAt.get(monitorId);
        if (markedAt == null) {
            return false;
        }
        if (clock.getAsLong() - markedAt > retentionMillis) {
            deletedAt.remove(monitorId, markedAt);
            return false;
        }
        return true;
    }
}
