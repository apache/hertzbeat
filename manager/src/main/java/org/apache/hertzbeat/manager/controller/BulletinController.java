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
import jakarta.validation.Valid;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
        try {
            bulletinService.validate(bulletinDto);
            bulletinService.addBulletin(bulletinDto);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Add success!"));
    }

    /**
     * edit a exist bulletin
     */
    @PutMapping
    public ResponseEntity<Message<Void>> editBulletin(@Valid @RequestBody BulletinDto bulletinDto) {
        try {
            bulletinService.validate(bulletinDto);
            bulletinService.editBulletin(bulletinDto);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Add success!"));
    }

    /**
     * edit a exist bulletin
     */
    @GetMapping("/{name}")
    public ResponseEntity<Message<Bulletin>> getBulletinByName(@Valid @PathVariable String name) {
        try {
            return ResponseEntity.ok(Message.success(bulletinService.getBulletinByName(name)));
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
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
        } catch (Exception e) {
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

        Bulletin bulletin = bulletinService.getBulletinByName(name);

        BulletinMetricsData.BulletinMetricsDataBuilder contentBuilder = BulletinMetricsData.builder()
                .name(bulletin.getName());
        BulletinMetricsData data = bulletinService.buildBulletinMetricsData(contentBuilder, bulletin);
        return ResponseEntity.ok(Message.success(data));
    }

}
