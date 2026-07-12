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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.util.JsonWebTokenUtil;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class UiSessionControllerTest {

    private static final String SECRET = "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2RwpCyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
            + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp";

    private MockMvc mockMvc;

    @InjectMocks
    private UiSessionController controller;

    @Mock
    private AccountService accountService;

    @BeforeEach
    void setUp() {
        JsonWebTokenUtil.setDefaultSecretKey(SECRET);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void loginStoresTokensOnlyInHttpOnlyCookies() throws Exception {
        LoginDto login = LoginDto.builder().identifier("admin").credential("hertzbeat").build();
        String access = accessToken("admin", List.of("admin"));
        String refresh = JsonWebTokenUtil.issueJwt("admin", 3600L, Collections.singletonMap("refresh", true));
        when(accountService.authGetToken(login)).thenReturn(Map.of(
                "token", access, "refreshToken", refresh, "role", "[\"admin\"]"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session")
                        .secure(true)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(login)))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(UiSessionController.ACCESS_COOKIE, true))
                .andExpect(cookie().httpOnly(UiSessionController.REFRESH_COOKIE, true))
                .andExpect(cookie().httpOnly(UiSessionController.CSRF_COOKIE, false))
                .andExpect(cookie().secure(UiSessionController.ACCESS_COOKIE, true))
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andExpect(jsonPath("$.data.roles[0]").value("admin"))
                .andExpect(jsonPath("$.data.workspaceId").value(AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .andExpect(jsonPath("$.data.token").doesNotExist())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }

    @Test
    void readsAndRotatesSessionCookies() throws Exception {
        String access = accessToken("operator", List.of("user"));
        mockMvc.perform(MockMvcRequestBuilders.get("/api/ui/session")
                        .cookie(new jakarta.servlet.http.Cookie(UiSessionController.ACCESS_COOKIE, access)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(jsonPath("$.data.username").value("operator"));

        String refresh = JsonWebTokenUtil.issueJwt("operator", 3600L,
                Collections.singletonMap("refresh", true));
        String rotatedAccess = accessToken("operator", List.of("user"));
        String rotatedRefresh = JsonWebTokenUtil.issueJwt("operator", 7200L,
                Collections.singletonMap("refresh", true));
        when(accountService.refreshToken(refresh)).thenReturn(new RefreshTokenResponse(rotatedAccess, rotatedRefresh));
        mockMvc.perform(MockMvcRequestBuilders.post("/api/ui/session/refresh")
                        .cookie(new jakarta.servlet.http.Cookie(UiSessionController.REFRESH_COOKIE, refresh)))
                .andExpect(status().isOk())
                .andExpect(cookie().value(UiSessionController.ACCESS_COOKIE, rotatedAccess))
                .andExpect(cookie().value(UiSessionController.REFRESH_COOKIE, rotatedRefresh));
    }

    @Test
    void logoutExpiresAllCookies() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/ui/session"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(UiSessionController.ACCESS_COOKIE, 0))
                .andExpect(cookie().maxAge(UiSessionController.REFRESH_COOKIE, 0))
                .andExpect(cookie().maxAge(UiSessionController.CSRF_COOKIE, 0));
    }

    private String accessToken(String subject, List<String> roles) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION);
        claims.put(AuthTokenScopes.CLAIM_WORKSPACE_ID, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        return JsonWebTokenUtil.issueJwt(subject, 3600L, roles, claims);
    }
}
