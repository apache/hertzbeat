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

package org.dromara.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.alert.service.AlertSilenceService;
import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Silence the batch API for alarms
 * @author tom
 */
@Tag(name = "Alert Silence Batch API | 告警静默管理API")
@RestController
@RequestMapping(path = "/api/alert/silences", produces = {APPLICATION_JSON_VALUE})
public class AlertSilencesController {

    @Autowired
    private AlertSilenceService alertSilenceService;

    @GetMapping
    @Operation(summary = "Query the alarm silence list ｜ 查询告警静默列表",
            description = "You can obtain the list of alarm silence by querying filter items ｜ 根据查询过滤项获取告警静默信息列表")
    public ResponseEntity<Message<Page<AlertSilence>>> getAlertSilences(
            @Parameter(description = "Alarm Silence ID ｜ 告警静默ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search Name ｜ 模糊查询-名称", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id ｜ 排序字段，默认id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending ｜ 排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page ｜ 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages ｜ 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<AlertSilence> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate= criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(search)) {
                Predicate predicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                "%" + search.toLowerCase() + "%"
                        )
                );
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<AlertSilence> alertSilencePage = alertSilenceService.getAlertSilences(specification, pageRequest);
        Message<Page<AlertSilence>> message = Message.success(alertSilencePage);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @Operation(summary = "Delete alarm silence in batches ｜ 批量删除告警静默",
            description = "Delete alarm silence in batches based on the alarm silence ID list ｜ 根据告警静默ID列表批量删除告警静默")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @Parameter(description = "Alarm Silence IDs ｜ 告警静默IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertSilenceService.deleteAlertSilences(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

}
