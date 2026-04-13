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

package org.apache.hertzbeat.manager.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API Token Management Controller
 */
@Tag(name = "API Token Management")
@RestController
@RequestMapping(value = "/api/account/token", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AuthTokenController {

    @Autowired
    private AccountService accountService;

    @PostMapping("/generate")
    @Operation(summary = "Generate a new API token", description = "Generate a new API token for integrations, optionally with expiration")
    public ResponseEntity<Message<Map<String, String>>> generateToken(
            @RequestParam(value = "name", required = false) @Parameter(description = "Token name/description") String name,
            @RequestParam(value = "expireSeconds", required = false) @Parameter(description = "Expiration time in seconds, null means never expire") Long expireSeconds) {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            String token = accountService.generateToken(name, expireSeconds);
            Map<String, String> rep = Collections.singletonMap("token", token);
            return ResponseEntity.ok(Message.success(rep));
        } catch (Exception e) {
            log.error("generate token error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Generate token error"));
        }
    }

    @GetMapping
    @Operation(summary = "List all API tokens", description = "List all active non-expiring API tokens")
    public ResponseEntity<Message<List<AuthToken>>> listTokens() {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            List<AuthToken> tokens = accountService.listTokens();
            return ResponseEntity.ok(Message.success(tokens));
        } catch (Exception e) {
            log.error("list tokens error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "List tokens error"));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete/revoke an API token", description = "Delete an API token to revoke its access")
    public ResponseEntity<Message<Void>> deleteToken(
            @PathVariable("id") @Parameter(description = "Token ID") Long id) {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            accountService.deleteToken(id);
            return ResponseEntity.ok(Message.success(null));
        } catch (javax.naming.AuthenticationException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        } catch (Exception e) {
            log.error("delete token error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Delete token error"));
        }
    }
}
