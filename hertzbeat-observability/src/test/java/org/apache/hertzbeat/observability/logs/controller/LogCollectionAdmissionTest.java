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

package org.apache.hertzbeat.observability.logs.controller;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogCollectionAdmissionTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void invalidNumericRangeNeverReachesReaders() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null)).build();
        for (String path : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend", "stats/group-by",
                "facets/fields", "facets/values", "analysis")) {
            assertThrows(jakarta.servlet.ServletException.class, () -> mvc.perform(get("/api/logs/" + path)
                    .param("start", "1000").param("end", "5000").param("entityId", "7")
                    .param("field", "attribute:codes").param("groupBy", "severity").param("logNumericRange", "{}")));
        }
        verifyNoInteractions(service, admission);
    }

    @Test
    void allHistoryEntryPointsParseBeforeAdmissionAndEmptyEntityLookup() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null)).build();
        for (String path : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend", "stats/group-by",
                "facets/fields", "facets/values", "analysis")) {
            for (String invalid : List.of("service:", "(service:alpha", "@duration:[1 TO ]",
                    "@users[][\"codes\"]:[2 TO 6]", "@users[][\"*\"][]:4", "@codes[]:[1.5 TO 6]", "@codes[]:\"open", "@codes[]:\"line\nnext\"")) {
                var failure = assertThrows(jakarta.servlet.ServletException.class, () -> mvc.perform(get("/api/logs/" + path)
                    .param("start", "1000").param("end", "5000").param("entityId", "7")
                    .param("field", "attribute:codes").param("groupBy", "severity")
                    .param("searchSyntax", "structured-v1").param("search", invalid)));
                assertInstanceOf(LogFilterQueryException.class, failure.getCause());
            }
        }
        verifyNoInteractions(service, admission);
    }
}
