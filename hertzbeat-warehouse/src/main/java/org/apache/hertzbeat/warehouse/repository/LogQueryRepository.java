/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import java.util.List;
import org.apache.hertzbeat.common.entity.log.LogEntry;

/**
 * Repository for recent log queries used by OTLP workspaces.
 */
public interface LogQueryRepository {

    /**
     * Query logs in a time range with optional trace/span filters.
     *
     * @param start start millis
     * @param end end millis
     * @param traceId optional trace id
     * @param spanId optional span id
     * @param limit row limit
     * @return logs ordered by storage implementation
     */
    List<LogEntry> queryLogs(long start, long end, String traceId, String spanId, int limit);

    /**
     * Query recent logs in a time range.
     *
     * @param start start millis
     * @param end end millis
     * @param limit row limit
     * @return logs ordered by storage implementation
     */
    default List<LogEntry> queryRecentLogs(long start, long end, int limit) {
        return queryLogs(start, end, null, null, limit);
    }

    /**
     * Count logs in a time range.
     *
     * @param start start millis
     * @param end end millis
     * @return count
     */
    long countRecentLogs(long start, long end);
}
