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

import org.dromara.hertzbeat.alert.dto.AlertSummary;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.common.entity.dto.Message;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alarm Management API
 * @author tom
 * @author <a href="mailto:1252532896@qq.com">Hua.Cheng</a>
 */
@Tag(name = "Alarm Manage Batch API | 告警批量管理API")
@RestController
@RequestMapping(path = "/api/alerts", produces = {APPLICATION_JSON_VALUE})
public class AlertsController {

    @Autowired
    private AlertService alertService;

    @GetMapping
    @Operation(summary = "Get a list of alarm information based on query filter items", description = "根据查询过滤项获取告警信息列表")
    public ResponseEntity<Message<Page<Alert>>> getAlerts(
            @Parameter(description = "Alarm ID List | 告警IDS", example = "6565466456") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Alarm monitor object ID | 告警监控对象ID", example = "6565463543") @RequestParam(required = false) Long monitorId,
            @Parameter(description = "Alarm level | 告警级别", example = "6565463543") @RequestParam(required = false) Byte priority,
            @Parameter(description = "Alarm Status | 告警状态", example = "6565463543") @RequestParam(required = false) Byte status,
            @Parameter(description = "Alarm content fuzzy query | 告警内容模糊查询", example = "linux") @RequestParam(required = false) String content,
            @Parameter(description = "Sort field, default id | 排序字段，默认id", example = "name") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort Type | 排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page | 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination | 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<Alert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();

            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (monitorId != null) {
                Predicate predicate = criteriaBuilder.like(root.get("tags").as(String.class), "%" + monitorId + "%");
                andList.add(predicate);
            }
            if (priority != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("priority"), priority);
                andList.add(predicate);
            }
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            if (content != null && !content.isEmpty()) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + content + "%");
                andList.add(predicateContent);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<Alert> alertPage = alertService.getAlerts(specification, pageRequest);
        Message<Page<Alert>> message = Message.success(alertPage);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @Operation(summary = "Delete alarms in batches", description = "根据告警ID列表批量删除告警")
    public ResponseEntity<Message<Void>> deleteAlerts(
            @Parameter(description = "Alarm List ID | 告警IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            alertService.deleteAlerts(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("/clear")
    @Operation(summary = "Delete alarms in batches", description = "清空所有告警信息")
    public ResponseEntity<Message<Void>> clearAllAlerts() {
        alertService.clearAlerts();
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @PutMapping(path = "/status/{status}")
    @Operation(summary = "Batch modify alarm status, set read and unread", description = "批量修改告警状态,设置已读未读")
    public ResponseEntity<Message<Void>> applyAlertDefinesStatus(
            @Parameter(description = "Alarm status value | 告警状态值", example = "0") @PathVariable Byte status,
            @Parameter(description = "Alarm List IDS | 告警IDS", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && status != null && !ids.isEmpty()) {
            alertService.editAlertStatus(status, ids);
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/summary")
    @Operation(summary = "Get alarm statistics", description = "获取告警统计信息")
    public ResponseEntity<Message<AlertSummary>> getAlertsSummary() {
        AlertSummary alertSummary = alertService.getAlertsSummary();
        Message<AlertSummary> message = Message.success(alertSummary);
        return ResponseEntity.ok(message);
    }
    
}
