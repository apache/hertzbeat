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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class LogQueryFilterValidationTest {
    @Test
    void invalidClausesNeverReachReader() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        for (String filter : List.of("version=1 AND nonsense", "unsafe key=value",
                "version=a AND version=b", "version IN (a,)", "version=a OR version=b")) {
            assertThrows(LogFilterQueryException.class, () -> service.list("default", null,
                    1000L, 5000L, null, null, null, null, null, "checkout", null, null,
                    filter, null, 0, 5, false, false, null, "newest"), filter);
        }
        verifyNoInteractions(reader);
    }

    @Test
    void reservedEqualityValuesMatchOnlyTheirLiteralRows() {
        var values = List.of("!foo", "__hz_exists__", "__hz_in__:bar", "plain");
        var rows = values.stream().map(value -> LogEntry.builder().timeUnixNano(2000L).body(value)
                .resource(Map.of("service.name", "checkout"))
                .attributes(Map.of("key", value)).build()).toList();
        var reader = mock(HistoryDataReader.class, invocation -> {
            if (List.class.isAssignableFrom(invocation.getMethod().getReturnType())) {
                return rows;
            }
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        for (String value : values.subList(0, 3)) {
            var result = service.list("default", null, 1000L, 5000L, null, null, null, null, null,
                    "checkout", null, null, null, "key='" + value + "'", 0, 10, false, false, null, "newest");
            assertEquals(List.of(value), result.getContent().stream().map(LogEntry::getBody).toList());
        }
    }

}
