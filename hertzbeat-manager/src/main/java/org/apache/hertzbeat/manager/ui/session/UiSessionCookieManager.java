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

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Owns the names, paths, lifetime, and transport attributes of UI session cookies.
 */
@Component
public class UiSessionCookieManager {

    static final String ACCESS_COOKIE = "hertzbeat_ui_access";
    static final String REFRESH_COOKIE = "hertzbeat_ui_refresh";

    private static final String ACCESS_PATH = "/api";
    private static final String REFRESH_PATH = "/api/ui/session";
    private static final String SAME_SITE = "Strict";

    String accessToken(HttpServletRequest request) {
        return cookie(request, ACCESS_COOKIE);
    }

    String refreshToken(HttpServletRequest request) {
        return cookie(request, REFRESH_COOKIE);
    }

    boolean hasSessionCookie(HttpServletRequest request) {
        return accessToken(request) != null || refreshToken(request) != null;
    }

    void write(HttpServletRequest request, HttpServletResponse response, UiSessionTokens tokens) {
        boolean secure = isSecure(request);
        add(response, cookie(ACCESS_COOKIE, tokens.accessToken(), ACCESS_PATH,
                maxAge(tokens.accessExpiresAt()), secure));
        add(response, cookie(REFRESH_COOKIE, tokens.refreshToken(), REFRESH_PATH,
                maxAge(tokens.refreshExpiresAt()), secure));
    }

    void clear(HttpServletRequest request, HttpServletResponse response) {
        boolean secure = isSecure(request);
        add(response, cookie(ACCESS_COOKIE, "", ACCESS_PATH, Duration.ZERO, secure));
        add(response, cookie(REFRESH_COOKIE, "", REFRESH_PATH, Duration.ZERO, secure));
    }

    boolean isSecure(HttpServletRequest request) {
        if (request.isSecure()) {
            return true;
        }
        String forwardedProto = first(request.getHeader("X-Forwarded-Proto"));
        if ("https".equalsIgnoreCase(forwardedProto)) {
            return true;
        }
        return forwardedProtoIsHttps(request.getHeader("Forwarded"));
    }

    private static String cookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return StringUtils.trimToNull(cookie.getValue());
            }
        }
        return null;
    }

    private static ResponseCookie cookie(String name, String value, String path, Duration maxAge, boolean secure) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(SAME_SITE)
                .path(path)
                .maxAge(maxAge)
                .build();
    }

    private static Duration maxAge(Instant expiry) {
        if (expiry == null) {
            return Duration.ofSeconds(-1);
        }
        return Duration.ofSeconds(Math.max(1, Duration.between(Instant.now(), expiry).getSeconds()));
    }

    private static void add(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static String first(String value) {
        if (value == null) {
            return null;
        }
        int separator = value.indexOf(',');
        return (separator < 0 ? value : value.substring(0, separator)).trim();
    }

    private static boolean forwardedProtoIsHttps(String value) {
        String first = first(value);
        if (first == null) {
            return false;
        }
        for (String parameter : first.split(";")) {
            String[] pair = parameter.trim().split("=", 2);
            if (pair.length == 2 && "proto".equalsIgnoreCase(pair[0].trim())) {
                String proto = pair[1].trim();
                if (proto.length() >= 2 && proto.startsWith("\"") && proto.endsWith("\"")) {
                    proto = proto.substring(1, proto.length() - 1);
                }
                return "https".equalsIgnoreCase(proto);
            }
        }
        return false;
    }
}
