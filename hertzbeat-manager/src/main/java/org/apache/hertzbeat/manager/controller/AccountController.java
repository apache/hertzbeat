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
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.jsonwebtoken.ExpiredJwtException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import javax.naming.AuthenticationException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.ResponseUtil;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.pojo.dto.TokenDto;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication registration TOKEN management API
 */
@Tag(name = "Auth Manage API")
@RestController
@RequestMapping(value = "/api/account/auth", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AccountController {

    @Autowired
    private AccountService accountService;

    @PostMapping("/form")
    @Operation(summary = "Account password login to obtain associated user information", description = "Account password login to obtain associated user information")
    public ResponseEntity<Message<Map<String, String>>> authGetToken(@Valid @RequestBody LoginDto loginDto) {
        return ResponseUtil.handle(() -> accountService.authGetToken(loginDto));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Use refresh TOKEN to re-acquire TOKEN", description = "Use refresh TOKEN to re-acquire TOKEN")
    public ResponseEntity<Message<RefreshTokenResponse>> refreshToken(@Valid @RequestBody TokenDto tokenDto) {
        try {
            return ResponseEntity.ok(Message.success(accountService.refreshToken(tokenDto.getToken())));
        } catch (AuthenticationException e) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, e.getMessage()));
        } catch (ExpiredJwtException expiredJwtException) {
            log.warn("{}", expiredJwtException.getMessage());
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "Refresh Token Expired"));
        } catch (Exception e) {
            log.error("Exception occurred during token refresh: {}", e.getClass().getName(), e);
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "Refresh Token Error"));
        }
    }
}
