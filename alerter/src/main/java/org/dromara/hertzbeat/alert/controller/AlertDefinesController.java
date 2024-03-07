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

import org.dromara.hertzbeat.common.entity.alerter.AlertDefine;
import org.dromara.hertzbeat.alert.service.AlertDefineService;
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
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Define the batch API for alarms
 * @author tom
 */
@Tag(name = "Alert Define Batch API | 告警定义管理API")
@RestController
@RequestMapping(path = "/api/alert/defines", produces = {APPLICATION_JSON_VALUE})
public class AlertDefinesController {

    @Autowired
    private AlertDefineService alertDefineService;

    @GetMapping
    @Operation(summary = "Example Query the alarm definition list ｜ 查询告警定义列表",
            description = "You can obtain the list of alarm definitions by querying filter items ｜ 根据查询过滤项获取告警定义信息列表")
    public ResponseEntity<Message<Page<AlertDefine>>> getAlertDefines(
            @Parameter(description = "Alarm Definition ID ｜ 告警定义ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search-Target Expr Template ｜ 模糊查询-指标对象 表达式 通知模版", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Alarm Definition Severity ｜ 告警定义级别", example = "6565463543") @RequestParam(required = false) Byte priority,
            @Parameter(description = "Sort field, default id ｜ 排序字段，默认id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending ｜ 排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page ｜ 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages ｜ 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<AlertDefine> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(search)) {
                Predicate predicate = criteriaBuilder.or(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("app")),
                                "%" + search.toLowerCase() + "%"
                        ),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("metric")),
                                "%" + search.toLowerCase() + "%"
                        ),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("field")),
                                "%" + search.toLowerCase() + "%"
                        ),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("expr")),
                                "%" + search.toLowerCase() + "%"
                        ),
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("template")),
                                "%" + search.toLowerCase() + "%"
                        )
                );
                andList.add(predicate);
            }
            if (priority != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("priority"), priority);
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<AlertDefine> alertDefinePage = alertDefineService.getAlertDefines(specification, pageRequest);
        return ResponseEntity.ok(Message.success(alertDefinePage));
    }

    @DeleteMapping
    @Operation(summary = "Delete alarm definitions in batches ｜ 批量删除告警定义",
            description = "Delete alarm definitions in batches based on the alarm definition ID list ｜ 根据告警定义ID列表批量删除告警定义")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @Parameter(description = "Alarm Definition IDs ｜ 告警定义IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertDefineService.deleteAlertDefines(new HashSet<>(ids));
        }
        return ResponseEntity.ok(Message.success());
    }

    @GetMapping("/export")
    @Operation(summary = "export alertDefine config", description = "导出告警阀值配置")
    public void export(
        @Parameter(description = "AlertDefine ID List | 告警阀值ID列表", example = "656937901") @RequestParam List<Long> ids,
        @Parameter(description = "Export Type:JSON,EXCEL,YAML") @RequestParam(defaultValue = "JSON") String type,
        HttpServletResponse res) throws Exception {
        alertDefineService.export(ids, type, res);
    }

    @PostMapping("/import")
    @Operation(summary = "import alertDefine config", description = "导入告警阀值配置")
    public ResponseEntity<Message<Void>> importDefines(MultipartFile file) throws Exception {
        alertDefineService.importConfig(file);
        return ResponseEntity.ok(Message.success("Import success"));
    }
}
