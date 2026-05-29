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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftDecisionInfo;
import org.apache.hertzbeat.manager.pojo.dto.ActionApprovalDraftInfo;
import org.apache.hertzbeat.manager.service.action.ActionApprovalDraftService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Non-executing action approval draft controller.
 */
@Slf4j
@RestController
@RequestMapping(value = "/api/actions/approval-drafts", produces = {APPLICATION_JSON_VALUE})
public class ActionApprovalDraftController {

    private final ActionApprovalDraftService actionApprovalDraftService;

    public ActionApprovalDraftController(ActionApprovalDraftService actionApprovalDraftService) {
        this.actionApprovalDraftService = actionApprovalDraftService;
    }

    @PostMapping
    @Operation(summary = "Create action approval draft", description = "Create a non-executing manual approval draft")
    public ResponseEntity<Message<ActionApprovalDraftInfo>> createApprovalDraft(
            @RequestBody ActionApprovalDraftInfo request,
            @Parameter(description = "Workspace boundary") @RequestParam(required = false) String workspaceId) {
        try {
            return ResponseEntity.ok(Message.success(
                    actionApprovalDraftService.createApprovalDraft(request, workspaceId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
        } catch (Exception e) {
            log.error("create action approval draft error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Create action approval draft error"));
        }
    }

    @GetMapping
    @Operation(summary = "List action approval drafts", description = "List recent non-executing approval drafts")
    public ResponseEntity<Message<List<ActionApprovalDraftInfo>>> listApprovalDrafts(
            @Parameter(description = "Result limit") @RequestParam(defaultValue = "8") Integer limit,
            @Parameter(description = "Workspace boundary") @RequestParam(required = false) String workspaceId) {
        return ResponseEntity.ok(Message.success(
                actionApprovalDraftService.listApprovalDrafts(limit == null ? 8 : limit, workspaceId)));
    }

    @PostMapping("/{draftId}/decision")
    @Operation(summary = "Decide action approval draft",
            description = "Record a non-executing approve/reject decision for an approval draft")
    public ResponseEntity<Message<ActionApprovalDraftDecisionInfo>> decideApprovalDraft(
            @PathVariable String draftId,
            @RequestBody ActionApprovalDraftDecisionInfo request,
            @Parameter(description = "Workspace boundary") @RequestParam(required = false) String workspaceId) {
        try {
            return ResponseEntity.ok(Message.success(
                    actionApprovalDraftService.decideApprovalDraft(draftId, request, workspaceId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
        } catch (Exception e) {
            log.error("decide action approval draft error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Decide action approval draft error"));
        }
    }
}
