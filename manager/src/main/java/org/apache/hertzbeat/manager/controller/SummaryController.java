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

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.pojo.dto.Dashboard;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * System Summary Statistics API
 */
@Tag(name = "Summary Statistics API")
@RestController
@RequestMapping(path = "/api/summary", produces = {APPLICATION_JSON_VALUE})
public class SummaryController {

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @Operation(summary = "Query all application category monitoring statistics", description = "Query all application category monitoring statistics")
    public ResponseEntity<Message<Dashboard>> appMonitors() {
        List<AppCount> appsCount = monitorService.getAllAppMonitorsCount();
        Message<Dashboard> message = Message.success(new Dashboard(appsCount));
        return ResponseEntity.ok(message);
    }
}
