package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.dto.LoginDto;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import io.jsonwebtoken.Claims;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.usthe.common.util.CommonConstants.MONITOR_LOGIN_FAILED_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Authentication registration TOKEN management API
 * 认证注册TOKEN管理API
 *
 * @author tomsun28
 * @date 13:11 2019-05-26
 */
@Api(tags = "Auth Manage API | 认证注册TOKEN管理API")
@RestController()
@RequestMapping(value = "/account/auth", produces = {APPLICATION_JSON_VALUE})
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
    @ApiOperation(value = "Account password login to obtain associated user information", notes = "账户密码登录获取关联用户信息")
    public ResponseEntity<Message<Map<String, String>>> authGetToken(@RequestBody LoginDto loginDto) {

        SurenessAccount account = accountProvider.loadAccount(loginDto.getIdentifier());
        if (account == null || account.getPassword() == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户密码错误")
                    .code(MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        } else {
            String password = loginDto.getCredential();
            if (account.getSalt() != null) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户密码错误")
                        .code(MONITOR_LOGIN_FAILED_CODE).build();
                return ResponseEntity.ok(message);
            }
            if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
                Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("账户过期或被锁定")
                        .code(MONITOR_LOGIN_FAILED_CODE).build();
                return ResponseEntity.ok(message);
            }
        }
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN      签发TOKEN
        String issueToken = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME << 5, customClaimMap);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        return ResponseEntity.ok(new Message<>(resp));
    }

    @GetMapping("/refresh/{refreshToken}")
    @ApiOperation(value = "Use refresh TOKEN to re-acquire TOKEN", notes = "使用刷新TOKEN重新获取TOKEN")
    public ResponseEntity<Message<Map<String, String>>> refreshToken(
            @ApiParam(value = "en: Refresh TOKEN,zh: 刷新TOKEN", example = "xxx")
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
                    .code(MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        if (userId == null || !isRefresh) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("非法的刷新TOKEN")
                    .code(MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null) {
            Message<Map<String, String>> message = Message.<Map<String, String>>builder().msg("TOKEN对应的账户不存在")
                    .code(MONITOR_LOGIN_FAILED_CODE).build();
            return ResponseEntity.ok(message);
        }
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN      签发TOKEN
        String issueToken = JsonWebTokenUtil.issueJwt(userId, PERIOD_TIME, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(userId, PERIOD_TIME << 5, customClaimMap);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        return ResponseEntity.ok(new Message<>(resp));
    }

}
