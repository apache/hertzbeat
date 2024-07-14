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

package org.apache.hertzbeat.grafana.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
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


/**
 * Service Account API
 */
@Tag(name = "Service Account API")
@RestController
@RequestMapping(path = "/api/grafana/service-account", produces = {APPLICATION_JSON_VALUE})
public class ServiceAccountController {

    @Autowired
    private ServiceAccountService serviceAccountService;

    /**
     * create service admin account
     */
    @PostMapping(path = "/account")
    @Operation(summary = "Create service account", description = "Create service account")
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
    @Operation(summary = "Get service account", description = "Get service account")
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
    @Operation(summary = "Create service account token", description = "Create service account token")
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
    @Operation(summary = "Get service account token", description = "Get service account token")
    public ResponseEntity<Message<?>> getToken() {
        ForestResponse<?> response = serviceAccountService.getTokens();
        if (response.isError()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getContent()));
        }
        return ResponseEntity.ok(Message.success(response.getContent()));
    }

}
