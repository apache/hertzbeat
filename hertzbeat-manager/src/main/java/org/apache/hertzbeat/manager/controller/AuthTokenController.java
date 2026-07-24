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
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.AuthTokenCreateRequest;
import org.apache.hertzbeat.manager.pojo.dto.AuthTokenIssuedResponse;
import org.apache.hertzbeat.manager.pojo.dto.AuthTokenMutationResponse;
import org.apache.hertzbeat.manager.pojo.dto.AuthTokenSummary;
import org.apache.hertzbeat.manager.pojo.dto.CollectorIntakeTokenCreateRequest;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ResponseEntity<Message<AuthTokenIssuedResponse>> generateToken(
            @ModelAttribute AuthTokenCreateRequest request) {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            String token = StringUtils.isBlank(request.getWorkspaceId())
                    ? accountService.generateToken(request.getName(), request.getExpireSeconds(), request.getScope())
                    : accountService.generateToken(request.getName(), request.getExpireSeconds(), request.getScope(),
                            request.getWorkspaceId());
            return ResponseEntity.ok(Message.success(new AuthTokenIssuedResponse(token)));
        } catch (Exception e) {
            log.error("generate token error: {}", e.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Generate token error"));
        }
    }

    @PostMapping("/collector-intake/generate")
    @Operation(summary = "Generate a Collector intake token",
            description = "Generate a managed OTLP token bound to one Collector identity")
    public ResponseEntity<Message<AuthTokenIssuedResponse>> generateCollectorIntakeToken(
            @ModelAttribute CollectorIntakeTokenCreateRequest request) {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            String token = accountService.generateCollectorIntakeToken(
                    request.getCollectorId(), request.getWorkspaceId(), request.getExpireSeconds());
            return ResponseEntity.ok(Message.success(new AuthTokenIssuedResponse(token)));
        } catch (Exception e) {
            log.error("generate collector intake token error: {}", e.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Generate collector intake token error"));
        }
    }

    @GetMapping
    @Operation(summary = "List all API tokens", description = "List all active non-expiring API tokens")
    public ResponseEntity<Message<List<AuthTokenSummary>>> listTokens() {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            List<AuthTokenSummary> tokens = accountService.listTokens().stream()
                    .map(AuthTokenSummary::fromEntity)
                    .toList();
            return ResponseEntity.ok(Message.success(tokens));
        } catch (Exception e) {
            log.error("list tokens error: {}", e.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "List tokens error"));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete/revoke an API token", description = "Delete an API token to revoke its access")
    public ResponseEntity<Message<AuthTokenMutationResponse>> deleteToken(
            @PathVariable("id") @Parameter(description = "Token ID") Long id) {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No login user"));
        }
        if (!subjectSum.hasRole("admin")) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        try {
            boolean deleted = accountService.deleteToken(id);
            AuthTokenMutationResponse response = deleted
                    ? AuthTokenMutationResponse.deleted(id)
                    : AuthTokenMutationResponse.missing(id);
            return ResponseEntity.ok(Message.success(response));
        } catch (javax.naming.AuthenticationException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        } catch (DataAccessException e) {
            log.error("delete token storage unavailable: {}", e.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Token storage unavailable"));
        } catch (Exception e) {
            log.error("delete token error: {}", e.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Delete token error"));
        }
    }
}
