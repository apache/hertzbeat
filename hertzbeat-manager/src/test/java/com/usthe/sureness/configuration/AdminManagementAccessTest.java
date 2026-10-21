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

package com.usthe.sureness.configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import com.usthe.sureness.mgt.SecurityManager;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Tests the management boundary independently of external route permissions. */
class AdminManagementAccessTest {

    @ParameterizedTest
    @ValueSource(strings = {"user", "guest", "operator", "administrator", ""})
    void nonAdminCannotUseAnyManagementVerb(String role) throws Exception {
        SubjectSum subject = mock(SubjectSum.class, role);
        for (String method : List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")) {
            for (String path : List.of("/api/monitor", "/api/monitors/import", "/api/monitors/export",
                    "/api/apps/define/yml", "/api/config/email", "/api/notice/receiver/send-test-msg",
                    "/api/mcp", "/api/ai/sop/skills", "/api/chat/conversations/1", "/api/future/operation",
                    "/actuator/metrics", "/v3/api-docs.yaml", "/h2-console/")) {
                assertEquals(403, perform(method, path, subject, true));
            }
        }
    }

    @Test
    void excludedManagementHasNoSubjectAndCannotReuseThreadIdentity() throws Exception {
        SurenessContextHolder.bindSubject(mock(SubjectSum.class));
        assertEquals(401, perform("GET", "/api/config/secret", null, true));
        assertNull(SurenessContextHolder.getBindSubject());
    }

    @Test
    void adminMustStillExistAndHoldAdminInCurrentAccountSource() throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.hasRole("admin")).thenReturn(true);
        when(subject.getPrincipal()).thenReturn("local-admin");
        assertEquals(200, perform("GET", "/api/monitor/1", subject, true));
        assertEquals(403, perform("GET", "/api/monitor/1", subject, false));
    }

    @Test
    void deletedDisabledOrLockedCurrentAccountCannotUseAnOldAdminToken() throws Exception {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.hasRole("admin")).thenReturn(true);
        when(subject.getPrincipal()).thenReturn("local-admin");
        for (String state : List.of("deleted", "disabled", "locked")) {
            SecurityManager security = mock(SecurityManager.class);
            SurenessAccountProvider accounts = mock(SurenessAccountProvider.class);
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/monitor/1");
            request.setServletPath("/api/monitor/1");
            when(security.checkIn(request)).thenReturn(subject);
            if (!state.equals("deleted")) {
                when(accounts.loadAccount("local-admin")).thenReturn(DefaultAccount.builder("local-admin")
                        .setOwnRoles(List.of("admin")).setDisabledAccount(state.equals("disabled"))
                        .setExcessiveAttempts(state.equals("locked")).build());
            }
            MockHttpServletResponse response = new MockHttpServletResponse();
            AtomicBoolean called = new AtomicBoolean();
            new SurenessJakartaServletFilter(security, accounts).doFilter(request, response, (req, res) -> called.set(true));
            assertEquals(403, response.getStatus(), state);
            assertFalse(called.get());
            assertNull(SurenessContextHolder.getBindSubject());
        }
    }

    @ParameterizedTest
    @CsvSource({"GET,/api/status/page/public/org", "GET,/api/status/page/public/component/1",
            "GET,/api/status/page/public/incident", "HEAD,/api/apps/hierarchy", "GET,/api/i18n/en-US",
            "POST,/api/account/auth/form", "POST,/api/account/auth/refresh",
            "POST,/api/push/prometheus/job/local", "POST,/api/otlp/v1/logs", "POST,/api/otlp/v1/metrics",
            "POST,/api/otlp/v1/traces", "POST,/api/logs/otlp/v1/logs", "POST,/api/logs/ingest/otlp",
            "POST,/api/v2/alerts", "GET,/actuator/health", "HEAD,/actuator/health/readiness",
            "GET,/actuator/prometheus", "GET,/assets/app-data.json", "GET,/passport/login"})
    void publicAndMachineRoutesKeepTheirExistingAuthenticationPolicy(String method, String path) throws Exception {
        assertEquals(200, perform(method, path, null, false));
    }

    @ParameterizedTest
    @CsvSource({"POST,/api/status/page/public/org", "GET,/api/status/page/public/unknown",
            "PUT,/api/push/prometheus/job/local", "GET,/api/otlp/v1/logs", "GET,/api/v2/alerts",
            "DELETE,/actuator/health", "POST,/api/i18n/en-US", "POST,/api/apps/hierarchy",
            "GET,/api/account/auth/unknown", "POST,/api/logs/ingest/unknown"})
    void exceptionsDoNotPermitOtherOperations(String method, String path) throws Exception {
        assertEquals(401, perform(method, path, null, false));
    }

    private int perform(String method, String path, SubjectSum subject, boolean currentAdmin) throws Exception {
        SecurityManager security = mock(SecurityManager.class);
        SurenessAccountProvider accounts = mock(SurenessAccountProvider.class);
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        when(security.checkIn(request)).thenReturn(subject);
        if (subject != null && subject.hasRole("admin")) {
            when(accounts.loadAccount("local-admin")).thenReturn(DefaultAccount.builder("local-admin")
                    .setOwnRoles(currentAdmin ? List.of("admin") : List.of("user"))
                    .setDisabledAccount(false).setExcessiveAttempts(false).build());
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean called = new AtomicBoolean();
        new SurenessJakartaServletFilter(security, accounts).doFilter(request, response, (req, res) -> called.set(true));
        if (response.getStatus() == 200) {
            assertTrue(called.get());
        } else {
            assertFalse(called.get());
        }
        assertNull(SurenessContextHolder.getBindSubject());
        return response.getStatus();
    }
}
