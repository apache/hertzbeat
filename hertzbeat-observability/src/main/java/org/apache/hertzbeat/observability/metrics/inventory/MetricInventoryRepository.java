/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.metrics.inventory;

import java.util.List;
import java.util.Objects;

/** Typed storage boundary for exact-scope metric-name discovery. */
public interface MetricInventoryRepository {

    Result findMetricNames(Query query);

    /** Exact metric inventory scope. */
    record Query(
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            String instance,
            String endpoint,
            long start,
            long end,
            int limit
    ) {
    }

    /** Storage outcome that keeps valid empty results distinct from failures. */
    record Result(Status status, List<String> names, String errorMessage) {

        public static final String INVENTORY_UNAVAILABLE = "metric_inventory_unavailable";

        public Result {
            status = Objects.requireNonNull(status, "status");
            switch (status) {
                case SUCCESS -> {
                    names = names == null ? List.of() : List.copyOf(names);
                    errorMessage = null;
                }
                case UNSUPPORTED -> {
                    names = List.of();
                    errorMessage = null;
                }
                case FAILURE -> {
                    names = List.of();
                    errorMessage = INVENTORY_UNAVAILABLE;
                }
                default -> throw new IllegalStateException("Unsupported metric inventory status");
            }
        }

        public static Result success(List<String> names) {
            return new Result(Status.SUCCESS, names == null ? List.of() : List.copyOf(names), null);
        }

        public static Result unsupported() {
            return new Result(Status.UNSUPPORTED, List.of(), null);
        }

        public static Result failure() {
            return new Result(Status.FAILURE, List.of(), INVENTORY_UNAVAILABLE);
        }
    }

    /** Metric inventory execution status. */
    enum Status {
        SUCCESS,
        UNSUPPORTED,
        FAILURE
    }
}
