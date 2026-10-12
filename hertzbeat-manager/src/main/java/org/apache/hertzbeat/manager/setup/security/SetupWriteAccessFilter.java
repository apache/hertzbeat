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

package org.apache.hertzbeat.manager.setup.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupErrorResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/** Requires the opaque unlock cookie for remote setup mutations. */
public final class SetupWriteAccessFilter extends OncePerRequestFilter {
    private final SetupHttpUnlockService unlock;
    private final Clock clock;

    public SetupWriteAccessFilter(SetupHttpUnlockService unlock, Clock clock) {
        this.unlock = unlock;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!unlock.requiresUnlock(request)) {
            return true;
        }
        String path = request.getServletPath();
        return !path.startsWith("/api/setup/")
                || SetupApiContract.STATUS_PATH.equals(path)
                || SetupApiContract.UNLOCK_PATH.equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (unlock.permits(cookie(request), request)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(JsonUtil.toJson(
                new SetupErrorResponse(SetupErrorCode.SETUP_LOCKED, clock.instant())));
    }

    private static String cookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (SetupAccessCookie.NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
