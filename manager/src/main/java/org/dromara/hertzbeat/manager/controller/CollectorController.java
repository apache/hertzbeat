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

package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import org.dromara.hertzbeat.manager.scheduler.netty.ManageServer;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.Predicate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * collector API
 * @author tom
 */
@Tag(name = "Collector Manage API | 采集器信息管理API")
@RestController()
@RequestMapping(value = "/api/collector", produces = {APPLICATION_JSON_VALUE})
public class CollectorController {

    @Autowired
    private CollectorService collectorService;
    
    @Autowired(required = false)
    private ManageServer manageServer;

    @GetMapping
    @Operation(summary = "Get a list of collectors based on query filter items",
            description = "根据查询过滤项获取采集器列表")
    public ResponseEntity<Message<Page<CollectorSummary>>> getCollectors(
            @Parameter(description = "collector name", example = "tom") @RequestParam(required = false) final String name,
            @Parameter(description = "List current page | 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination | 列表分页数量", example = "8") @RequestParam(required = false) Integer pageSize) {
        if (pageSize == null) {
            pageSize = Integer.MAX_VALUE;
        }
        Specification<Collector> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !name.isEmpty()) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
        Page<CollectorSummary> receivers = collectorService.getCollectors(specification, pageRequest);
        Message<Page<CollectorSummary>> message = Message.success(receivers);
        return ResponseEntity.ok(message);
    }

    @PutMapping("/online")
    @Operation(summary = "Online collectors")
    public ResponseEntity<Message<Void>> onlineCollector(
            @Parameter(description = "collector name", example = "demo-collector")
            @RequestParam(required = false) List<String> collectors) {
        if (collectors != null) {
            collectors.forEach(collector ->
                                       this.manageServer.getCollectorAndJobScheduler().onlineCollector(collector));
        }
        return ResponseEntity.ok(Message.success("Online success"));
    }

    @PutMapping("/offline")
    @Operation(summary = "Offline collectors")
    public ResponseEntity<Message<Void>> offlineCollector(
            @Parameter(description = "collector name", example = "demo-collector") 
            @RequestParam(required = false) List<String> collectors) {
        if (collectors != null) {
            collectors.forEach(collector -> this.manageServer.getCollectorAndJobScheduler().offlineCollector(collector));
        }
        return ResponseEntity.ok(Message.success("Offline success"));
    }

    @DeleteMapping
    @Operation(summary = "Delete collectors")
    public ResponseEntity<Message<Void>> deleteCollector(
            @Parameter(description = "collector name | 采集器名称", example = "demo-collector")
            @RequestParam(required = false) List<String> collectors) {
        this.collectorService.deleteRegisteredCollector(collectors);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @PostMapping("/generate/{collector}")
    @Operation(summary = "Generate deploy collector info")
    public ResponseEntity<Message<Map<String, String>>> generateCollectorDeployInfo(
            @Parameter(description = "collector name", example = "demo-collector")
            @PathVariable() String collector) {
        if (this.collectorService.hasCollector(collector)) {
            return ResponseEntity.ok(Message.fail(CommonConstants.FAIL_CODE, "There already has same collector name."));
        }
        String host = IpDomainUtil.getLocalhostIp();
        Map<String, String> maps = new HashMap<>(6);
        maps.put("identity", collector);
        maps.put("host", host);
        return ResponseEntity.ok(Message.success(maps));
    }

}
