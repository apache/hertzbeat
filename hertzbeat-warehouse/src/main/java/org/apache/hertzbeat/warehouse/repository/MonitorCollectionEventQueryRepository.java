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

package org.apache.hertzbeat.warehouse.repository;

/**
 * Warehouse boundary for the latest persisted native collection event for one exact Monitor.
 */
public interface MonitorCollectionEventQueryRepository {

    long MAX_WINDOW_MILLIS = 24L * 60L * 60L * 1000L;

    MonitorCollectionEventQueryResult query(MonitorCollectionEventQuery query);

    /** Exact Monitor and bounded event window. */
    record MonitorCollectionEventQuery(long monitorId, long start, long end) {

        public MonitorCollectionEventQuery {
            if (monitorId <= 0L || start <= 0L || end <= start || end - start > MAX_WINDOW_MILLIS) {
                throw new IllegalArgumentException("monitor_collection_window_invalid");
            }
        }
    }

    /** Strictly typed persisted collection event. */
    record MonitorCollectionEvent(long observedAt,
                                  long durationMillis,
                                  String outcome,
                                  String collectorId,
                                  String target,
                                  String metricSet,
                                  String failureClass,
                                  String phase,
                                  int fieldCount,
                                  int rowCount) {
    }

    /** Storage availability and optional latest event. */
    record MonitorCollectionEventQueryResult(boolean available, MonitorCollectionEvent event) {

        public static MonitorCollectionEventQueryResult available(MonitorCollectionEvent event) {
            return new MonitorCollectionEventQueryResult(true, event);
        }

        public static MonitorCollectionEventQueryResult unavailable() {
            return new MonitorCollectionEventQueryResult(false, null);
        }
    }
}
