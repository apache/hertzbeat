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
import com.fasterxml.jackson.core.type.TypeReference;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinVo;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.Pair;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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

    private static final String NO_DATA = "No Data";
    private static final String EMPTY_STRING = "";

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
        try {
            bulletinService.validate(bulletinDto);
            bulletinService.addBulletin(bulletinDto);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Add success!"));
    }

    /**
     * get All Names
     */
    @Operation(summary = "Get All Bulletin Names", description = "Get All Bulletin Names")
    @GetMapping("/names")
    public ResponseEntity<Message<List<String>>> getAllNames() {
        List<String> names = bulletinService.getAllNames();
        return ResponseEntity.ok(Message.success(names));
    }

    /**
     * delete bulletin by name
     */
    @Operation(summary = "Delete Bulletin by Name", description = "Delete Bulletin by Name")
    @DeleteMapping
    public ResponseEntity<Message<Void>> deleteBulletin(
            @Parameter(description = "Bulletin Name", example = "402372614668544")
            @RequestParam List<String> names) {
        try {
            bulletinService.deleteBulletinByName(names);
        }catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Delete failed!" + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Delete success!"));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Query All Bulletin Real Time Metrics Data", description = "Query All Bulletin real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<?>> getAllMetricsData(
            @RequestParam(name = "name") String name,
            @RequestParam(defaultValue = "0", name = "pageIndex") int pageIndex,
            @RequestParam(defaultValue = "10", name = "pageSize") int pageSize) {
        if (!realTimeDataReader.isServerAvailable()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }

        Pageable pageable = PageRequest.of(pageIndex, pageSize);
        Bulletin bulletin = bulletinService.getBulletinByName(name);

        BulletinMetricsData.BulletinMetricsDataBuilder contentBuilder = BulletinMetricsData.builder()
                .name(bulletin.getName())
                .column(bulletin.getMetrics().toString());


        BulletinMetricsData data = buildBulletinMetricsData(contentBuilder, bulletin);



//        Page<BulletinMetricsData> metricsDataPage = new PageImpl<>(dataList, pageable, bulletinPage.getTotalElements());

        return ResponseEntity.ok(Message.success(contentBuilder));
    }

    private BulletinMetricsData buildBulletinMetricsData(BulletinMetricsData.BulletinMetricsDataBuilder contentBuilder, Bulletin bulletin) {
        List<BulletinMetricsData.Data> dataList = new ArrayList<>();
        for (Long monitorId : bulletin.getMonitorIds()) {
            BulletinMetricsData.Data.DataBuilder dataBuilder = BulletinMetricsData.Data.builder()
                    .monitorId(monitorId)
                    .app(bulletin.getApp())
                    .host(monitorService.getMonitor(monitorId).getHost());

            List<String> metricList = bulletin.getMetrics();

            Map<String, List<String>> fields; fields = JsonUtil.fromJson(bulletin.getFields(), new TypeReference<>() {});
//            for (Map<String, List<String>> metrics : fields) {
//                for (Map.Entry<String, List<String>> entry : metrics.entrySet()) {
//                    String metric = entry.getKey();
//
//                }
//            }
            BulletinMetricsData.Metric.MetricBuilder metricBuilder = BulletinMetricsData.Metric.builder()
                    .name(null);
            System.out.println(metricList);
            System.out.println(fields);
            CollectRep.MetricsData currentMetricsData = realTimeDataReader.getCurrentMetricsData(monitorId, null);
            List<List<BulletinMetricsData.Field>> fieldsList = (currentMetricsData != null) ?
                    buildFieldsListFromCurrentData(currentMetricsData) :
                    buildFieldsListFromMetricFieldList(null, null);

            metricBuilder.fields(fieldsList);
            dataBuilder.metrics(null);
            dataList.add(dataBuilder.build());
        }

        contentBuilder.data(dataList);
        return contentBuilder.build();
    }




    private List<List<BulletinMetricsData.Field>> buildFieldsListFromCurrentData(CollectRep.MetricsData currentMetricsData) {
        return currentMetricsData.getValuesList().stream()
                .map(valueRow -> {
                    List<BulletinMetricsData.Field> fields = currentMetricsData.getFieldsList().stream()
                            .map(field -> BulletinMetricsData.Field.builder()
                                    .key(field.getName())
                                    .unit(field.getUnit())
                                    .build())
                            .toList();

                    for (int i = 0; i < fields.size(); i++) {
                        fields.get(i).setValue(valueRow.getColumns(i));
                    }
                    return fields;
                })
                .toList();
    }

    private List<List<BulletinMetricsData.Field>> buildFieldsListFromMetricFieldList(String metric, Map<String, List<String>> fields) {
//        List<BulletinMetricsData.Field> fields = fieldList.stream()
//                .filter(map -> pair.getLeft().equals(metric))
//                .map(pair -> BulletinMetricsData.Field.builder()
//                        .key(pair.getRight())
//                        .unit(NO_DATA)
//                        .value(EMPTY_STRING)
//                        .build())
//                .toList();

        return Collections.singletonList(null);
    }
}