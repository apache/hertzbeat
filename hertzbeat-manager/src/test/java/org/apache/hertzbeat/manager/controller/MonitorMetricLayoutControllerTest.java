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
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricHistoryDock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutItem;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutConflictException;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link MonitorMetricLayoutController}.
 */
@ExtendWith(MockitoExtension.class)
class MonitorMetricLayoutControllerTest {

    @Mock
    private MonitorMetricLayoutService service;

    @InjectMocks
    private MonitorMetricLayoutController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    @Test
    void getReturnsTheAuthenticatedUsersApplicationLayout() throws Exception {
        when(service.get("operator", "mysql")).thenReturn(Optional.of(layout()));

        withUser(() -> mockMvc.perform(get("/api/metrics/layout/mysql"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.application").value("mysql"))
                .andExpect(jsonPath("$.data.revision").value("revision-1"))
                .andExpect(jsonPath("$.data.items[0].group").value("basic")));
    }

    @Test
    void putPassesExpectedRevisionAndReturnsSavedGeometry() throws Exception {
        when(service.save(org.mockito.ArgumentMatchers.eq("operator"),
                org.mockito.ArgumentMatchers.eq("mysql"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(layout());

        String request = """
                {
                  "expectedRevision":"missing",
                  "schemaVersion":1,
                  "mode":"custom",
                  "columns":12,
                  "items":[{"group":"basic","x":0,"y":0,"w":6,"h":10,"collapsed":false,"order":0}],
                  "historyDock":{"collapsed":false,"height":12}
                }
                """;
        withUser(() -> mockMvc.perform(put("/api/metrics/layout/mysql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("custom")));

        verify(service).save(org.mockito.ArgumentMatchers.eq("operator"),
                org.mockito.ArgumentMatchers.eq("mysql"), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void stalePutReturnsConflictWithoutLeakingPersistenceDetails() throws Exception {
        when(service.save(org.mockito.ArgumentMatchers.eq("operator"),
                org.mockito.ArgumentMatchers.eq("mysql"), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new MonitorMetricLayoutConflictException());

        String request = """
                {
                  "expectedRevision":"stale",
                  "schemaVersion":1,
                  "mode":"auto",
                  "columns":12,
                  "items":[],
                  "historyDock":{"collapsed":false,"height":12}
                }
                """;
        withUser(() -> mockMvc.perform(put("/api/metrics/layout/mysql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.msg").value("monitor_metric_layout_revision_conflict")));
    }

    @Test
    void deleteUsesTheOpaqueRevision() throws Exception {
        withUser(() -> mockMvc.perform(delete("/api/metrics/layout/mysql")
                        .queryParam("expectedRevision", "revision-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0)));

        verify(service).delete("operator", "mysql", "revision-1");
    }

    private static MonitorMetricLayout layout() {
        return new MonitorMetricLayout(
                "mysql",
                "revision-1",
                1,
                "custom",
                12,
                List.of(new MonitorMetricLayoutItem("basic", 0, 0, 6, 10, false, 0)),
                new MonitorMetricHistoryDock(false, 12));
    }

    private static void withUser(ThrowingAction action) throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("operator");
        try (var staticContext = mockStatic(SurenessContextHolder.class)) {
            staticContext.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            action.run();
        }
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Exception;
    }
}
