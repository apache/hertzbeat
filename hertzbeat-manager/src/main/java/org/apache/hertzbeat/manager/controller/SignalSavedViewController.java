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
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Signal saved view controller.
 */
@Tag(name = "Signal Saved View API")
@RestController
@RequestMapping(path = "/api/signal/saved-view")
@RequiredArgsConstructor
@Slf4j
public class SignalSavedViewController {

    private final SignalSavedViewService signalSavedViewService;

    @GetMapping("/{signal}")
    @Operation(summary = "List signal saved views", description = "List shared saved views for one signal explorer")
    public ResponseEntity<Message<List<SignalSavedView>>> listSignalSavedViews(@PathVariable String signal) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        return ResponseEntity.ok(Message.success(signalSavedViewService.listSignalSavedViews(user, signal)));
    }

    @PutMapping
    @Operation(summary = "Upsert signal saved view", description = "Create or update a shared saved signal explorer view")
    public ResponseEntity<Message<SignalSavedView>> upsertSignalSavedView(@Valid @RequestBody SignalSavedView savedView) {
        SubjectSum subject = getCurrentSubject();
        String user = getCurrentUser(subject);
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        if (!canEditSharedAsset(subject)) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        return ResponseEntity.ok(Message.success(signalSavedViewService.upsertSignalSavedView(user, savedView)));
    }

    @DeleteMapping("/{signal}/{viewKey}")
    @Operation(summary = "Delete signal saved view", description = "Delete a shared saved signal explorer view")
    public ResponseEntity<Message<Void>> deleteSignalSavedView(@PathVariable String signal, @PathVariable String viewKey) {
        SubjectSum subject = getCurrentSubject();
        String user = getCurrentUser(subject);
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        if (!canEditSharedAsset(subject)) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "No permission"));
        }
        signalSavedViewService.deleteSignalSavedView(user, signal, viewKey);
        return ResponseEntity.ok(Message.success("Signal saved view deleted successfully"));
    }

    private String getCurrentUser() {
        return getCurrentUser(getCurrentSubject());
    }

    private SubjectSum getCurrentSubject() {
        try {
            return SurenessContextHolder.getBindSubject();
        } catch (Exception e) {
            log.error("No user found, signal saved views will be disabled");
            return null;
        }
    }

    private String getCurrentUser(SubjectSum subjectSum) {
        Object principal = subjectSum == null ? null : subjectSum.getPrincipal();
        String user = principal == null ? null : StringUtils.trimToNull(String.valueOf(principal));
        if (user == null) {
            log.error("No user found, signal saved views will be disabled");
        }
        return user;
    }

    private boolean canEditSharedAsset(SubjectSum subjectSum) {
        return subjectSum != null && (subjectSum.hasRole("admin") || subjectSum.hasRole("user"));
    }
}
