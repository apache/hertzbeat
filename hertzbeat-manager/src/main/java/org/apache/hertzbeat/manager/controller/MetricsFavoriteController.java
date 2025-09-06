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

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.LOGIN_FAILED_CODE;

/**
 * Metrics Favorite Controller
 */
@Tag(name = "Metrics Favorite API")
@RestController
@RequestMapping(path = "/api/metrics/favorite")
@RequiredArgsConstructor
@Slf4j
public class MetricsFavoriteController {

    private final MetricsFavoriteService metricsFavoriteService;

    @PostMapping("/{monitorId}/{metricsName}")
    @Operation(summary = "Add metrics to favorites", description = "Add specific metrics to user's favorites")
    public ResponseEntity<Message<Void>> addMetricsFavorite(
            @Parameter(description = "Monitor ID", example = "6565463543") @PathVariable Long monitorId,
            @Parameter(description = "Metrics name", example = "cpu") @PathVariable String metricsName) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        try {
            metricsFavoriteService.addMetricsFavorite(user, monitorId, metricsName);
            return ResponseEntity.ok(Message.success("Metrics added to favorites successfully"));
        } catch (Exception e) {
            log.error("Failed to add metrics favorite: monitorId={}, metricsName={}", monitorId, metricsName, e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
    }

    @DeleteMapping("/{monitorId}/{metricsName}")
    @Operation(summary = "Remove metrics from favorites", description = "Remove specific metrics from user's favorites")
    public ResponseEntity<Message<Void>> removeMetricsFavorite(
            @Parameter(description = "Monitor ID", example = "6565463543") @PathVariable Long monitorId,
            @Parameter(description = "Metrics name", example = "cpu") @PathVariable String metricsName) {

        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        try {
            metricsFavoriteService.removeMetricsFavorite(user, monitorId, metricsName);
            return ResponseEntity.ok(Message.success("Metrics removed from favorites successfully"));
        } catch (Exception e) {
            log.error("Failed to remove metrics favorite: monitorId={}, metricsName={}", monitorId, metricsName, e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Remove failed! " + e.getMessage()));
        }
    }

    @GetMapping("/{monitorId}")
    @Operation(summary = "Get user's all favorited metrics", description = "Get all favorited metrics for current user")
    public ResponseEntity<Message<Set<String>>> getUserFavoritedMetrics(@Parameter(description = "Monitor ID", example = "6565463543") @PathVariable Long monitorId) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        try {
            Set<String> favoritedMetrics = metricsFavoriteService.getUserFavoritedMetrics(user, monitorId);
            return ResponseEntity.ok(Message.success(favoritedMetrics));
        } catch (Exception e) {
            log.error("Failed to get user favorited metrics", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Failed to get favorited metrics!"));
        }
    }

    /**
     * Get current user ID for favorite status
     *
     * @return user id
     */
    private String getCurrentUser() {
        try {
            SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
            return String.valueOf(subjectSum.getPrincipal());
        } catch (Exception e) {
            log.error("No user found, favorites will be disabled");
            return null;
        }
    }
}