package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.annotations.Api;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.usthe.common.util.CommonConstants.MONITOR_LOGIN_FAILED;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 认证注册TOKEN管理API
 *
 *
 */
@Api(tags = "认证注册TOKEN管理API")
@RestController()
@RequestMapping(value = "/account/auth", produces = {APPLICATION_JSON_VALUE})
public class AccountController {

    /**
     * account data provider
     */
    private SurenessAccountProvider accountProvider = new DocumentAccountProvider();

    /**
     * 账户密码登陆获取token
     * @param requestBody request
     * @return token与refresh token
     *
     */
    @PostMapping("/form")
    public ResponseEntity<Message> authGetToken(@RequestBody Map<String,String> requestBody) {

        String identifier = requestBody.get("identifier");
        String password = requestBody.get("password");
        SurenessAccount account = accountProvider.loadAccount(identifier);
        if (account == null || account.getPassword() == null) {
            Message<Void> message = Message.<Void>builder().msg("账户密码错误")
                    .code(MONITOR_LOGIN_FAILED).build();
            return ResponseEntity.ok(message);
        } else {
            if (account.getSalt() != null) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                Message<Void> message = Message.<Void>builder().msg("账户密码错误")
                        .code(MONITOR_LOGIN_FAILED).build();
                return ResponseEntity.ok(message);
            }
            if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
                Message<Void> message = Message.<Void>builder().msg("账户过期或被锁定")
                        .code(MONITOR_LOGIN_FAILED).build();
                return ResponseEntity.ok(message);
            }
        }
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        long periodTime = 3600L;
        // issue jwt
        String jwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), identifier,
                "token-server", periodTime, roles);
        // issue refresh jwt
        String refreshJwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), identifier,
                "token-server-refresh", periodTime, roles);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", jwt);
        resp.put("refreshToken", refreshJwt);
        return ResponseEntity.ok().body(new Message(resp));
    }

    /**
     * 账户密码登陆获取token
     * @param requestBody request
     * @return token与refresh token
     *
     */
    @PostMapping("/refresh")
    public ResponseEntity<Message> refreshToken(@RequestBody Map<String,String> requestBody) {

        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String identifier = String.valueOf(subjectSum.getPrincipal());

        // Get the roles the user has - rbac
        List<String> roles = (List<String>) subjectSum.getRoles();
        long periodTime = 3600L;
        // issue jwt
        String jwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), identifier,
                "token-server", periodTime, roles);
        // issue refresh jwt
        String refreshJwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), identifier,
                "token-server-refresh", periodTime, roles);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", jwt);
        resp.put("refreshToken", refreshJwt);
        return ResponseEntity.ok().body(new Message<>(resp));
    }

}
