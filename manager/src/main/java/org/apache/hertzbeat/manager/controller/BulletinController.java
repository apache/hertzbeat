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

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.ValueRow;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinVo;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.Pair;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Bulletin Controller
 */
@Slf4j
@RestController
@RequestMapping(value = "/api/bulletin", produces = {APPLICATION_JSON_VALUE})
public class BulletinController {

    @Autowired
    private BulletinService bulletinService;

    @Autowired
    private RealTimeDataReader realTimeDataReader;

    @Autowired
    private MonitorService monitorService;
    /**
     * add a new bulletin
     */
    @PostMapping
    public ResponseEntity<Message<Void>> addNewBulletin(@Valid @RequestBody BulletinDto bulletinDto) {
        if (bulletinService.addBulletin(bulletinDto)) {
            return ResponseEntity.ok(Message.success("Add success"));
        }else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed"));
        }
    }


    /**
     * page query bulletin
     */
    @GetMapping
    public ResponseEntity<Message<Page<BulletinVo>>> pageQueryBulletin(
            @Parameter(description = "Bulletin Definition ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search-Target Expr Template", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") int pageSize)
     {
         Specification<Bulletin> specification = (root, query, criteriaBuilder) -> {
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
                         )
                 );
                 andList.add(predicate);
             }

             Predicate[] predicates = new Predicate[andList.size()];
             return criteriaBuilder.and(andList.toArray(predicates));
         };
         Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
         PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
         Page<BulletinVo> bulletinsPage = bulletinService.getBulletins(specification, pageRequest);
         return ResponseEntity.ok(Message.success(bulletinsPage));
    }

    /**
     * delete bulletin by name
     */
    @Operation(summary = "Delete Bulletin by Name", description = "Delete Bulletin by Name")
    @DeleteMapping
    public ResponseEntity<Message<Void>> deleteBulletin(
            @Parameter(description = "Bulletin Name", example = "402372614668544")
            @RequestParam List<String> names) {
        if (bulletinService.deleteBulletinByName(names)) {
            return ResponseEntity.ok(Message.success("Delete success"));
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Delete failed"));
        }
    }

    @GetMapping("/metrics")
    @Operation(summary = "Query All Bulletin Real Time Metrics Data", description = "Query All Bulletin real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<List<BulletinMetricsData>>> getAllMetricsData() {
        if (!realTimeDataReader.isServerAvailable()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }

        List<Bulletin> bulletinList = bulletinService.listBulletin();
        List<BulletinMetricsData> dataList = bulletinList.stream()
                .map(this::buildBulletinMetricsData)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Message.success(dataList));
    }

    private BulletinMetricsData buildBulletinMetricsData(Bulletin bulletin) {
        BulletinMetricsData.BulletinMetricsDataBuilder dataBuilder = BulletinMetricsData.builder()
                .id(bulletin.getId())
                .name(bulletin.getName())
                .app(bulletin.getApp());

        BulletinMetricsData.Content.ContentBuilder contentBuilder = BulletinMetricsData.Content.builder()
                .monitorId(bulletin.getMonitorId())
                .host(monitorService.getMonitor(bulletin.getMonitorId()).getHost());

        List<BulletinMetricsData.Metric> metrics = buildMetrics(bulletin);
        contentBuilder.metrics(metrics);
        dataBuilder.content(contentBuilder.build());

        return dataBuilder.build();
    }

    private List<BulletinMetricsData.Metric> buildMetrics(Bulletin bulletin) {
        Set<String> metricSet = bulletin.getMetrics().stream()
                .map(metric -> metric.split("\\$\\$\\$")[0])
                .collect(Collectors.toSet());

        List<Pair<String, String>> metricFieldList = bulletin.getMetrics().stream()
                .map(metric -> metric.split("\\$\\$\\$"))
                .map(arr -> new Pair<>(arr[0], arr[1]))
                .collect(Collectors.toList());

        return metricSet.stream()
                .map(metric -> buildMetric(bulletin.getMonitorId(), metric, metricFieldList))
                .collect(Collectors.toList());
    }

    private BulletinMetricsData.Metric buildMetric(Long monitorId, String metric, List<Pair<String, String>> metricFieldList) {
        BulletinMetricsData.Metric.MetricBuilder metricBuilder = BulletinMetricsData.Metric.builder()
                .name(metric);

        CollectRep.MetricsData currentMetricsData = realTimeDataReader.getCurrentMetricsData(monitorId, metric);
        List<List<BulletinMetricsData.Field>> fieldsList = (currentMetricsData != null) ?
                buildFieldsListFromCurrentData(currentMetricsData) :
                buildFieldsListFromMetricFieldList(metricFieldList);

        metricBuilder.fields(fieldsList);
        return metricBuilder.build();
    }

    private List<List<BulletinMetricsData.Field>> buildFieldsListFromCurrentData(CollectRep.MetricsData currentMetricsData) {
        return currentMetricsData.getValuesList().stream()
                .map(valueRow -> {
                    List<BulletinMetricsData.Field> fields = currentMetricsData.getFieldsList().stream()
                            .map(field -> BulletinMetricsData.Field.builder()
                                    .key(field.getName())
                                    .unit(field.getUnit())
                                    .build())
                            .collect(Collectors.toList());

                    for (int i = 0; i < fields.size(); i++) {
                        fields.get(i).setValue(valueRow.getColumns(i));
                    }
                    return fields;
                })
                .collect(Collectors.toList());
    }

    private List<List<BulletinMetricsData.Field>> buildFieldsListFromMetricFieldList(List<Pair<String, String>> metricFieldList) {
        List<BulletinMetricsData.Field> fields = metricFieldList.stream()
                .map(pair -> BulletinMetricsData.Field.builder()
                        .key(pair.getLeft())
                        .unit("")
                        .value(pair.getRight())
                        .build())
                .toList();

        return Collections.singletonList(fields);
    }

}
