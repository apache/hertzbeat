package org.apache.hertzbeat.templatehub.controller;

import com.usthe.sureness.util.JsonWebTokenUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.DTO.LoginDto;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@RestController
@RequestMapping("/auth")
@Slf4j
public class AccountController {

    @Autowired
    private AccountService accountService;

    private static final String TOKEN_SPLIT = "--";

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
    public ResponseEntity<Message<String>> accountRegister(@RequestBody @Validated LoginDto account) {

        if (accountService.registerAccount(account)) {
            Message<String> message=Message.success("sign up success, login after");
            if (log.isDebugEnabled()) {
                log.debug("account: {}, sign up success", account);
            }
            return ResponseEntity.ok(message);
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"username already exist"));
        }
    }
}
