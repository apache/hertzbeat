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
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.manager.service.MonitorService;
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
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.ListJoin;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Monitor and manage batch API
 * 监控管理批量API
 *
 * @author tom
 */
@Tag(name = "Monitor Manage Batch API | 监控列表API")
@RestController
@RequestMapping(path = "/api/monitors", produces = {APPLICATION_JSON_VALUE})
public class MonitorsController {

    private static final byte ALL_MONITOR_STATUS = 9;

    private static final int TAG_LENGTH = 2;

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @Operation(summary = "Obtain a list of monitoring information based on query filter items",
            description = "根据查询过滤项获取监控信息列表")
    public ResponseEntity<Message<Page<Monitor>>> getMonitors(
            @Parameter(description = "Monitor ID | 监控任务ID", example = "6565463543") @RequestParam(required = false) final List<Long> ids,
            @Parameter(description = "Monitor Type | 监控类型", example = "linux") @RequestParam(required = false) final String app,
            @Parameter(description = "Monitor Name | 任务名称，模糊查询", example = "linux-127.0.0.1") @RequestParam(required = false) final String name,
            @Parameter(description = "Monitor Host | 监控Host，模糊查询", example = "127.0.0.1") @RequestParam(required = false) final String host,
            @Parameter(description = "Monitor Status | 任务状态 0:未监控,1:可用,2:不可用,9:全部状态", example = "1") @RequestParam(required = false) final Byte status,
            @Parameter(description = "Sort Field | 排序字段", example = "name") @RequestParam(defaultValue = "gmtCreate") final String sort,
            @Parameter(description = "Sort by | 排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") final String order,
            @Parameter(description = "List current page | 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination | 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize,
            @Parameter(description = "Monitor tag | 监控标签", example = "env:prod") @RequestParam(required = false) final String tag) {
        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.hasText(app)) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("app"), app);
                andList.add(predicateApp);
            }
            if (status != null && status >= 0 && status < ALL_MONITOR_STATUS) {
                Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicateStatus);
            }

            if (StringUtils.hasText(tag)) {
                String[] tagArr = tag.split(":");
                String tagName = tagArr[0];
                ListJoin<Monitor, org.dromara.hertzbeat.common.entity.manager.Tag> tagJoin = root
                        .join(root.getModel()
                                .getList("tags", org.dromara.hertzbeat.common.entity.manager.Tag.class), JoinType.LEFT);
                if (tagArr.length == TAG_LENGTH) {
                    String tagValue = tagArr[1];
                    andList.add(criteriaBuilder.equal(tagJoin.get("name"), tagName));
                    andList.add(criteriaBuilder.equal(tagJoin.get("value"), tagValue));
                } else {
                    andList.add(criteriaBuilder.equal(tagJoin.get("name"), tag));
                }
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.hasText(host)) {
                Predicate predicateHost = criteriaBuilder.like(root.get("host"), "%" + host + "%");
                orList.add(predicateHost);
            }
            if (StringUtils.hasText(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                orList.add(predicateName);
            }
            Predicate[] orPredicates = new Predicate[orList.size()];
            Predicate orPredicate = criteriaBuilder.or(orList.toArray(orPredicates));

            if (andPredicate.getExpressions().isEmpty() && orPredicate.getExpressions().isEmpty()) {
                return query.where().getRestriction();
            } else if (andPredicate.getExpressions().isEmpty()) {
                return query.where(orPredicate).getRestriction();
            } else if (orPredicate.getExpressions().isEmpty()) {
                return query.where(andPredicate).getRestriction();
            } else {
                return query.where(andPredicate, orPredicate).getRestriction();
            }
        };
        // Pagination is a must         分页是必须的
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<Monitor> monitorPage = monitorService.getMonitors(specification, pageRequest);
        Message<Page<Monitor>> message = Message.success(monitorPage);
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/{app}")
    @Operation(summary = "Filter all acquired monitoring information lists of the specified monitoring type according to the query",
            description = "根据查询过滤指定监控类型的所有获取监控信息列表")
    public ResponseEntity<Message<List<Monitor>>> getAppMonitors(
            @Parameter(description = "en: Monitoring type,zh: 监控类型", example = "linux") @PathVariable(required = false) final String app) {
        List<Monitor> monitors = monitorService.getAppMonitors(app);
        Message<List<Monitor>> message = Message.success(monitors);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @Operation(summary = "Delete monitoring items in batches according to the monitoring ID list",
            description = "根据监控任务ID列表批量删除监控项")
    public ResponseEntity<Message<Void>> deleteMonitors(
            @Parameter(description = "Monitoring ID List | 监控任务ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.deleteMonitors(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("manage")
    @Operation(summary = "Unmanaged monitoring items in batches according to the monitoring ID list",
            description = "根据监控任务ID列表批量取消纳管监控项")
    public ResponseEntity<Message<Void>> cancelManageMonitors(
            @Parameter(description = "Monitoring ID List | 监控任务ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.cancelManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @GetMapping("manage")
    @Operation(summary = "Start the managed monitoring items in batches according to the monitoring ID list",
            description = "根据监控任务ID列表批量启动纳管监控项")
    public ResponseEntity<Message<Void>> enableManageMonitors(
            @Parameter(description = "Monitor ID List | 监控任务ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.enableManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @GetMapping("/export")
    @Operation(summary = "export monitor config", description = "导出监控配置")
    public void export(
            @Parameter(description = "Monitor ID List | 监控任务ID列表", example = "6565463543") @RequestParam List<Long> ids,
            @Parameter(description = "Export Type:JSON,EXCEL,YAML") @RequestParam(defaultValue = "JSON") String type,
            HttpServletResponse res) throws Exception {
        monitorService.export(ids, type, res);
    }

    @PostMapping("/import")
    @Operation(summary = "import monitor config", description = "导入监控配置")
    public ResponseEntity<Message<Void>> export(MultipartFile file) throws Exception {
        monitorService.importConfig(file);
        return ResponseEntity.ok(Message.success("Import success"));
    }


    @PostMapping("/copy")
    @Operation(summary = "copy monitors by ids", description = "根据id批量复制monitor")
    public ResponseEntity<Message<Void>> duplicateMonitors(
            @Parameter(description = "Monitor ID List | 监控任务ID列表", example = "6565463543") @RequestParam List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.copyMonitors(ids);
        }
        return ResponseEntity.ok(Message.success("copy success"));
    }
}
