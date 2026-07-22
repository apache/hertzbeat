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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.util.JsonWebTokenUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.pojo.dto.TokenDto;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UiSessionServiceTest {

    private static final String JWT_SECRET = "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp"
            + "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
            + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9"
            + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp";

    @Mock
    private AccountService accountService;

    private UiSessionService service;

    @BeforeEach
    void setUp() {
        JsonWebTokenUtil.setDefaultSecretKey(JWT_SECRET);
        service = new UiSessionService(accountService);
    }

    @Test
    void loginReturnsSessionMetadataWhileKeepingTokensInternal() throws Exception {
        LoginDto login = LoginDto.builder().type((byte) 1).identifier("admin").credential("secret").build();
        String accessToken = accessToken("admin", List.of("admin"), AuthTokenScopes.DEFAULT_WORKSPACE_ID, 3600);
        String refreshToken = JsonWebTokenUtil.issueJwt("admin", 7200L, Map.of("refresh", true));
        when(accountService.authGetToken(login)).thenReturn(Map.of(
                "token", accessToken,
                "refreshToken", refreshToken,
                "role", "[\"admin\"]"));
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);

        UiSessionTokens result = service.login(login);

        assertTrue(result.session().authenticated());
        assertEquals("admin", result.session().username());
        assertEquals(List.of("admin"), result.session().roles());
        assertEquals(AuthTokenScopes.DEFAULT_WORKSPACE_ID, result.session().workspaceId());
        assertNotNull(result.session().expiresAt());
        assertFalse(result.toString().contains(accessToken));
        assertFalse(result.toString().contains(refreshToken));
    }

    @Test
    void inspectTreatsMissingMalformedExpiredWrongScopeAndDisabledAccountAsAnonymous() {
        assertEquals(UiSessionView.anonymous(), service.inspect(null));
        assertEquals(UiSessionView.anonymous(), service.inspect("caller-token"));
        assertEquals(UiSessionView.anonymous(), service.inspect(
                accessToken("admin", List.of("admin"), "team-a", -1)));

        String wrongScope = token("admin", List.of("admin"), AuthTokenScopes.API_ADMIN, "team-a", 3600);
        assertEquals(UiSessionView.anonymous(), service.inspect(wrongScope));

        String inactiveAccount = accessToken("admin", List.of("admin"), "team-a", 3600);
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn("disabled");
        assertEquals(UiSessionView.anonymous(), service.inspect(inactiveAccount));
    }

    @Test
    void refreshDelegatesRefreshTypeAndAccountValidationThenRotatesBothTokens() throws Exception {
        String oldRefresh = "refresh-cookie-value";
        String newAccess = accessToken("admin", List.of("admin"), null, 3600);
        String newRefresh = JsonWebTokenUtil.issueJwt("admin", 7200L, Map.of("refresh", true));
        when(accountService.refreshToken(oldRefresh)).thenReturn(new RefreshTokenResponse(newAccess, newRefresh));
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);

        UiSessionTokens result = service.refresh(oldRefresh);

        assertEquals(AuthTokenScopes.DEFAULT_WORKSPACE_ID, result.session().workspaceId());
        assertEquals(newAccess, result.accessToken());
        assertEquals(newRefresh, result.refreshToken());
        verify(accountService).refreshToken(oldRefresh);
    }

    @Test
    void authenticationDtosDoNotRenderCredentialsOrTokens() {
        String secret = "credential-value-not-for-logs";

        assertFalse(LoginDto.builder().credential(secret).build().toString().contains(secret));
        assertFalse(TokenDto.builder().token(secret).build().toString().contains(secret));
        assertFalse(new RefreshTokenResponse(secret, secret).toString().contains(secret));
    }

    private static String accessToken(String username, List<String> roles, String workspaceId, long seconds) {
        return token(username, roles, AuthTokenScopes.UI_SESSION, workspaceId, seconds);
    }

    private static String token(String username, List<String> roles, String scope, String workspaceId, long seconds) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(AuthTokenScopes.CLAIM_TOKEN_SCOPE, scope);
        if (workspaceId != null) {
            claims.put(AuthTokenScopes.CLAIM_WORKSPACE_ID, workspaceId);
        }
        return JsonWebTokenUtil.issueJwt(username, seconds, roles, claims);
    }
}
