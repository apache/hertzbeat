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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import java.time.Duration;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class LogComparisonControllerTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void percentileMeasureUsesSameComparisonContract() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = new LogQueryController(service,
                new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO), null);
        String body = "{\"version\":1,\"parameters\":{\"start\":\"1000\",\"end\":\"5000\","
                + "\"measure\":\"{\\\"function\\\":\\\"p95\\\",\\\"field\\\":\\\"attribute:duration\\\"}\"},"
                + "\"queries\":[{\"id\":\"a\"},{\"id\":\"b\"}],\"formula\":\"b/a\"}";
        controller.compare(body);
        var request = org.mockito.ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request.class);
        verify(service).compare(any(), request.capture(), any(), eq("b/a"));
        org.junit.jupiter.api.Assertions.assertEquals("p95", request.getValue().measure().function());
        org.junit.jupiter.api.Assertions.assertEquals("measure-desc", request.getValue().order());
    }

    @Test
    void strictEnvelopeRejectsBeforeServiceAndValidRequestDispatchesOnce() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = new LogQueryController(service,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)), null);
        assertThrows(ObservabilityQueryRequestException.class, () -> controller.compare("{}"));
        verifyNoInteractions(service);
        controller.compare("""
                {"version":1,"parameters":{"start":"1000","end":"5000"},"queries":[{"id":"a"},{"id":"b"}],"formula":"b/a"}
                """);
        verify(service).compare(any(), any(), any(), eq("b/a"));
    }
}
