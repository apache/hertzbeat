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

import static org.apache.hertzbeat.common.constants.CommonConstants.LOGIN_FAILED_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HttpOnly-cookie session API used by the browser UI.
 */
@RestController
@RequestMapping(path = "/api/ui/session", produces = APPLICATION_JSON_VALUE)
public class UiSessionController {

    private static final String LOGIN_FAILED = "ui_session_login_failed";
    private static final String REFRESH_FAILED = "ui_session_refresh_failed";

    private final UiSessionService service;
    private final UiSessionCookieManager cookies;

    public UiSessionController(UiSessionService service, UiSessionCookieManager cookies) {
        this.service = service;
        this.cookies = cookies;
    }

    @GetMapping
    public ResponseEntity<Message<UiSessionView>> get(HttpServletRequest request, HttpServletResponse response) {
        String accessToken = cookies.accessToken(request);
        UiSessionView session = service.inspect(accessToken);
        if (accessToken != null && !session.authenticated()) {
            cookies.clear(request, response);
        }
        return response(Message.success(session));
    }

    @PostMapping(consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Message<UiSessionView>> login(
            @Valid @RequestBody LoginDto login, HttpServletRequest request, HttpServletResponse response) {
        try {
            UiSessionTokens tokens = service.login(login);
            cookies.write(request, response, tokens);
            return response(Message.success(tokens.session()));
        } catch (Exception ignored) {
            cookies.clear(request, response);
            return response(Message.fail(LOGIN_FAILED_CODE, LOGIN_FAILED));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<Message<UiSessionView>> refresh(
            HttpServletRequest request, HttpServletResponse response) {
        try {
            UiSessionTokens tokens = service.refresh(cookies.refreshToken(request));
            cookies.write(request, response, tokens);
            return response(Message.success(tokens.session()));
        } catch (Exception ignored) {
            cookies.clear(request, response);
            return response(Message.fail(LOGIN_FAILED_CODE, REFRESH_FAILED));
        }
    }

    @DeleteMapping
    public ResponseEntity<Message<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        cookies.clear(request, response);
        return response(Message.success());
    }

    private static <T> ResponseEntity<Message<T>> response(Message<T> message) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(message);
    }
}
