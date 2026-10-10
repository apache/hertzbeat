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

import static org.apache.hertzbeat.common.constants.CommonConstants.LOGIN_FAILED_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.SUCCESS_CODE;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
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
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.manager.service.SignalDashboardPanelDraftService;
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
 * Test case for {@link SignalDashboardPanelDraftController}.
 */
@ExtendWith(MockitoExtension.class)
class SignalDashboardPanelDraftControllerTest {

    private static final String USER = "operator";

    private MockMvc mockMvc;

    @Mock
    private SignalDashboardPanelDraftService signalDashboardPanelDraftService;

    @InjectMocks
    private SignalDashboardPanelDraftController signalDashboardPanelDraftController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(signalDashboardPanelDraftController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    @Test
    void listSignalDashboardPanelDraftsUsesCurrentUser() throws Exception {
        SignalDashboardPanelDraft draft = SignalDashboardPanelDraft.builder()
                .id(1L)
                .signal("logs")
                .draftKey("checkout-errors-panel")
                .title("Checkout errors")
                .visualization("table")
                .route("/log/manage?search=timeout&view=table")
                .build();
        when(signalDashboardPanelDraftService.listSignalDashboardPanelDrafts(USER, "logs"))
                .thenReturn(List.of(draft));

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(get("/api/signal/dashboard-panel-draft/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data[0].draftKey").value("checkout-errors-panel"))
                    .andExpect(jsonPath("$.data[0].visualization").value("table"));
        }

        verify(signalDashboardPanelDraftService).listSignalDashboardPanelDrafts(USER, "logs");
    }

    @Test
    void upsertSignalDashboardPanelDraftUsesCurrentUser() throws Exception {
        SignalDashboardPanelDraft saved = SignalDashboardPanelDraft.builder()
                .id(9L)
                .signal("metrics")
                .draftKey("checkout-p95-panel")
                .title("Checkout p95")
                .visualization("graph")
                .route("/ingestion/otlp/metrics?query=http.server.duration")
                .build();
        when(signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft(
                any(String.class), any(SignalDashboardPanelDraft.class))).thenReturn(saved);

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/dashboard-panel-draft")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "signal": "metrics",
                                      "draftKey": "checkout-p95-panel",
                                      "title": "Checkout p95",
                                      "visualization": "graph",
                                      "route": "/ingestion/otlp/metrics?query=http.server.duration"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.id").value(9))
                    .andExpect(jsonPath("$.data.signal").value("metrics"));
        }

        verify(signalDashboardPanelDraftService)
                .upsertSignalDashboardPanelDraft(any(String.class), any(SignalDashboardPanelDraft.class));
    }

    @Test
    void deleteSignalDashboardPanelDraftUsesCurrentUser() throws Exception {
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(delete("/api/signal/dashboard-panel-draft/traces/slow-checkout-panel"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Signal dashboard panel draft deleted successfully"));
        }

        verify(signalDashboardPanelDraftService)
                .deleteSignalDashboardPanelDraft(USER, "traces", "slow-checkout-panel");
    }

    @Test
    void unauthenticatedRequestDoesNotCallService() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenThrow(new RuntimeException("missing user"));

            mockMvc.perform(get("/api/signal/dashboard-panel-draft/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalDashboardPanelDraftService, never())
                .listSignalDashboardPanelDrafts(any(String.class), any(String.class));
    }

    @Test
    void nullPrincipalDoesNotCallService() throws Exception {
        try (var ignored = bindUser(null)) {
            mockMvc.perform(get("/api/signal/dashboard-panel-draft/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalDashboardPanelDraftService, never())
                .listSignalDashboardPanelDrafts(any(String.class), any(String.class));
    }

    private AutoCloseable bindUser(String user) {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(user);
        var mockedStatic = mockStatic(SurenessContextHolder.class);
        mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        return mockedStatic;
    }
}
