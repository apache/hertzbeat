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

package org.apache.hertzbeat.observability.logs.sse;

import static org.junit.jupiter.api.Assertions.assertEquals;

import tools.jackson.core.type.TypeReference;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

class LogSseBodyTermContractTest {
    record Fixture(String body, String term, Boolean matched) { }

    @Test
    void liveBodyMatchesPinnedGreptimeLiteralFixtures() throws Exception {
        try (InputStream input = getClass().getResourceAsStream("/log-body-term-greptime-1.1.4.json")) {
            List<Fixture> fixtures = JsonUtil.fromJson(input, new TypeReference<>() { });
            assertEquals(65, fixtures.size());
            for (Fixture fixture : fixtures) {
                assertEquals(Boolean.TRUE.equals(fixture.matched()),
                        new LogBodyTermFilter(fixture.term()).test(fixture.body()), () -> JsonUtil.toJson(fixture));
                var criteria = new LogSseFilterCriteria();
                criteria.setWorkspaceId("default");
                criteria.setLogContent(fixture.term());
                boolean expected = !StringUtils.hasText(fixture.term()) || Boolean.TRUE.equals(fixture.matched());
                assertEquals(expected, criteria.matches(LogEntry.builder().body(fixture.body()).build()),
                        () -> JsonUtil.toJson(fixture));
            }
        }
    }

    @Test
    void structuredBodiesUsePersistedJsonInsteadOfJavaCollectionRendering() {
        for (Object body : List.of(Map.of("key", "value"), List.of("value", 5), 42, true)) {
            String stored = JsonUtil.toJson(body);
            assertEquals(true, new LogBodyTermFilter(stored).test(body));
        }
        assertEquals(false, new LogBodyTermFilter("key=value").test(Map.of("key", "value")));
        assertEquals(true, new LogBodyTermFilter("value").test(new StringBuilder("value")));
    }

}
