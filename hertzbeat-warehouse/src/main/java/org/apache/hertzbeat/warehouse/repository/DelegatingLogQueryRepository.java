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

import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;

/**
 * Delegates recent log queries to the first available log-capable history reader.
 */
@Repository
@RequiredArgsConstructor
public class DelegatingLogQueryRepository implements LogQueryRepository {

    private final ObjectProvider<HistoryDataReader> historyDataReaderProvider;

    @Override
    public List<LogEntry> queryLogs(long start, long end, String traceId, String spanId, int limit) {
        int resolvedLimit = Math.max(limit, 1);
        for (HistoryDataReader historyDataReader : historyDataReaderProvider.orderedStream().toList()) {
            if (historyDataReader == null) {
                continue;
            }
            try {
                List<LogEntry> logs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                        start, end, traceId, spanId, null, null, null, 0, resolvedLimit
                );
                if (!CollectionUtils.isEmpty(logs)) {
                    return logs;
                }
            } catch (Exception ex) {
                // Continue probing later readers. Mixed-store setups may expose non-log-capable backends first.
            }
        }
        return Collections.emptyList();
    }

    @Override
    public long countRecentLogs(long start, long end) {
        for (HistoryDataReader historyDataReader : historyDataReaderProvider.orderedStream().toList()) {
            if (historyDataReader == null) {
                continue;
            }
            try {
                long count = historyDataReader.countLogsByMultipleConditions(start, end, null, null, null, null, null);
                if (count > 0) {
                    return count;
                }
            } catch (Exception ex) {
                // Continue probing later readers. Mixed-store setups may expose non-log-capable backends first.
            }
        }
        return 0;
    }
}
