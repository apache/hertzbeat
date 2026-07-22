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

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import javax.naming.AuthenticationException;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.stereotype.Service;

/**
 * Adapts the existing account token service to a browser-safe session boundary.
 */
@Service
public class UiSessionService {

    private static final String ROLES_CLAIM = "roles";
    private static final String REFRESH_CLAIM = "refresh";
    private static final String INVALID_SESSION = "UI session is invalid";

    private final AccountService accountService;

    public UiSessionService(AccountService accountService) {
        this.accountService = accountService;
    }

    UiSessionTokens login(LoginDto login) throws AuthenticationException {
        Map<String, String> issued = accountService.authGetToken(login);
        return tokens(issued.get("token"), issued.get("refreshToken"));
    }

    UiSessionTokens refresh(String refreshToken) throws Exception {
        if (StringUtils.isBlank(refreshToken)) {
            throw new AuthenticationException(INVALID_SESSION);
        }
        RefreshTokenResponse issued = accountService.refreshToken(refreshToken);
        return tokens(issued.getToken(), issued.getRefreshToken());
    }

    public UiSessionView inspect(String accessToken) {
        if (StringUtils.isBlank(accessToken)) {
            return UiSessionView.anonymous();
        }
        try {
            Claims claims = JsonWebTokenUtil.parseJwt(accessToken);
            if (!AuthTokenScopes.UI_SESSION.equals(claims.get(AuthTokenScopes.CLAIM_TOKEN_SCOPE, String.class))) {
                return UiSessionView.anonymous();
            }
            String username = StringUtils.trimToNull(claims.getSubject());
            if (username == null) {
                return UiSessionView.anonymous();
            }
            List<String> roles = roles(claims.get(ROLES_CLAIM));
            if (accountService.checkManagedTokenAccess(username, roles) != null) {
                return UiSessionView.anonymous();
            }
            String workspaceId = AuthTokenScopes.normalizeWorkspaceId(
                    claims.get(AuthTokenScopes.CLAIM_WORKSPACE_ID, String.class));
            return new UiSessionView(true, username, roles, workspaceId, instant(claims.getExpiration()));
        } catch (RuntimeException ignored) {
            return UiSessionView.anonymous();
        }
    }

    private UiSessionTokens tokens(String accessToken, String refreshToken) throws AuthenticationException {
        if (StringUtils.isAnyBlank(accessToken, refreshToken)) {
            throw new AuthenticationException(INVALID_SESSION);
        }
        UiSessionView session = inspect(accessToken);
        if (!session.authenticated()) {
            throw new AuthenticationException(INVALID_SESSION);
        }
        try {
            Claims refreshClaims = JsonWebTokenUtil.parseJwt(refreshToken);
            if (!Boolean.TRUE.equals(refreshClaims.get(REFRESH_CLAIM, Boolean.class))) {
                throw new AuthenticationException(INVALID_SESSION);
            }
            return new UiSessionTokens(
                    accessToken,
                    refreshToken,
                    session.expiresAt(),
                    instant(refreshClaims.getExpiration()),
                    session);
        } catch (AuthenticationException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AuthenticationException(INVALID_SESSION);
        }
    }

    private static List<String> roles(Object claim) {
        if (!(claim instanceof List<?> values)) {
            return List.of();
        }
        List<String> roles = new ArrayList<>(values.size());
        for (Object value : values) {
            if (!(value instanceof String role) || StringUtils.isBlank(role)) {
                throw new IllegalArgumentException(INVALID_SESSION);
            }
            roles.add(role);
        }
        return List.copyOf(roles);
    }

    private static Instant instant(Date value) {
        return value == null ? null : value.toInstant();
    }
}
