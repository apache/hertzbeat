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

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.naming.AuthenticationException;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Browser session boundary. Tokens stay in HttpOnly cookies and are never returned to the frontend.
 */
@RestController
@RequestMapping("/api/ui/session")
public class UiSessionController {

    public static final String ACCESS_COOKIE = "hb_ui_access";
    public static final String REFRESH_COOKIE = "hb_ui_refresh";
    public static final String CSRF_COOKIE = "hb_ui_csrf";

    private final AccountService accountService;

    public UiSessionController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<Message<UiSession>> login(@Valid @RequestBody LoginDto login,
                                                     HttpServletRequest request,
                                                     HttpServletResponse response) {
        try {
            Map<String, String> tokens = accountService.authGetToken(login);
            return sessionResponse(tokens.get("token"), tokens.get("refreshToken"), request, response);
        } catch (AuthenticationException exception) {
            clearCookies(request, response);
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, exception.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<Message<UiSession>> current(
            @CookieValue(name = ACCESS_COOKIE, required = false) String accessToken) {
        if (accessToken == null) {
            return ResponseEntity.ok(Message.success(UiSession.anonymous()));
        }
        try {
            return ResponseEntity.ok(Message.success(toSession(accessToken)));
        } catch (RuntimeException exception) {
            return ResponseEntity.ok(Message.success(UiSession.anonymous()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<Message<UiSession>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (refreshToken == null) {
            clearCookies(request, response);
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "Refresh token is missing"));
        }
        try {
            RefreshTokenResponse tokens = accountService.refreshToken(refreshToken);
            return sessionResponse(tokens.getToken(), tokens.getRefreshToken(), request, response);
        } catch (Exception exception) {
            clearCookies(request, response);
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "Refresh token is invalid"));
        }
    }

    @DeleteMapping
    public ResponseEntity<Message<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        clearCookies(request, response);
        return ResponseEntity.ok(Message.success(null));
    }

    private ResponseEntity<Message<UiSession>> sessionResponse(String accessToken, String refreshToken,
                                                                HttpServletRequest request,
                                                                HttpServletResponse response) {
        addCookie(response, tokenCookie(ACCESS_COOKIE, accessToken, true, request));
        addCookie(response, tokenCookie(REFRESH_COOKIE, refreshToken, true, request));
        addCookie(response, csrfCookie(UUID.randomUUID().toString(), request));
        return ResponseEntity.ok(Message.success(toSession(accessToken)));
    }

    private UiSession toSession(String accessToken) {
        Claims claims = JsonWebTokenUtil.parseJwt(accessToken);
        String scope = claims.get(AuthTokenScopes.CLAIM_TOKEN_SCOPE, String.class);
        if (!AuthTokenScopes.UI_SESSION.equals(scope)) {
            throw new IllegalArgumentException("Token is not a UI session");
        }
        Object rolesClaim = claims.get("roles");
        List<String> roles = rolesClaim instanceof List<?> values
                ? values.stream().map(String::valueOf).toList()
                : Collections.emptyList();
        String workspaceId = AuthTokenScopes.normalizeWorkspaceId(
                claims.get(AuthTokenScopes.CLAIM_WORKSPACE_ID, String.class));
        return new UiSession(true, claims.getSubject(), roles, workspaceId, claims.getExpiration().toInstant());
    }

    private void clearCookies(HttpServletRequest request, HttpServletResponse response) {
        addCookie(response, expiredCookie(ACCESS_COOKIE, true, request));
        addCookie(response, expiredCookie(REFRESH_COOKIE, true, request));
        addCookie(response, expiredCookie(CSRF_COOKIE, false, request));
    }

    private ResponseCookie tokenCookie(String name, String value, boolean httpOnly, HttpServletRequest request) {
        Claims claims = JsonWebTokenUtil.parseJwt(value);
        Duration maxAge = Duration.between(Instant.now(), claims.getExpiration().toInstant());
        return cookie(name, value, httpOnly, maxAge.isNegative() ? Duration.ZERO : maxAge, request);
    }

    private ResponseCookie csrfCookie(String value, HttpServletRequest request) {
        return cookie(CSRF_COOKIE, value, false, Duration.ofDays(7), request);
    }

    private ResponseCookie expiredCookie(String name, boolean httpOnly, HttpServletRequest request) {
        return cookie(name, "", httpOnly, Duration.ZERO, request);
    }

    private ResponseCookie cookie(String name, String value, boolean httpOnly, Duration maxAge,
                                  HttpServletRequest request) {
        return ResponseCookie.from(name, value)
                .httpOnly(httpOnly)
                .secure(isSecure(request))
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private boolean isSecure(HttpServletRequest request) {
        return request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    }

    private void addCookie(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Non-sensitive session state exposed to the browser.
     */
    public record UiSession(boolean authenticated, String username, List<String> roles,
                            String workspaceId, Instant expiresAt) {

        private static UiSession anonymous() {
            return new UiSession(false, null, List.of(), null, null);
        }
    }
}
