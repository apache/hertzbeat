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

package org.apache.hertzbeat.observability.ingestion.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionRedSummaryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * OTLP ingestion workspace controller.
 */
@RestController
@RequestMapping(path = "/api/ingestion/otlp", produces = "application/json")
@Tag(name = "OTLP Ingestion Controller")
@RequiredArgsConstructor
public class OtlpIngestionController {

    private final OtlpIngestionWorkspaceService otlpIngestionWorkspaceService;
    private final OtlpIngestionRedSummaryService otlpIngestionRedSummaryService;

    @GetMapping("/overview")
    @Operation(summary = "Unified OTLP ingestion overview")
    public ResponseEntity<Message<OtlpIngestionOverviewDto>> overview() {
        return ResponseEntity.ok(Message.success(otlpIngestionWorkspaceService.getOverview()));
    }

    @GetMapping("/guide")
    @Operation(summary = "Unified OTLP ingestion guide")
    public ResponseEntity<Message<OtlpIngestionGuideDto>> guide(HttpServletRequest request) {
        return ResponseEntity.ok(Message.success(otlpIngestionWorkspaceService.getGuide(request)));
    }

    @GetMapping("/bindings")
    @Operation(summary = "Canonical identity and entity binding summary")
    public ResponseEntity<Message<OtlpEntityBindingSummaryDto>> bindings() {
        return ResponseEntity.ok(Message.success(otlpIngestionWorkspaceService.getBindingSummary()));
    }

    @GetMapping("/intake/red")
    @Operation(summary = "Recent OTLP ingest request, error, and duration summary")
    public ResponseEntity<Message<OtlpIngestionRedSummaryDto>> intakeRedSummary(
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end) {
        return ResponseEntity.ok(Message.success(otlpIngestionRedSummaryService.getSummary(start, end)));
    }

    @GetMapping("/metrics/console")
    @Operation(summary = "OTLP metrics console query workspace")
    public ResponseEntity<Message<OtlpMetricsConsoleDto>> metricsConsole(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "groupBy", required = false) String groupBy,
            @RequestParam(value = "aggregation", required = false) String aggregation,
            @RequestParam(value = "temporalAggregation", required = false) String temporalAggregation,
            @RequestParam(value = "step", required = false) String step,
            @RequestParam(value = "limit", required = false) String limit) {
        return ResponseEntity.ok(Message.success(otlpIngestionWorkspaceService.getMetricsConsole(
                entityId, entityType, start, end, serviceName, serviceNamespace, environment, query, filter, groupBy, aggregation,
                temporalAggregation, step, limit)));
    }

    @GetMapping("/metrics/related")
    @Operation(summary = "OTLP related metrics discovery for a signal context")
    public ResponseEntity<Message<OtlpRelatedMetricsDto>> relatedMetrics(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "limit", required = false) String limit) {
        return ResponseEntity.ok(Message.success(otlpIngestionWorkspaceService.getRelatedMetrics(
                entityId, entityType, start, end, serviceName, serviceNamespace, environment, filter, operationName, limit)));
    }
}
