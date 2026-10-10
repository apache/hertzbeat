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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.manager.service.entity.EntityServicePerformanceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceAccessService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class EntityServicePerformanceControllerTest {
    @org.junit.jupiter.api.Test
    void missingRequiredWindowUsesLocalBadRequestWithActualAdvice() throws Exception {
        var service = mock(EntityServicePerformanceReadModelService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new EntityServicePerformanceController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(MockMvcRequestBuilders.get("/api/entities/services/red"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"sort=unknown", "order=sideways", "pageIndex=-1", "pageIndex=wrong", "start=wrong", "pageSize=501", "end=1000", "end=86401001"})
    void invalidRequestsUseActualBadRequestAdvice(String invalid) throws Exception {
        var access = mock(EntityWorkspaceAccessService.class);
        when(access.currentRequestWorkspaceId()).thenReturn("team-a");
        var service = new EntityServicePerformanceReadModelService(null, access, null, null, null);
        var controller = new EntityServicePerformanceController(service);
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
        String[] pair = invalid.split("=");
        mvc.perform(MockMvcRequestBuilders.get("/api/entities/services/red")
                        .param("start", pair[0].equals("start") ? pair[1] : "1000").param("end", pair[0].equals("end") ? pair[1] : "61000")
                        .param(pair[0], pair[1]))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("msg").value("observability_query_context_invalid"));
    }
}
