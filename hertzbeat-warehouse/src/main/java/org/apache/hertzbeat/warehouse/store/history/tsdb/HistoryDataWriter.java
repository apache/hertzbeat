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

package org.apache.hertzbeat.warehouse.store.history.tsdb;

import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * history data writer
 */
public interface HistoryDataWriter {

    /**
     * @return data storage available
     */
    boolean isServerAvailable();

    /**
     * save metrics data
     * @param metricsData metrics data
     */
    void saveData(CollectRep.MetricsData metricsData);

    /**
     * default save log data
     * @param logEntry log entry
     */
    default void saveLogData(LogEntry logEntry) {
        throw new UnsupportedOperationException("save log data is not supported");
    }

    /**
     * Query logs with multiple filter conditions
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @return filtered log entries
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId, 
                                                         String spanId, Integer severityNumber, 
                                                         String severityText) {
        throw new UnsupportedOperationException("query logs by multiple conditions is not supported");
    }

    /**
     * Query logs with multiple filter conditions and pagination
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param offset pagination offset
     * @param limit pagination limit
     * @return filtered log entries with pagination
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId, 
                                                                       String spanId, Integer severityNumber, 
                                                                       String severityText, Integer offset, Integer limit) {
        throw new UnsupportedOperationException("query logs by multiple conditions with pagination is not supported");
    }

    /**
     * Count logs with multiple filter conditions
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @return count of matching log entries
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId, 
                                              String spanId, Integer severityNumber, 
                                              String severityText) {
        throw new UnsupportedOperationException("count logs by multiple conditions is not supported");
    }

    /**
     * Batch delete logs by time timestamps
     * @param timeUnixNanos list of time timestamps to delete
     * @return true if deletion is successful, false otherwise
     */
    default boolean batchDeleteLogs(List<Long> timeUnixNanos) {
        throw new UnsupportedOperationException("batch delete logs is not supported");
    }
}
