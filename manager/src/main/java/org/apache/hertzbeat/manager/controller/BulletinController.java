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
import org.apache.hertzbeat.common.entity.manager.Bulletin;
import org.apache.hertzbeat.manager.pojo.dto.BulletinMetricsData;
import org.apache.hertzbeat.common.util.ResponseUtil;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
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

    @Operation(summary = "New a bulletin", description = "Add new bulletin")
    @PostMapping
    public ResponseEntity<Message<Void>> addNewBulletin(@Valid @RequestBody Bulletin bulletin) {
        try {
            bulletinService.validate(bulletin);
            bulletinService.addBulletin(bulletin);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Add failed! " + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Add success!"));
    }

    @Operation(summary = "Update a bulletin", description = "Update the bulletin")
    @PutMapping
    public ResponseEntity<Message<Void>> editBulletin(@Valid @RequestBody Bulletin bulletin) {
        try {
            bulletinService.validate(bulletin);
            bulletinService.editBulletin(bulletin);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Edit failed! " + e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("Add success!"));
    }

    @Operation(summary = "Query One Bulletin", description = "Query One Bulletin")
    @GetMapping("/{id}")
    public ResponseEntity<Message<Bulletin>> getBulletin(@Valid @PathVariable Long id) {
        return ResponseEntity.ok(Message.success(bulletinService.getBulletinById(id).orElse(null)));
    }
    
    @Operation(summary = "Query Bulletins", description = "Query All Bulletin")
    @GetMapping
    public ResponseEntity<Message<Page<Bulletin>>> queryBulletins(
            @Parameter(description = "Search", example = "tom") @RequestParam(required = false) final String search,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") Integer pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(required = false) Integer pageSize) {
        return ResponseUtil.handle(() -> bulletinService.getBulletins(search, pageIndex, pageSize));
    }
    
    @Operation(summary = "Delete Bulletins", description = "Delete Bulletin by ids")
    @DeleteMapping
    public ResponseEntity<Message<Void>> deleteBulletin(@Parameter(description = "Bulletin ids") @RequestParam List<Long> ids) {
        bulletinService.deleteBulletins(ids);
        return ResponseEntity.ok(Message.success("Delete success!"));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Query All Bulletin Real Time Metrics Data", description = "Query All Bulletin real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<?>> getAllMetricsData(@RequestParam(name = "id") Long id) {
        if (!realTimeDataReader.isServerAvailable()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }
        BulletinMetricsData data = bulletinService.buildBulletinMetricsData(id);
        return ResponseEntity.ok(Message.success(data));
    }

}
