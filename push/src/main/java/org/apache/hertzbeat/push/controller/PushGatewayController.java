/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;

/**
 * push gateway controller
 */
@Tag(name = "Metrics Push Gateway API | 监控数据推送网关API")
@RestController
@RequestMapping(value = "/api/push/pushgateway")
public class PushGatewayController {

    @Autowired
    private PushGatewayService pushGatewayService;

    @PostMapping()
    @Operation(summary = "Push metric data to hertzbeat pushgateway", description = "推送监控数据到hertzbeat推送网关")
    public ResponseEntity<Message<Void>> pushMetrics(HttpServletRequest request) throws IOException {
        InputStream inputStream = request.getInputStream();
        boolean result = pushGatewayService.pushMetricsData(inputStream);
        if (result) {
            return ResponseEntity.ok(Message.success("Push success"));
        }
        else {
            return ResponseEntity.ok(Message.success("Push failed"));
        }
    }

}
