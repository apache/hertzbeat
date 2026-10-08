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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class LogQuerySortContractTest {
    @Test
    void complexAndUnsupportedReaderFallbacksSortBeforeTakingThePage() {
        var rows = List.of(row("c", 3000), row("b", 2000), row("a", 2000));
        var reader = mock(HistoryDataReader.class, invocation -> {
            if (List.class.isAssignableFrom(invocation.getMethod().getReturnType())) {
                return rows;
            }
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        for (String filter : List.of("version exists", "version=v1")) {
            for (String sort : List.of("oldest", "newest")) {
                var result = service.list("default", null, 1000L, 5000L, null, null, null, null, null,
                        "checkout", null, null, filter, null, 0, 1, false, false, null, sort);
                assertEquals(sort.equals("oldest") ? "a" : "c", result.getContent().getFirst().getBody());
                assertEquals(3, result.getTotalElements());
                var second = service.list("default", null, 1000L, 5000L, null, null, null, null, null,
                        "checkout", null, null, filter, null, 1, 1, false, false, null, sort);
                assertEquals("b", second.getContent().getFirst().getBody());
            }
        }
    }

    private LogEntry row(String uid, long timestamp) {
        return LogEntry.builder().timeUnixNano(timestamp).body(uid).attributes(Map.of("log.record.uid", uid))
                .resource(Map.of("service.name", "checkout", "version", "v1")).build();
    }
}
