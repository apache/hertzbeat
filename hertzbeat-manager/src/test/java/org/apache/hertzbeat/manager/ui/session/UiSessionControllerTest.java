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

package org.apache.hertzbeat.manager.ui.session;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import javax.naming.AuthenticationException;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class UiSessionControllerTest {

    @Mock
    private UiSessionService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new UiSessionController(service, new UiSessionCookieManager())).build();
    }

    @Test
    void anonymousGetReturnsExactAnonymousEnvelope() throws Exception {
        when(service.inspect(null)).thenReturn(UiSessionView.anonymous());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/ui/session"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.authenticated").value(false))
                .andExpect(jsonPath("$.data.username").value(nullValue()))
                .andExpect(jsonPath("$.data.roles").isEmpty())
                .andExpect(jsonPath("$.data.workspaceId").value(nullValue()))
                .andExpect(jsonPath("$.data.expiresAt").value(nullValue()));
    }

    @Test
    void loginSetsStrictHttpOnlySecureCookiesWithoutReturningTokens() throws Exception {
        UiSessionTokens tokens = tokens();
        when(service.login(any(LoginDto.class))).thenReturn(tokens);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session")
                        .header("X-Forwarded-Proto", "https")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":1,\"identifier\":\"admin\",\"credential\":\"secret\"}"))
                .andExpect(status().isOk())
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                        .anyMatch(value -> value.contains(
                                UiSessionCookieManager.ACCESS_COOKIE + "=access-cookie-value")
                                && value.contains("Path=/api")
                                && value.matches(".*Max-Age=[1-9][0-9]*.*"))))
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                        .anyMatch(value -> value.contains(
                                UiSessionCookieManager.REFRESH_COOKIE + "=refresh-cookie-value")
                                && value.contains("Path=/api/ui/session")
                                && value.matches(".*Max-Age=[1-9][0-9]*.*"))))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andExpect(jsonPath("$.data.roles[0]").value("admin"))
                .andExpect(jsonPath("$.data.workspaceId").value(AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .andExpect(jsonPath("$.data.expiresAt").value(tokens.session().expiresAt().toString()))
                .andExpect(jsonPath("$.data.token").doesNotExist())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(result -> assertFalse(result.getResponse().getContentAsString()
                        .contains("access-cookie-value")))
                .andExpect(result -> assertFalse(result.getResponse().getContentAsString()
                        .contains("refresh-cookie-value")));
    }

    @Test
    void loginFailureClearsBothCookiesWithoutEchoingTheCredential() throws Exception {
        when(service.login(any(LoginDto.class))).thenThrow(new AuthenticationException("caller-secret"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":1,\"identifier\":\"admin\",\"credential\":\"caller-secret\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.LOGIN_FAILED_CODE))
                .andExpect(jsonPath("$.msg").value("ui_session_login_failed"))
                .andExpect(result -> assertFalse(result.getResponse().getContentAsString()
                        .contains("caller-secret")))
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).size() == 2))
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                        .allMatch(value -> value.contains("Max-Age=0"))));
    }

    @Test
    void refreshRotatesCookiesAndFailureClearsBothWithStableSafeMessage() throws Exception {
        UiSessionTokens tokens = tokens();
        when(service.refresh("old-refresh")).thenReturn(tokens);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session/refresh")
                        .cookie(new MockCookie(UiSessionCookieManager.REFRESH_COOKIE, "old-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                        .anyMatch(value -> value.contains(
                                UiSessionCookieManager.ACCESS_COOKIE + "=access-cookie-value"))))
                .andExpect(result -> assertTrue(result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                        .anyMatch(value -> value.contains(
                                UiSessionCookieManager.REFRESH_COOKIE + "=refresh-cookie-value"))));

        when(service.refresh("bad-refresh")).thenThrow(new AuthenticationException("caller-token"));
        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session/refresh")
                        .cookie(new MockCookie(UiSessionCookieManager.REFRESH_COOKIE, "bad-refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.LOGIN_FAILED_CODE))
                .andExpect(jsonPath("$.msg").value("ui_session_refresh_failed"))
                .andExpect(jsonPath("$.msg").value(not(containsString("caller-token"))))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    void invalidGetClearsCookiesAndLogoutReturnsNullData() throws Exception {
        when(service.inspect("expired-access")).thenReturn(UiSessionView.anonymous());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/ui/session")
                        .cookie(new MockCookie(UiSessionCookieManager.ACCESS_COOKIE, "expired-access")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authenticated").value(false))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/ui/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    private static UiSessionTokens tokens() {
        Instant accessExpiry = Instant.now().plusSeconds(3600);
        return new UiSessionTokens(
                "access-cookie-value",
                "refresh-cookie-value",
                accessExpiry,
                Instant.now().plusSeconds(7200),
                new UiSessionView(true, "admin", List.of("admin"),
                        AuthTokenScopes.DEFAULT_WORKSPACE_ID, accessExpiry));
    }
}
