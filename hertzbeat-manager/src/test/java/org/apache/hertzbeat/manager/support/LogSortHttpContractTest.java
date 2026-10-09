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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogSortHttpContractTest {
    @AfterEach
    void clear() { AuthTokenRequestContext.clear(); }

    @Test
    void invalidSortAndConflictingTimestampRejectBeforeAdmissionEvenEmptyEntity() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new LogQueryController(service, admission, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        for (String descriptor : List.of("", "null", "{}", " ".repeat(1025),
                "{\"version\":1,\"field\":\"builtin:serviceName\",\"type\":\"number\",\"direction\":\"desc\"}")) {
            mvc.perform(get("/api/logs/list").param("logSort", descriptor).param("entityId", "7")
                            .param("start", "1000").param("end", "5000"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/logs/list").param("logSort", """
                        {"version":1,"field":"attribute:duration","type":"number","direction":"desc"}
                        """).param("sort", "oldest").param("entityId", "7"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service, admission);
    }
}
