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
import io.jsonwebtoken.ExpiredJwtException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.manager.pojo.dto.LoginDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
/*todo:
1.add delete token API(when JWT is expired,cannot get userId,do we need schedule task to scan DB and delete expired JWT?)
2.add persist in DB (do we need use cache to store JWT?)
 */

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
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户密码错误")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        } else {
            String password = loginDto.getCredential();
            if (account.getSalt() != null) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户密码错误")
                        .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
                return ResponseEntity.ok(message);
            }
            if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
                Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户过期或被锁定")
                        .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
                return ResponseEntity.ok(message);
            }
        }
        Map<String, String> resp = new HashMap<>(2);
        //issue token
        issueJWTToken(account, loginDto.getIdentifier(), resp);
        return ResponseEntity.ok(new Message<>(resp));
    }

    @GetMapping("/refresh/{refreshToken}")
    @Operation(summary = "Use refresh TOKEN to re-acquire TOKEN", description = "使用刷新TOKEN重新获取TOKEN")
    public ResponseEntity<Message<Map<String, String>>> refreshToken(
            @Parameter(description = "Refresh TOKEN | 刷新TOKEN", example = "xxx")
            @PathVariable("refreshToken") @NotNull final String refreshToken) {
        String userId;
        boolean isRefresh;
        try {
            Claims claims = JsonWebTokenUtil.parseJwt(refreshToken);
            userId = String.valueOf(claims.getSubject());
            isRefresh = claims.get("refresh", Boolean.class);
        } catch (Exception e) {
            log.info(e.getMessage());
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("刷新TOKEN过期或错误")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        if (userId == null || !isRefresh) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("非法的刷新TOKEN")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("TOKEN对应的账户不存在")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        Map<String, String> resp = new HashMap<>(2);
        //issue token
        issueJWTToken(account, userId, resp);
        return ResponseEntity.ok(new Message<>(resp));
    }

    @GetMapping("/generate/token")
    @Operation(summary = "Generate a new access token", description = "获取新的access token")
    public ResponseEntity<Message<Map<String, String>>> generateToken(
            @Valid @RequestBody LoginDto loginDto) {
        SurenessAccount account = accountProvider.loadAccount(loginDto.getIdentifier());
        if (account == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("TOKEN对应的账户不存在")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        Map<String, String> resp = new HashMap<>(2);
        //issue token
        issueJWTToken(account, loginDto.getIdentifier(), resp);
        return ResponseEntity.ok(new Message<>(resp));
    }

    @GetMapping("/validate/{token}")
    @Operation(summary = "validate token ", description = "验证token可用性")
    public ResponseEntity<Message<Map<String, String>>> validateToken(
            @Parameter(description = "TOKEN", example = "xxx")
            @PathVariable("token") @NotNull final String token) {
        String userId = null;
        try {
            Claims claims = JsonWebTokenUtil.parseJwt(token);
            userId = String.valueOf(claims.getSubject());
        } catch (ExpiredJwtException e) {
            log.warn(e.getMessage());
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("Token过期")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.info(e.getMessage());
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("解析Token错误")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }

        if (userId == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("非法的TOKEN")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("TOKEN对应的账户不存在")
                    .code(CommonConstants.MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        Map<String, String> resp = new HashMap<>();
        return ResponseEntity.ok(new Message<>(resp));
    }


    private void issueJWTToken(SurenessAccount account, String userId, Map<String, String> resp) {
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN      签发TOKEN
        String issueToken = JsonWebTokenUtil.issueJwt(userId, PERIOD_TIME, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(userId, PERIOD_TIME << 5, customClaimMap);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
    }

}
