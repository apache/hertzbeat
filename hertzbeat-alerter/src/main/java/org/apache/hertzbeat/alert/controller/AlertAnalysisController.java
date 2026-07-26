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

package org.apache.hertzbeat.alert.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertAnalysisPolicyRequest;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API for automatic alert analysis policy management. */
@Tag(name = "Alert Analysis API")
@RestController
@RequestMapping(path = "/api/alert/analysis", produces = {APPLICATION_JSON_VALUE})
public class AlertAnalysisController {

    private final AlertAnalysisPolicyService policyService;

    public AlertAnalysisController(AlertAnalysisPolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping("/availability")
    @Operation(summary = "Check whether automatic alert analysis can be configured")
    public ResponseEntity<Message<Boolean>> availability() {
        return ResponseEntity.ok(Message.success(policyService.isAgentClientConfigured()));
    }

    @GetMapping("/policies")
    @Operation(summary = "List automatic alert analysis policies")
    public ResponseEntity<Message<List<AlertAnalysisPolicy>>> listPolicies() {
        return ResponseEntity.ok(Message.success(policyService.findAll()));
    }

    @PostMapping("/policies")
    @Operation(summary = "Create an automatic alert analysis policy")
    public ResponseEntity<Message<AlertAnalysisPolicy>> createPolicy(
            @Valid @RequestBody AlertAnalysisPolicyRequest request) {
        return ResponseEntity.ok(Message.success(policyService.create(request.name(), request.matchLabels(),
                request.groupByLabels(), request.windowSeconds(), request.minimumAlertCount(),
                request.cooldownSeconds())));
    }

    @PutMapping("/policies/{policyId}/enabled")
    @Operation(summary = "Enable or disable an automatic alert analysis policy")
    public ResponseEntity<Message<AlertAnalysisPolicy>> togglePolicy(
            @PathVariable Long policyId, @RequestParam boolean enabled) {
        return ResponseEntity.ok(Message.success(policyService.toggle(policyId, enabled)));
    }

    @DeleteMapping("/policies/{policyId}")
    @Operation(summary = "Delete an automatic alert analysis policy")
    public ResponseEntity<Message<Void>> deletePolicy(@PathVariable Long policyId) {
        policyService.delete(policyId);
        return ResponseEntity.ok(Message.success());
    }
}
