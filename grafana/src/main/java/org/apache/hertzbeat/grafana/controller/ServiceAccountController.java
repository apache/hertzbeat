package org.apache.hertzbeat.grafana.controller;


import com.dtflys.forest.http.ForestResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.grafana.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Service Account API
 * @author zqr10159
 */
@Tag(name = "Service Account API | 服务账号API")
@RestController
@RequestMapping(path = "/api/grafana/service-account", produces = {APPLICATION_JSON_VALUE})
public class ServiceAccountController {
    @Autowired
    private ServiceAccountService serviceAccountService;

    /**
     * create service admin account
     */
    @PostMapping(path = "/account")
    @Operation(summary = "Create service account | 创建服务账号", description = "Create service account | 创建服务账号")
    public ResponseEntity<Message<?>> createServiceAccount() {
        ForestResponse<?> response = serviceAccountService.createServiceAccount();
        if (response.isError()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getContent()));
        }
        return ResponseEntity.ok(Message.success(response.getContent()));
    }

    /**
     * get service accounts
     */
    @GetMapping(path = "/accounts")
    @Operation(summary = "Get service account | 获取服务账号", description = "Get service account | 获取服务账号")
    public ResponseEntity<Message<?>> getServiceAccount() {
        ForestResponse<?> response = serviceAccountService.getAccounts();
        if (response.isError()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getContent()));
        }
        return ResponseEntity.ok(Message.success(response.getContent()));
    }

    /**
     * create api token
     */
    @PostMapping(path = "/token")
    @Operation(summary = "Create service account token | 创建服务账号token", description = "Create service account token | 创建服务账号token")
    public ResponseEntity<Message<?>> createToken() {
        ForestResponse<?> response = serviceAccountService.createToken();
        if (response.isError()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getContent()));
        }
        return ResponseEntity.ok(Message.success(response.getContent()));
    }

    /**
     * get service account tokens
     */
    @GetMapping(path = "/tokens")
    @Operation(summary = "Get service account token | 获取服务账号token", description = "Get service account token | 获取服务账号token")
    public ResponseEntity<Message<?>> getToken() {
        ForestResponse<?> response = serviceAccountService.getTokens();
        if (response.isError()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getContent()));
        }
        return ResponseEntity.ok(Message.success(response.getContent()));
    }

}
