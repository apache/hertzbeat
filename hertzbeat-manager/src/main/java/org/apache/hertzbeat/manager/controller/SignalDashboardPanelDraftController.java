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

import static org.apache.hertzbeat.common.constants.CommonConstants.LOGIN_FAILED_CODE;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.manager.service.SignalDashboardPanelDraftService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Signal dashboard panel draft controller.
 */
@Tag(name = "Signal Dashboard Panel Draft API")
@RestController
@RequestMapping(path = "/api/signal/dashboard-panel-draft")
@RequiredArgsConstructor
@Slf4j
public class SignalDashboardPanelDraftController {

    private final SignalDashboardPanelDraftService signalDashboardPanelDraftService;

    @GetMapping("/{signal}")
    @Operation(summary = "List signal dashboard panel drafts",
            description = "List current user's dashboard panel drafts for one signal explorer")
    public ResponseEntity<Message<List<SignalDashboardPanelDraft>>> listSignalDashboardPanelDrafts(
            @PathVariable String signal) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        return ResponseEntity.ok(Message.success(
                signalDashboardPanelDraftService.listSignalDashboardPanelDrafts(user, signal)));
    }

    @PutMapping
    @Operation(summary = "Upsert signal dashboard panel draft",
            description = "Create or update current user's dashboard panel draft from a signal explorer query")
    public ResponseEntity<Message<SignalDashboardPanelDraft>> upsertSignalDashboardPanelDraft(
            @Valid @RequestBody SignalDashboardPanelDraft draft) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        return ResponseEntity.ok(Message.success(
                signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft(user, draft)));
    }

    @DeleteMapping("/{signal}/{draftKey}")
    @Operation(summary = "Delete signal dashboard panel draft",
            description = "Delete current user's dashboard panel draft from a signal explorer query")
    public ResponseEntity<Message<Void>> deleteSignalDashboardPanelDraft(@PathVariable String signal,
                                                                        @PathVariable String draftKey) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        signalDashboardPanelDraftService.deleteSignalDashboardPanelDraft(user, signal, draftKey);
        return ResponseEntity.ok(Message.success("Signal dashboard panel draft deleted successfully"));
    }

    private String getCurrentUser() {
        try {
            SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
            Object principal = subjectSum == null ? null : subjectSum.getPrincipal();
            String user = principal == null ? null : StringUtils.trimToNull(String.valueOf(principal));
            if (user == null) {
                log.error("No user found, signal dashboard panel drafts will be disabled");
            }
            return user;
        } catch (Exception e) {
            log.error("No user found, signal dashboard panel drafts will be disabled");
            return null;
        }
    }
}
