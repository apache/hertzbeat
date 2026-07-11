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

package org.apache.hertzbeat.log.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsConsole;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsInventory;
import org.apache.hertzbeat.common.entity.dto.observability.SignalPage;
import org.apache.hertzbeat.common.entity.dto.observability.TraceDetail;
import org.apache.hertzbeat.common.entity.dto.observability.TraceListItem;
import org.apache.hertzbeat.common.entity.dto.observability.TraceOverview;
import org.apache.hertzbeat.log.service.ThreeSignalQueryService;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard.Workload;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public entity-free query APIs for OTLP metrics and traces. */
@RestController
@Tag(name = "Three Signal Query Controller")
public class ThreeSignalQueryController {

    private final ThreeSignalQueryService queryService;
    private final SignalWorkloadGuard workloadGuard;

    public ThreeSignalQueryController(ThreeSignalQueryService queryService, SignalWorkloadGuard workloadGuard) {
        this.queryService = queryService;
        this.workloadGuard = workloadGuard;
    }

    @GetMapping(path = "/api/ingestion/otlp/metrics/console", produces = "application/json")
    @Operation(summary = "Query OTLP metrics")
    public ResponseEntity<Message<OtlpMetricsConsole>> metrics(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "groupBy", required = false) String groupBy,
            @RequestParam(value = "aggregation", required = false) String aggregation,
            @RequestParam(value = "step", required = false) Integer step,
            @RequestParam(value = "operationName", required = false) String operationName) {
        return workloadGuard.execute(Workload.METRICS, () -> ResponseEntity.ok(Message.success(
                queryService.queryMetrics(query, start, end, serviceName, serviceNamespace, environment,
                        filter, groupBy, aggregation, step, operationName))));
    }

    @GetMapping(path = "/api/ingestion/otlp/metrics/inventory", produces = "application/json")
    @Operation(summary = "List OTLP metric names")
    public ResponseEntity<Message<OtlpMetricsInventory>> metricInventory(
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "limit", defaultValue = "100") Integer limit) {
        return workloadGuard.execute(Workload.METRICS, () -> ResponseEntity.ok(Message.success(
                queryService.metricInventory(start, end, serviceName, serviceNamespace, environment, limit))));
    }

    @GetMapping(path = "/api/traces/list", produces = "application/json")
    @Operation(summary = "Query traces")
    public ResponseEntity<Message<SignalPage<TraceListItem>>> traces(
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "pageIndex", defaultValue = "0") Integer pageIndex,
            @RequestParam(value = "pageSize", defaultValue = "20") Integer pageSize) {
        return workloadGuard.execute(Workload.TRACES, () -> ResponseEntity.ok(Message.success(
                queryService.queryTraces(start, end, traceId, errorOnly, serviceName, serviceNamespace,
                        environment, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize))));
    }

    @GetMapping(path = "/api/traces/stats/overview", produces = "application/json")
    @Operation(summary = "Get trace overview")
    public ResponseEntity<Message<TraceOverview>> traceOverview(
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs) {
        return workloadGuard.execute(Workload.TRACES, () -> ResponseEntity.ok(Message.success(
                queryService.traceOverview(start, end, traceId, errorOnly, serviceName, serviceNamespace,
                        environment, operationName, minDurationMs, maxDurationMs))));
    }

    @GetMapping(path = "/api/traces/{traceId}", produces = "application/json")
    @Operation(summary = "Get trace detail")
    public ResponseEntity<Message<TraceDetail>> traceDetail(@PathVariable("traceId") String traceId) {
        return workloadGuard.execute(Workload.TRACES,
                () -> ResponseEntity.ok(Message.success(queryService.traceDetail(traceId))));
    }

    @GetMapping(path = "/api/traces/{traceId}/spans", produces = "application/json")
    @Operation(summary = "Get trace spans")
    public ResponseEntity<Message<?>> traceSpans(@PathVariable("traceId") String traceId) {
        return workloadGuard.execute(Workload.TRACES,
                () -> ResponseEntity.ok(Message.success(queryService.traceDetail(traceId).spans())));
    }
}
