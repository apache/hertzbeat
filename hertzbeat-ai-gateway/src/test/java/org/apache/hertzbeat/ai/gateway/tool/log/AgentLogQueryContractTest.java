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

package org.apache.hertzbeat.ai.gateway.tool.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class AgentLogQueryContractTest {
    @ParameterizedTest
    @CsvSource({"error,ERROR", "ERROR,ERROR", "Warn,WARN", "trace,TRACE", "fatal,FATAL"})
    void actualFailedSeverityInputIsCanonicalizedBeforeNativeController(String input, String expected) throws Exception {
        var query = query(Map.of("start", 1792211059660L, "end", 1792211959660L,
                "groupBy", "severity", "severityCategory", input));
        query.validateOperation("groupByStats");
        assertEquals(expected, query.severityCategory());
        assertEquals(LogSeverityCategory.valueOf(expected), LogSeverityCategory.parse(query.severityCategory()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"err", "", "ALL", "error|warn"})
    void unknownSeverityIsInvalidRatherThanAnEmptyQuery(String input) {
        var error = assertThrows(IllegalArgumentException.class, () -> query(Map.of("severityCategory", input)));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("severityCategory"));
    }

    @ParameterizedTest
    @CsvSource({"1000,1000", "2000,1000", "-1,1000", "1000,604801001"})
    void invalidTimeContextFailsBeforeQuery(long start, long end) throws Exception {
        var query = query(Map.of("start", start, "end", end, "groupBy", "severity"));
        assertThrows(IllegalArgumentException.class, () -> query.validateOperation("groupByStats"));
    }

    @org.junit.jupiter.api.Test
    void facetBuiltinIdentityCannotSilentlyBecomeAnUnknownLegacyGroupingBucket() throws Exception {
        var query = query(Map.of("start", 1000L, "end", 2000L, "groupBy", "builtin:serviceName"));
        var failure = assertThrows(IllegalArgumentException.class, () -> query.validateOperation("groupByStats"));
        org.junit.jupiter.api.Assertions.assertTrue(failure.getMessage().contains("service.name"));
        query(Map.of("start", 1000L, "end", 2000L, "groupBy", "service.name"))
                .validateOperation("groupByStats");
        query(Map.of("start", 1000L, "end", 2000L, "groupBy", "resource:builtin:serviceName"))
                .validateOperation("groupByStats");
    }

    private AgentLogQuery query(Map<String, Object> values) throws Exception {
        var fields = AgentLogQuery.class.getRecordComponents();
        Object[] arguments = Arrays.stream(fields).map(field -> values.get(field.getName())).toArray();
        try {
            return AgentLogQuery.class.getDeclaredConstructor(Arrays.stream(fields).map(java.lang.reflect.RecordComponent::getType)
                    .toArray(Class<?>[]::new)).newInstance(arguments);
        } catch (java.lang.reflect.InvocationTargetException invalid) {
            if (invalid.getCause() instanceof RuntimeException cause) {
                throw cause;
            }
            throw invalid;
        }
    }
}
