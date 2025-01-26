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

package org.apache.hertzbeat.templatehub.controller;

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.ExpiredJwtException;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.exception.HertzbeatTemplateHubException;
import org.apache.hertzbeat.templatehub.model.DTO.*;
import org.apache.hertzbeat.templatehub.service.AccountService;
import org.apache.hertzbeat.templatehub.service.RoleService;
import org.apache.hertzbeat.templatehub.util.ResponseUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.naming.AuthenticationException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.templatehub.constants.CommonConstants.LOGIN_FAILED_CODE;

@RestController
@CrossOrigin(maxAge = 3600,origins = "*")
@RequestMapping("/auth")
@Slf4j
public class AccountController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private RoleService roleService;

    private static final String TOKEN_SPLIT = "--";

    @PostMapping("/login")
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

    @Deprecated
    @PostMapping("/token")
    public ResponseEntity<Message<Map<String,String>>> issueJwtToken(@RequestBody @Validated LoginDto account) {
        boolean authenticatedFlag = accountService.authenticateAccount(account);
        if (!authenticatedFlag) {
            Message<Map<String,String>> message = Message.fail(FAIL_CODE,"username or password not incorrect");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message);
        }
        List<String> ownRole = accountService.loadAccountRoles(account.getIdentifier());
        String jwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), account.getIdentifier(),
                "tom-auth-server", 3600L, ownRole);
        Message<Map<String, String>> message = Message.success(Collections.singletonMap("token", jwt));
        return ResponseEntity.ok(message);
    }

    @Deprecated
    @PostMapping("/custom/token")
    public ResponseEntity<Message<Map<String,String>>> issueCustomToken(@RequestBody @Validated LoginDto account) {
        boolean authenticatedFlag = accountService.authenticateAccount(account);
        if (!authenticatedFlag) {
            Message<Map<String,String>> message = Message.fail(FAIL_CODE,"username or password not incorrect");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message);
        }
        long refreshPeriodTime = 36000L;
        String token = account.getIdentifier() + TOKEN_SPLIT + System.currentTimeMillis()
                + TOKEN_SPLIT + refreshPeriodTime
                + TOKEN_SPLIT + UUID.randomUUID().toString().replace("-", "");
        TokenStorage.addToken(account.getIdentifier(), token);
        Map<String, String> responseData = Collections.singletonMap("customToken", token);
        Message<Map<String,String>> message = Message.success(responseData);
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<Message<String>> accountRegister(@RequestBody @Validated SignUpDto account) {
        // TODO Let the front-end pass the plaintext password here first, and then change it to an encrypted password later

        if (accountService.registerAccount(account)) {
            Long authUser = roleService.getRoleIdByCode("role_user");
            if(authUser == null) throw new HertzbeatTemplateHubException("Role query error");
            boolean b = accountService.authorityUserRole(account.getEmail(), authUser);
            if(!b) throw new HertzbeatTemplateHubException("Role authority error");
            Message<String> message=Message.success("Sign up success, login after");
            if (log.isDebugEnabled()) {
                log.debug("account: {}, sign up success", account);
            }
            return ResponseEntity.ok(message);
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Email already exist"));
        }
    }
}
