package org.dromara.hertzbeat.controller;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;

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
     * @return account id
     */
    @PostMapping(path = "/account")
    @Operation(summary = "Create service account | 创建服务账号", description = "Create service account | 创建服务账号")
    public String createServiceAccount() {
        return serviceAccountService.createServiceAccount();
    }
    /**
     * create api token
     * @return token
     */
    @PostMapping(path = "/token")
    @Operation(summary = "Create service account token | 创建服务账号token", description = "Create service account token | 创建服务账号token")
    public String createToken() {
        return serviceAccountService.createToken();
    }

}
