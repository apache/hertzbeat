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
import org.dromara.hertzbeat.common.entity.dto.CollectorSummary;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.criteria.Predicate;

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
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize);
        Page<CollectorSummary> receivers = collectorService.getCollectors(specification, pageRequest);
        Message<Page<CollectorSummary>> message = new Message<>(receivers);
        return ResponseEntity.ok(message);
    }
}
