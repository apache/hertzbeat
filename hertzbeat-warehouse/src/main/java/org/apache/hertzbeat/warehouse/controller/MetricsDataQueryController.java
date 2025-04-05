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

package org.apache.hertzbeat.warehouse.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;
import org.apache.hertzbeat.warehouse.service.MetricsDataQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Metrics Data Query API
 */
@RestController
@RequestMapping(produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Metrics Data Query API")
public class MetricsDataQueryController {
    

    @Autowired
    private MetricsDataQueryService queryService;
    

    @GetMapping("/api/warehouse/query")
    @Operation(summary = "Query Real Time Metrics Data")
    public ResponseEntity<Message<List<MetricQueryData>>> queryMetricsData(
            @Parameter(description = "Query PromQL expr list", example = "cpu")
            @RequestParam List<String> queries,
            @Parameter(description = "Query type", example = "promql")
            @RequestParam String type,
            @Parameter(description = "Query timestamp", example = "1725854804451")
            @RequestParam Long time) {
        return ResponseEntity.ok(Message.success(queryService.query(queries, type, time)));
    }

    @GetMapping("/api/warehouse/query/range")
    @Operation(summary = "Query Range Metrics Data")
    public ResponseEntity<Message<List<MetricQueryData>>> queryMetricsDataRange(
            @Parameter(description = "Query PromQL expr list", example = "cpu")
            @RequestParam List<String> queries,
            @Parameter(description = "Query type", example = "promql")
            @RequestParam String type,
            @Parameter(description = "Query start timestamp", example = "1725854804451")
            @RequestParam Long start,
            @Parameter(description = "Query end timestamp", example = "1733630804452")
            @RequestParam Long end,
            @Parameter(description = "Query step", example = "4m")
            @RequestParam String step
    ) {
        return ResponseEntity.ok(Message.success(queryService.queryRange(queries, type, start, end, step)));
    }
}
