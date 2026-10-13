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

package org.apache.hertzbeat.observability.logs.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class LogTransactionControllerTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void malformedDetailOrSeedNeverEntersAdmission() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var controller = new LogQueryController(service, admission, null);
        var values = new HashMap<>(Map.of("start", "1000", "end", "2000", "transactionField", "attribute:id",
                "transactionId", "exact", "entityId", "4"));
        values.put("pageIndex", "2147483647");
        assertThrows(ObservabilityQueryRequestException.class, () -> controller.transactionDetail(values));
        values.remove("pageIndex");
        values.put("localSearchSyntax", "structured-v1");
        values.put("localSearch", "a OR");
        assertThrows(LogFilterQueryException.class, () -> controller.transactionDetail(values));
        values.remove("localSearchSyntax");
        values.remove("localSearch");
        values.put("searchSyntax", "structured-v1");
        values.put("search", "a OR");
        assertThrows(LogFilterQueryException.class, () -> controller.transactions(values));
        verifyNoInteractions(service, admission);
    }

    @Test
    void selectedContextIsTransportedSeparatelyFromAuthoredFilters() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = new LogQueryController(service,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)), null);
        controller.transactions(Map.of("start", "1000", "end", "2000", "transactionField", "attribute:id",
                "instance", "node-a", "endpoint", "/checkout", "resourceFilter", "zone=west"));
        var context = org.mockito.ArgumentCaptor.forClass(LogQueryService.ContextFilters.class);
        var query = org.mockito.ArgumentCaptor.forClass(LogQueryService.FacetQuery.class);
        org.mockito.Mockito.verify(service).transactions(query.capture(), context.capture(), org.mockito.ArgumentMatchers.any());
        assertEquals("default", query.getValue().workspaceId());
        org.junit.jupiter.api.Assertions.assertFalse(context.getValue().resourceFilter().contains("zone"));
        org.junit.jupiter.api.Assertions.assertTrue(query.getValue().resourceFilter().contains("zone"));
    }
}
