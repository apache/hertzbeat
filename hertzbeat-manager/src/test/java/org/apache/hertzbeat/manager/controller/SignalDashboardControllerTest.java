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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
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
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
import org.apache.hertzbeat.manager.service.impl.SignalDashboardConflictException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
    void documentOnlyRequestDoesNotRequireLegacyCompositionFields() throws Exception {
        when(signalDashboardService.upsertSignalDashboard(any(String.class), any(SignalDashboard.class)))
                .thenReturn(SignalDashboard.builder().dashboardKey("document-only").build());
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"dashboardKey":"document-only","version":"hertzbeat-perses-v1",
                                     "document":{"kind":"Dashboard","metadata":{"name":"document-only","project":"hertzbeat"},
                                     "spec":{"display":{"name":"Document only"},"duration":"30m","variables":[],
                                     "panels":{},"layouts":[{"kind":"Grid","spec":{"items":[]}}]}}}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE));
        }
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
            mockMvc.perform(delete("/api/signal/dashboard/signals-overview").param("revision", "0"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Signal dashboard deleted successfully"));
        }

        verify(signalDashboardService).deleteSignalDashboard(USER, "signals-overview", 0);
    }

    @Test
    void guestCannotDeleteSharedSignalDashboard() throws Exception {
        try (var ignored = bindUser("viewer", "guest")) {
            mockMvc.perform(delete("/api/signal/dashboard/signals-overview").param("revision", "0"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }

        verify(signalDashboardService, never()).deleteSignalDashboard(any(String.class), any(String.class), anyLong());
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

    @Test
    void deleteRequiresRevision() throws Exception {
        mockMvc.perform(delete("/api/signal/dashboard/signals-overview"))
                .andExpect(status().isBadRequest());
        verify(signalDashboardService, never()).deleteSignalDashboard(any(), any(), anyLong());
    }

    @Test
    void staleAndNativeOptimisticConflictsReturn409() throws Exception {
        for (RuntimeException exception : List.of(new SignalDashboardConflictException(),
                new OptimisticLockingFailureException("stale"), new jakarta.persistence.OptimisticLockException("stale"))) {
            doThrow(exception).when(signalDashboardService).upsertSignalDashboard(any(), any());
            try (var ignored = bindUser(USER)) {
                mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                                .content("{\"dashboardKey\":\"race\"}"))
                        .andExpect(status().isConflict())
                        .andExpect(jsonPath("$.msg").value("signal_dashboard_revision_conflict"));
            }
        }
    }

    @Test
    void onlyDuplicateKeyIntegrityFailuresReturn409() throws Exception {
        for (SQLException cause : List.of(new SQLException("duplicate", "23505"), new SQLException("duplicate", "23000", 1062),
                new SQLException("not null", "23502"))) {
            doThrow(new DataIntegrityViolationException("storage", cause))
                    .when(signalDashboardService).upsertSignalDashboard(any(), any());
            try (var ignored = bindUser(USER)) {
                mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                                .content("{\"dashboardKey\":\"race\"}"))
                        .andExpect(status().is(cause.getSQLState().equals("23502") ? 500 : 409));
            }
        }
    }

    @Test
    void unavailableDatabaseReturnsStorageFailure() throws Exception {
        when(signalDashboardService.upsertSignalDashboard(any(), any()))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("database unavailable"));
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"dashboardKey\":\"unavailable\"}"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.msg").value("signal_dashboard_storage_failed"));
        }
    }

    @Test
    void invalidDocumentReturns400() throws Exception {
        when(signalDashboardService.upsertSignalDashboard(any(), any()))
                .thenThrow(new IllegalArgumentException("signal_dashboard_document_invalid"));
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"dashboardKey\":\"invalid\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value("signal_dashboard_document_invalid"));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"admin", "user"})
    void eachWriterRoleCanSaveAndDelete(String role) throws Exception {
        when(signalDashboardService.upsertSignalDashboard(any(), any())).thenReturn(
                SignalDashboard.builder().dashboardKey("roles").revision(0L).build());
        try (var ignored = bindUser(USER, role)) {
            mockMvc.perform(put("/api/signal/dashboard").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"dashboardKey\":\"roles\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.revision").value(0))
                    .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasKey("document")))
                    .andExpect(jsonPath("$.data.document").value(org.hamcrest.Matchers.nullValue()));
            mockMvc.perform(delete("/api/signal/dashboard/roles").param("revision", "0"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.code").value((int) SUCCESS_CODE));
        }
        verify(signalDashboardService).deleteSignalDashboard(USER, "roles", 0);
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
