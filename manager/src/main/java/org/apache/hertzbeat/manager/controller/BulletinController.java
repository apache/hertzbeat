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
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
     * delete bulletin by id
     */
    @Operation(summary = "Delete Bulletin by ID", description = "Delete Bulletin by ID")
    @DeleteMapping
    public ResponseEntity<Message<Void>> deleteBulletin(
            @Parameter(description = "Bulletin ID", example = "402372614668544")
            @RequestParam List<Long> ids) {
        if (bulletinService.deleteBulletinById(ids)) {
            return ResponseEntity.ok(Message.success("Delete success"));
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Delete failed"));
        }
    }

    @GetMapping("/metrics/{id}")
    @Operation(summary = "Query Bulletin Real Time Metrics Data",
            description = "Query Bulletin real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<List<MetricsData>>> getMetricsData(
            @Parameter(description = "Bulletin Id", example = "402372614668544")
            @PathVariable Long id) {
        boolean available = realTimeDataReader.isServerAvailable();
        if (!available) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }
        Optional<Bulletin> bulletinOptional = bulletinService.getBulletinById(id);
        if (bulletinOptional.isEmpty()) {
            return ResponseEntity.ok(Message.success("query metrics data is empty"));
        }
        Bulletin bulletin = bulletinOptional.get();
        List<String> metrics = bulletin.getMetrics().stream().map(metric ->  metric.split("-")[0]).distinct().toList();
        List<CollectRep.MetricsData> metricsDataList = metrics.stream().map(metric -> realTimeDataReader.getCurrentMetricsData(bulletin.getMonitorId(), metric)).toList();
        List<MetricsData> dataList = new ArrayList<>();
        for (CollectRep.MetricsData storageData : metricsDataList) {
            MetricsData.MetricsDataBuilder dataBuilder = MetricsData.builder();
            dataBuilder.id(storageData.getId()).app(storageData.getApp()).metrics(storageData.getMetrics())
                    .time(storageData.getTime());
            List<Field> fields = storageData.getFieldsList().stream().map(tmpField ->
                            Field.builder().name(tmpField.getName())
                                    .type(Integer.valueOf(tmpField.getType()).byteValue())
                                    .label(tmpField.getLabel())
                                    .unit(tmpField.getUnit())
                                    .build())
                    .collect(Collectors.toList());
            dataBuilder.fields(fields);
            List<ValueRow> valueRows = new LinkedList<>();
            for (CollectRep.ValueRow valueRow : storageData.getValuesList()) {
                Map<String, String> labels = new HashMap<>(8);
                List<Value> values = new LinkedList<>();
                for (int i = 0; i < fields.size(); i++) {
                    Field field = fields.get(i);
                    String origin = valueRow.getColumns(i);
                    if (CommonConstants.NULL_VALUE.equals(origin)) {
                        values.add(new Value());
                    } else {
                        values.add(new Value(origin));
                        if (field.getLabel()) {
                            labels.put(field.getName(), origin);
                        }
                    }
                }
                valueRows.add(ValueRow.builder().labels(labels).values(values).build());
            }
            dataBuilder.valueRows(valueRows);
            dataList.add(dataBuilder.build());
        }
        return ResponseEntity.ok(Message.success(dataList));
        }

    @GetMapping("/metrics")
    @Operation(summary = "Query All Bulletin Real Time Metrics Data", description = "Query All Bulletin real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<List<BulletinMetricsData>>> getAllMetricsData() {
        boolean available = realTimeDataReader.isServerAvailable();
        if (!available) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }
        List<Bulletin> bulletinList = bulletinService.listBulletin();
        List<BulletinMetricsData> dataList = new ArrayList<>();
        for (Bulletin bulletin : bulletinList) {
            BulletinMetricsData.BulletinMetricsDataBuilder dataBuilder = BulletinMetricsData.builder();
            dataBuilder.id(bulletin.getId()).name(bulletin.getName()).app(bulletin.getApp());

            BulletinMetricsData.Content.ContentBuilder contentBuilder = BulletinMetricsData.Content.builder();
            contentBuilder.monitorId(bulletin.getMonitorId()).host(monitorService.getMonitor(bulletin.getMonitorId()).getHost());

            BulletinMetricsData.Metric.MetricBuilder metricBuilder = BulletinMetricsData.Metric.builder();
            List<BulletinMetricsData.Metric> metrics = new ArrayList<>();
            for (String metric : bulletin.getMetrics().stream().map(metric -> metric.split("-")[0]).distinct().toList()){
                metricBuilder.name(metric);
                CollectRep.MetricsData currentMetricsData = realTimeDataReader.getCurrentMetricsData(bulletin.getMonitorId(), metric);
                List<List<BulletinMetricsData.Field>> fieldsList = new ArrayList<>();
                List<CollectRep.ValueRow> valuesList = currentMetricsData.getValuesList();
                for (CollectRep.ValueRow valueRow : valuesList) {
                    List<BulletinMetricsData.Field> fields = new ArrayList<>();
                    for (CollectRep.Field field : currentMetricsData.getFieldsList()) {
                        fields.add(BulletinMetricsData.Field.builder().key(field.getName()).unit(field.getUnit()).build());
                    }
                    for (int i = 0; i < fields.size(); i++) {
                        String origin = valueRow.getColumns(i);
                        fields.get(i).setValue(origin);
                    }
                    fieldsList.add(fields);
                }
                metricBuilder.fields(fieldsList);
                metrics.add(metricBuilder.build());
            }
            contentBuilder.metrics(metrics);
            dataBuilder.content(contentBuilder.build());
            dataList.add(dataBuilder.build());
        }

        return ResponseEntity.ok(Message.success(dataList));
    }

}
