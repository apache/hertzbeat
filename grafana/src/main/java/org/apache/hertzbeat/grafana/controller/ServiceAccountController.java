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
 * Controller for managing Grafana service accounts and tokens via API.
 */
@Tag(name = "Service Account API")
@RestController
@RequestMapping(path = "/api/grafana/service-account", produces = {APPLICATION_JSON_VALUE})
public class ServiceAccountController {

    @Autowired
    private ServiceAccountService serviceAccountService;

    /**
     * Creates a new service admin account.
     *
     * @return ResponseEntity containing the result of the account creation
     */
    @PostMapping(path = "/account")
    @Operation(summary = "Create service account", description = "Create service account")
    public ResponseEntity<Message<?>> createServiceAccount() {
        try {
            ResponseEntity<String> response = serviceAccountService.createServiceAccount();
            return handleResponse(response);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    /**
     * Retrieves all service accounts.
     *
     * @return ResponseEntity containing the list of service accounts
     */
    @GetMapping(path = "/accounts")
    @Operation(summary = "Get service account", description = "Get service account")
    public ResponseEntity<Message<?>> getServiceAccount() {
        try {
            ResponseEntity<String> response = serviceAccountService.getAccounts();
            return handleResponse(response);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    /**
     * Creates a new API token for a service account.
     *
     * @return ResponseEntity containing the result of the token creation
     */
    @PostMapping(path = "/token")
    @Operation(summary = "Create service account token", description = "Create service account token")
    public ResponseEntity<Message<?>> createToken() {
        try {
            ResponseEntity<String> response = serviceAccountService.createToken();
            return handleResponse(response);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    /**
     * Retrieves all API tokens for service accounts.
     *
     * @return ResponseEntity containing the list of tokens
     */
    @GetMapping(path = "/tokens")
    @Operation(summary = "Get service account token", description = "Get service account token")
    public ResponseEntity<Message<?>> getToken() {
        try {
            ResponseEntity<String> response = serviceAccountService.getTokens();
            return handleResponse(response);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    private ResponseEntity<Message<?>> handleResponse(ResponseEntity<String> response) {
        if (response.getStatusCode().is2xxSuccessful()) {
            return ResponseEntity.ok(Message.success(response.getBody()));
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, response.getBody()));
    }

    private ResponseEntity<Message<?>> handleException(Exception e) {
        return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
    }
}
