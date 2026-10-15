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

package org.apache.hertzbeat.manager.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogTimeShiftHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void dispatchesEveryOffsetWithoutAcceptingIndependentTime() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        for (long offset : new long[] {3600000, 86400000, 604800000}) {
            var service = mock(LogQueryService.class);
            var admission = new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO);
            var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                    .setControllerAdvice(new GlobalExceptionHandler()).build();
            mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON).content(
                    "{\"version\":1,\"parameters\":{\"start\":\"700000000\",\"end\":\"700004000\"},"
                            + "\"queries\":[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":" + offset + "}]}"))
                    .andExpect(status().isOk());
            var sources = ArgumentCaptor.forClass(List.class);
            verify(service).compare(any(), any(), sources.capture(), any());
            var query = (LogComparisonParser.Query) sources.getValue().getLast();
            assertEquals(offset, query.timeShiftMs());
        }
    }

    @Test
    void rejectsInvalidShiftAndEarlyWindowBeforeAdmission() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String queries : List.of(
                "[{\"id\":\"a\",\"timeShiftMs\":3600000},{\"id\":\"b\"}]",
                "[{\"id\":\"a\"},{\"id\":\"b\",\"start\":1}]",
                "[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":3600000}]",
                "[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":null}]",
                "[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":0}]")) {
            mvc.perform(post("/api/logs/analysis/compare").contentType(MediaType.APPLICATION_JSON).content(
                    "{\"version\":1,\"parameters\":{\"start\":\"1000\",\"end\":\"5000\",\"entityId\":\"7\"},\"queries\":" + queries + "}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service, admission);
    }
}
