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

package org.apache.hertzbeat.observability.logs.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.observability.logs.service.LogManagementService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Default log management service.
 */
@Service
public class LogManagementServiceImpl implements LogManagementService {

    private final List<HistoryDataWriter> historyDataWriters;

    @Autowired
    public LogManagementServiceImpl(List<HistoryDataWriter> historyDataWriters) {
        this.historyDataWriters = historyDataWriters == null ? List.of()
                : historyDataWriters.stream().filter(Objects::nonNull).toList();
    }

    @Override
    public boolean batchDelete(List<Long> timeUnixNanos) {
        List<Long> timestamps = timeUnixNanos == null ? Collections.emptyList() : timeUnixNanos;
        for (HistoryDataWriter historyDataWriter : historyDataWriters) {
            try {
                return historyDataWriter.batchDeleteLogs(timestamps);
            } catch (UnsupportedOperationException ex) {
                // Try the next writer. Not every metrics backend supports log deletion.
            }
        }
        return false;
    }
}
