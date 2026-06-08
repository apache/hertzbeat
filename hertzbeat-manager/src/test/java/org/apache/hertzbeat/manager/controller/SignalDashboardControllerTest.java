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

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
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
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
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
 * Test case for {@link SignalDashboardController}.
 */
@ExtendWith(MockitoExtension.class)
class SignalDashboardControllerTest {

    private static final String USER = "operator";

    private MockMvc mockMvc;

    @Mock
    private SignalDashboardService signalDashboardService;

    @InjectMocks
    private SignalDashboardController signalDashboardController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(signalDashboardController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    @Test
    void listSignalDashboardsUsesCurrentUser() throws Exception {
        SignalDashboard dashboard = SignalDashboard.builder()
                .id(1L)
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .layout("[]")
                .widgets("[]")
                .version("v1")
                .build();
        when(signalDashboardService.listSignalDashboards(USER)).thenReturn(List.of(dashboard));

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(get("/api/signal/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data[0].dashboardKey").value("signals-overview"))
                    .andExpect(jsonPath("$.data[0].version").value("v1"));
        }

        verify(signalDashboardService).listSignalDashboards(USER);
    }

    @Test
    void upsertSignalDashboardUsesCurrentUser() throws Exception {
        SignalDashboard saved = SignalDashboard.builder()
                .id(9L)
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .layout("[]")
                .widgets("[]")
                .version("v1")
                .build();
        when(signalDashboardService.upsertSignalDashboard(any(String.class), any(SignalDashboard.class)))
                .thenReturn(saved);

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/dashboard")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "dashboardKey": "signals-overview",
                                      "title": "Signals overview",
                                      "layout": "[]",
                                      "widgets": "[]",
                                      "version": "v1"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.id").value(9))
                    .andExpect(jsonPath("$.data.dashboardKey").value("signals-overview"));
        }

        verify(signalDashboardService).upsertSignalDashboard(any(String.class), any(SignalDashboard.class));
    }

    @Test
    void guestCannotUpsertSharedSignalDashboard() throws Exception {
        try (var ignored = bindUser("viewer", "guest")) {
            mockMvc.perform(put("/api/signal/dashboard")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "dashboardKey": "signals-overview",
                                      "title": "Signals overview",
                                      "layout": "[]",
                                      "widgets": "[]",
                                      "version": "v1"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }

        verify(signalDashboardService, never()).upsertSignalDashboard(any(String.class), any(SignalDashboard.class));
    }

    @Test
    void deleteSignalDashboardUsesCurrentUser() throws Exception {
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(delete("/api/signal/dashboard/signals-overview"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Signal dashboard deleted successfully"));
        }

        verify(signalDashboardService).deleteSignalDashboard(USER, "signals-overview");
    }

    @Test
    void guestCannotDeleteSharedSignalDashboard() throws Exception {
        try (var ignored = bindUser("viewer", "guest")) {
            mockMvc.perform(delete("/api/signal/dashboard/signals-overview"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }

        verify(signalDashboardService, never()).deleteSignalDashboard(any(String.class), any(String.class));
    }

    @Test
    void unauthenticatedRequestDoesNotCallService() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenThrow(new RuntimeException("missing user"));

            mockMvc.perform(get("/api/signal/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalDashboardService, never()).listSignalDashboards(any(String.class));
    }

    @Test
    void nullPrincipalDoesNotCallService() throws Exception {
        try (var ignored = bindUser(null)) {
            mockMvc.perform(get("/api/signal/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalDashboardService, never()).listSignalDashboards(any(String.class));
    }

    private AutoCloseable bindUser(String user) {
        return bindUser(user, "admin", "user", "guest");
    }

    private AutoCloseable bindUser(String user, String... roles) {
        SubjectSum subjectSum = mock(SubjectSum.class);
        Set<String> roleSet = Set.copyOf(Arrays.asList(roles));
        when(subjectSum.getPrincipal()).thenReturn(user);
        org.mockito.Mockito.lenient()
                .when(subjectSum.hasRole(any(String.class)))
                .thenAnswer(invocation -> roleSet.contains(invocation.getArgument(0)));
        var mockedStatic = mockStatic(SurenessContextHolder.class);
        mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
        return mockedStatic;
    }
}
