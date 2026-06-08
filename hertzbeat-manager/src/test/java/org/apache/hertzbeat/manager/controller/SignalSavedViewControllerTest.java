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
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
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
 * Test case for {@link SignalSavedViewController}.
 */
@ExtendWith(MockitoExtension.class)
class SignalSavedViewControllerTest {

    private static final String USER = "operator";

    private MockMvc mockMvc;

    @Mock
    private SignalSavedViewService signalSavedViewService;

    @InjectMocks
    private SignalSavedViewController signalSavedViewController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(signalSavedViewController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .build();
    }

    @Test
    void listSignalSavedViewsUsesCurrentUser() throws Exception {
        SignalSavedView view = SignalSavedView.builder()
                .id(1L)
                .signal("logs")
                .viewKey("checkout-errors")
                .label("Checkout errors")
                .route("/log/manage?search=timeout")
                .build();
        when(signalSavedViewService.listSignalSavedViews(USER, "logs")).thenReturn(List.of(view));

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(get("/api/signal/saved-view/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data[0].viewKey").value("checkout-errors"))
                    .andExpect(jsonPath("$.data[0].route").value("/log/manage?search=timeout"));
        }

        verify(signalSavedViewService).listSignalSavedViews(USER, "logs");
    }

    @Test
    void upsertSignalSavedViewUsesCurrentUser() throws Exception {
        SignalSavedView saved = SignalSavedView.builder()
                .id(9L)
                .signal("metrics")
                .viewKey("checkout-p95")
                .label("Checkout p95")
                .route("/ingestion/otlp/metrics?query=http.server.duration")
                .build();
        when(signalSavedViewService.upsertSignalSavedView(any(String.class), any(SignalSavedView.class))).thenReturn(saved);

        try (var ignored = bindUser(USER)) {
            mockMvc.perform(put("/api/signal/saved-view")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "signal": "metrics",
                                      "viewKey": "checkout-p95",
                                      "label": "Checkout p95",
                                      "route": "/ingestion/otlp/metrics?query=http.server.duration"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.id").value(9))
                    .andExpect(jsonPath("$.data.signal").value("metrics"));
        }

        verify(signalSavedViewService).upsertSignalSavedView(any(String.class), any(SignalSavedView.class));
    }

    @Test
    void guestCannotUpsertSharedSignalSavedView() throws Exception {
        try (var ignored = bindUser("viewer", "guest")) {
            mockMvc.perform(put("/api/signal/saved-view")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "signal": "metrics",
                                      "viewKey": "checkout-p95",
                                      "label": "Checkout p95",
                                      "route": "/ingestion/otlp/metrics?query=http.server.duration"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }

        verify(signalSavedViewService, never()).upsertSignalSavedView(any(String.class), any(SignalSavedView.class));
    }

    @Test
    void deleteSignalSavedViewUsesCurrentUser() throws Exception {
        try (var ignored = bindUser(USER)) {
            mockMvc.perform(delete("/api/signal/saved-view/traces/slow-checkout"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) SUCCESS_CODE))
                    .andExpect(jsonPath("$.msg").value("Signal saved view deleted successfully"));
        }

        verify(signalSavedViewService).deleteSignalSavedView(USER, "traces", "slow-checkout");
    }

    @Test
    void guestCannotDeleteSharedSignalSavedView() throws Exception {
        try (var ignored = bindUser("viewer", "guest")) {
            mockMvc.perform(delete("/api/signal/saved-view/traces/slow-checkout"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }

        verify(signalSavedViewService, never()).deleteSignalSavedView(any(String.class), any(String.class), any(String.class));
    }

    @Test
    void unauthenticatedRequestDoesNotCallService() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenThrow(new RuntimeException("missing user"));

            mockMvc.perform(get("/api/signal/saved-view/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalSavedViewService, never()).listSignalSavedViews(any(String.class), any(String.class));
    }

    @Test
    void nullPrincipalDoesNotCallService() throws Exception {
        try (var ignored = bindUser(null)) {
            mockMvc.perform(get("/api/signal/saved-view/logs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) LOGIN_FAILED_CODE));
        }

        verify(signalSavedViewService, never()).listSignalSavedViews(any(String.class), any(String.class));
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
