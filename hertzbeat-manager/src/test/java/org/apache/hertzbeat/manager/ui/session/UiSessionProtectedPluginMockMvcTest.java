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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.mgt.SecurityManager;
import com.usthe.sureness.processor.exception.ExpiredCredentialsException;
import com.usthe.sureness.processor.exception.UnauthorizedException;
import com.usthe.sureness.processor.exception.UnknownAccountException;
import com.usthe.sureness.subject.SubjectSum;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.config.SurenessSpring7ServletFilter;
import org.apache.hertzbeat.manager.controller.PluginController;
import org.apache.hertzbeat.manager.service.PluginParameterService;
import org.apache.hertzbeat.manager.service.PluginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UiSessionProtectedPluginMockMvcTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PluginService pluginService = mock(PluginService.class);
        when(pluginService.getPlugins(null, 0, 8))
                .thenReturn(new PageImpl<>(java.util.List.of(), PageRequest.of(0, 8), 0));
        PluginController controller = new PluginController(pluginService, mock(PluginParameterService.class));
        SecurityManager securityManager = mock(SecurityManager.class);
        SubjectSum admin = mock(SubjectSum.class);
        when(admin.hasRole("admin")).thenReturn(true);
        UiSessionService sessionService = mock(UiSessionService.class);
        when(sessionService.inspect("valid-access")).thenReturn(new UiSessionView(
                true, "admin", java.util.List.of("admin"), "default", java.time.Instant.now().plusSeconds(3600)));
        when(sessionService.inspect("expired-access")).thenReturn(UiSessionView.anonymous());
        when(securityManager.checkIn(any())).thenAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
            if ("Bearer valid-access".equals(authorization)) {
                return admin;
            }
            if ("Bearer expired-access".equals(authorization)) {
                throw new ExpiredCredentialsException("expired");
            }
            if ("Bearer user-access".equals(authorization) || "Bearer guest-access".equals(authorization)) {
                throw new UnauthorizedException("role cannot manage plugins");
            }
            throw new UnknownAccountException("anonymous");
        });
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .addFilters(
                        new UiSessionCookieAuthenticationFilter(new UiSessionCookieManager(), sessionService),
                        new SurenessSpring7ServletFilter(securityManager))
                .build();
    }

    @Test
    void protectedPluginAcceptsCookieButRejectsAnonymousAndExpiredCookie() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin")
                        .cookie(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "valid-access")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin")
                        .cookie(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, "expired-access")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    void protectedPluginRejectsDirectUserAndGuestApiRequests() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer user-access"))
                .andExpect(status().isForbidden());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer guest-access"))
                .andExpect(status().isForbidden());
    }
}
