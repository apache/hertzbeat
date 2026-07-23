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
import org.apache.hertzbeat.common.entity.dto.observability.ObservabilityCapability;
import org.apache.hertzbeat.log.service.ThreeSignalQueryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Report which observability query features the current storage backend supports,
 * so the UI can render guidance instead of firing queries that cannot be served.
 *
 * <p>The three capabilities are probed through two different mechanisms on purpose: log query
 * is dispatched per storage via {@link HistoryDataReader#supportsLogQuery()} (multiple storages
 * implement log read/write), while trace/metric consoles are served only by the conditionally
 * registered {@link ThreeSignalQueryService} (GreptimeDB only for now).
 * TODO: once trace/metric query grows storage-dispatched implementations like logs (or log query
 *  is absorbed into the three-signal contract), unify the probes on a single abstraction.
 */
@RestController
@RequestMapping(path = "/api/observability", produces = "application/json")
@Tag(name = "Observability Capability Controller")
public class ObservabilityCapabilityController {

    private final HistoryDataReader historyDataReader;
    private final ObjectProvider<ThreeSignalQueryService> threeSignalQueryService;

    public ObservabilityCapabilityController(HistoryDataReader historyDataReader,
                                             ObjectProvider<ThreeSignalQueryService> threeSignalQueryService) {
        this.historyDataReader = historyDataReader;
        this.threeSignalQueryService = threeSignalQueryService;
    }

    @GetMapping("/capability")
    @Operation(summary = "Query observability capability",
            description = "Return whether log, trace and OTLP metric query consoles are supported by the current storage backend.")
    public ResponseEntity<Message<ObservabilityCapability>> capability() {
        boolean traceAndMetricSupported = threeSignalQueryService.getIfAvailable() != null;
        return ResponseEntity.ok(Message.success(new ObservabilityCapability(
                historyDataReader.supportsLogQuery(), traceAndMetricSupported, traceAndMetricSupported)));
    }
}
