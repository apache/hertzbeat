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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.log.LogEntry;

/**
 * history data reader
 */
public interface HistoryDataReader {

    /**
     * @return data storage available
     */
    boolean isServerAvailable();

    /**
     * query history range metrics data from tsdb
     * @param monitorId monitor id
     * @param app monitor type
     * @param metrics metrics
     * @param metric metric
     * @param label label
     * @param history range
     * @return metrics data
     */
    Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                  String label, String history);

    /**
     * query history range interval metrics data from tsdb
     * max min mean metrics value
     * @param monitorId monitor id
     * @param app monitor type
     * @param metrics metrics
     * @param metric metric
     * @param label label
     * @param history history range
     * @return metrics data
     */
    Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric,
                                                          String label, String history);

    /**
     * Query logs with multiple filter conditions (Legacy)
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText) {
        return queryLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText, null);
    }

    /**
     * Query logs with multiple filter conditions including search content
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @return filtered log entries
     */
    default List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                         String spanId, Integer severityNumber,
                                                         String severityText, String searchContent) {
        throw new UnsupportedOperationException("query logs by multiple conditions is not supported");
    }

    /**
     * Query logs with multiple filter conditions and pagination (Legacy)
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, Integer offset, Integer limit) {
        return queryLogsByMultipleConditionsWithPagination(startTime, endTime, traceId, spanId, severityNumber, severityText, null, offset, limit);
    }

    /**
     * Query logs with multiple filter conditions and pagination including search content
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @param offset pagination offset
     * @param limit pagination limit
     * @return filtered log entries with pagination
     */
    default List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                       String spanId, Integer severityNumber,
                                                                       String severityText, String searchContent,
                                                                       Integer offset, Integer limit) {
        throw new UnsupportedOperationException("query logs by multiple conditions with pagination is not supported");
    }

    /**
     * Count logs with multiple filter conditions (Legacy)
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText) {
        return countLogsByMultipleConditions(startTime, endTime, traceId, spanId, severityNumber, severityText, null);
    }

    /**
     * Count logs with multiple filter conditions including search content
     * @param startTime start time in milliseconds
     * @param endTime end time in milliseconds
     * @param traceId trace ID filter
     * @param spanId span ID filter
     * @param severityNumber severity number filter
     * @param severityText severity text filter
     * @param searchContent search content in log body
     * @return count of matching log entries
     */
    default long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                               String spanId, Integer severityNumber,
                                               String severityText, String searchContent) {
        throw new UnsupportedOperationException("count logs by multiple conditions is not supported");
    }
}