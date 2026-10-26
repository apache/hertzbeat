/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.batch;

import java.util.List;
import java.util.Map;

/** Bounded, non-secret website creation and item-level readback contract. */
public final class WebsiteMonitorBatch {
    public static final int MAX_ITEMS = 50;

    private WebsiteMonitorBatch() {}

    /** Caller contract. */
    public record Caller(String actor, String workspace, List<String> roles) {
        public Caller {
            roles = roles == null ? List.of() : List.copyOf(roles);
        }
    }

    /** Item contract. */
    public record Item(
            String idempotencyKey, String name, String url, Integer intervals, Integer timeout) {}

    /** Request contract. */
    public record Request(List<Item> items, boolean retryPreflightFailures) {}

    /** Receipt contract. */
    public record Receipt(
            String idempotencyKey,
            String state,
            String monitorId,
            String reason,
            Map<String, Object> fields,
            Map<String, String> parameters) {}

    /** Result contract. */
    public record Result(
            int schemaVersion,
            List<Receipt> items,
            int verified,
            int failed,
            int pending,
            int unknown) {}
}
