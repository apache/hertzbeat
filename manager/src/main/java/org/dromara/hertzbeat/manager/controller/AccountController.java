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

package org.dromara.hertzbeat.manager.controller;

import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.pojo.dto.LoginDto;
import org.dromara.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.dromara.hertzbeat.common.constants.CommonConstants.MONITOR_LOGIN_FAILED_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Authentication registration TOKEN management API
 * 认证注册TOKEN管理API
 *
 * @author tomsun28
 */
@Tag(name = "Auth Manage API | 认证注册TOKEN管理API")
@RestController()
@RequestMapping(value = "/api/account/auth", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AccountController {
    /**
     * Token validity time in seconds
     * TOKEN有效期时间 单位秒
     */
    private static final long PERIOD_TIME = 3600L;
    /**
     * account data provider
     */
    private SurenessAccountProvider accountProvider = new DocumentAccountProvider();

    @PostMapping("/form")
    @Operation(summary = "Account password login to obtain associated user information", description = "账户密码登录获取关联用户信息")
    public ResponseEntity<Message<Map<String, String>>> authGetToken(@Valid @RequestBody LoginDto loginDto) {
        SurenessAccount account = accountProvider.loadAccount(loginDto.getIdentifier());
        if (account == null || account.getPassword() == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Incorrect Account or Password"));
        } else {
            String password = loginDto.getCredential();
            if (account.getSalt() != null) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Incorrect Account or Password"));
            }
            if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
                return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Expired or Illegal Account"));
            }
        }
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN  
        String issueToken = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME << 5, customClaimMap);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        resp.put("role", JsonUtil.toJson(roles));
        return ResponseEntity.ok(Message.success(resp));
    }

    @GetMapping("/refresh/{refreshToken}")
    @Operation(summary = "Use refresh TOKEN to re-acquire TOKEN", description = "使用刷新TOKEN重新获取TOKEN")
    public ResponseEntity<Message<RefreshTokenResponse>> refreshToken(
            @Parameter(description = "Refresh TOKEN | 刷新TOKEN", example = "xxx")
            @PathVariable("refreshToken") @NotNull final String refreshToken) {
        try {
            Claims claims = JsonWebTokenUtil.parseJwt(refreshToken);
            String userId = String.valueOf(claims.getSubject());
            boolean isRefresh = claims.get("refresh", Boolean.class);
            if (userId == null || !isRefresh) {
                return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Illegal Refresh Token"));
            }
            SurenessAccount account = accountProvider.loadAccount(userId);
            if (account == null) {
                return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Not Exists This Token Mapping Account"));
            }
            List<String> roles = account.getOwnRoles();
            String issueToken = issueToken(userId, roles, PERIOD_TIME);
            String issueRefresh = issueToken(userId, roles, PERIOD_TIME << 5);
            RefreshTokenResponse response = new RefreshTokenResponse(issueToken, issueRefresh);
            return ResponseEntity.ok(Message.success(response));
        } catch (Exception e) {
            log.error("Exception occurred during token refresh: {}", e.getClass().getName(), e);
            return ResponseEntity.ok(Message.fail(MONITOR_LOGIN_FAILED_CODE, "Refresh Token Expired or Error"));
        }
    }

    private String issueToken(String userId, List<String> roles, long expirationMillis) {
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        return JsonWebTokenUtil.issueJwt(userId, expirationMillis, roles, customClaimMap);
    }
}
