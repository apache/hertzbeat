/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class MonitorDefinitionControllerTest {

    private MonitorDefinitionService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(MonitorDefinitionService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new MonitorDefinitionController(service)).build();
    }

    @Test
    void catalogReturnsOnlyTheFrozenVersionedShape() throws Exception {
        when(service.catalog("en-US")).thenReturn(new MonitorDefinitionCatalogResponse(1, List.of(
                new MonitorDefinitionCatalogItem("jvm", "JVM", MonitorDefinitionOrigin.BUILTIN, false, false))));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor-definitions/v1/catalog").param("lang", "en-US"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].app").value("jvm"))
                .andExpect(jsonPath("$.data.items[0].origin").value("builtin"))
                .andExpect(jsonPath("$.data.items[0].editable").value(false))
                .andExpect(jsonPath("$.data.observedAt").doesNotExist());
    }

    @Test
    void detailReturnsCanonicalIdentityAndRawDefinition() throws Exception {
        when(service.detail("mysql", "en-US")).thenReturn(new MonitorDefinitionDetailResponse(
                1, "MySql", "MySQL", MonitorDefinitionOrigin.OVERRIDE, true, true, "app: MySql"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor-definitions/v1/mysql").param("lang", "en-US"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.app").value("MySql"))
                .andExpect(jsonPath("$.data.origin").value("override"))
                .andExpect(jsonPath("$.data.definition").value("app: MySql"));
    }

    @Test
    void validateAcceptsExactStrictRequestAndReturnsNoDefinition() throws Exception {
        when(service.validate(any())).thenReturn(new MonitorDefinitionValidationResponse(
                1, true, "custom-app", MonitorDefinitionOrigin.CUSTOM));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor-definitions/v1/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\":\"create\",\"expectedApp\":null,\"definition\":\"app: custom-app\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.app").value("custom-app"))
                .andExpect(jsonPath("$.data.origin").value("custom"))
                .andExpect(jsonPath("$.data.definition").doesNotExist());
        verify(service).validate(new MonitorDefinitionValidationRequest(
                MonitorDefinitionOperation.CREATE, null, "app: custom-app"));
    }

    @Test
    void contractFailureUsesSafeStableMessageWithoutEchoingDefinition() throws Exception {
        when(service.validate(any())).thenThrow(new MonitorDefinitionException(
                MonitorDefinitionErrorCode.INVALID_DEFINITION));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor-definitions/v1/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\":\"create\",\"expectedApp\":null,\"definition\":\"secret-yaml\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1))
                .andExpect(jsonPath("$.msg").value("monitor_definition_invalid"))
                .andExpect(content().string(not(containsString("secret-yaml"))));
    }

    @Test
    void validateRejectsUnknownAndBlankRequestFieldsWithoutEchoingThem() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor-definitions/v1/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\":\"create\",\"expectedApp\":null,\"definition\":\" \","
                                + "\"secret\":\"do-not-echo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(1))
                .andExpect(jsonPath("$.msg").value("monitor_definition_invalid"))
                .andExpect(content().string(not(containsString("do-not-echo"))));
    }
}
