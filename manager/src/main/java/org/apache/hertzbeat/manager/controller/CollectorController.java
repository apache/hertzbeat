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

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.CollectorSummary;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.ResponseUtil;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * collector API
 */
@Tag(name = "Collector Manage API")
@RestController()
@RequestMapping(value = "/api/collector", produces = {APPLICATION_JSON_VALUE})
public class CollectorController {

    @Autowired
    private CollectorService collectorService;

    @GetMapping
    @Operation(summary = "Get a list of collectors based on query filter items",
            description = "Get a list of collectors based on query filter items")
    public ResponseEntity<Message<Page<CollectorSummary>>> getCollectors(
            @Parameter(description = "collector name", example = "tom") @RequestParam(required = false) final String name,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(required = false) Integer pageSize) {
        return ResponseUtil.handle(() -> collectorService.getCollectors(name, pageIndex, pageSize));
    }

    @PutMapping("/online")
    @Operation(summary = "Online collectors")
    public ResponseEntity<Message<Void>> onlineCollector(
            @Parameter(description = "collector name", example = "demo-collector")
            @RequestParam(required = false) List<String> collectors) {
        collectorService.makeCollectorsOnline(collectors);
        return ResponseEntity.ok(Message.success("Online success"));
    }

    @PutMapping("/offline")
    @Operation(summary = "Offline collectors")
    public ResponseEntity<Message<Void>> offlineCollector(
            @Parameter(description = "collector name", example = "demo-collector") 
            @RequestParam(required = false) List<String> collectors) {
        collectorService.makeCollectorsOffline(collectors);
        return ResponseEntity.ok(Message.success("Offline success"));
    }

    @DeleteMapping
    @Operation(summary = "Delete collectors")
    public ResponseEntity<Message<Void>> deleteCollector(
            @Parameter(description = "collector name", example = "demo-collector")
            @RequestParam(required = false) List<String> collectors) {
        this.collectorService.deleteRegisteredCollector(collectors);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @PostMapping("/generate/{collector}")
    @Operation(summary = "Generate deploy collector info")
    public ResponseEntity<Message<Map<String, String>>> generateCollectorDeployInfo(
            @Parameter(description = "collector name", example = "demo-collector")
            @PathVariable() String collector) {
        return ResponseUtil.handle(() -> collectorService.generateCollectorDeployInfo(collector));
    }

}
