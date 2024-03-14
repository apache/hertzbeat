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

package org.dromara.hertzbeat.push.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.dromara.hertzbeat.push.service.PushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * push controller
 *
 * @author vinci
 */
@Tag(name = "Metrics Push API | 监控数据推送API")
@RestController
@RequestMapping(value = "/api/push", produces = {APPLICATION_JSON_VALUE})
public class PushController {

    @Autowired
    private PushService pushService;

    @PostMapping
    @Operation(summary = "Push metric data to hertzbeat", description = "推送监控数据到hertzbeat")
    public ResponseEntity<Message<Void>> pushMetrics(@RequestBody PushMetricsDto pushMetricsDto) {
        pushService.pushMetricsData(pushMetricsDto);
        return ResponseEntity.ok(Message.success("Push success"));
    }

    @GetMapping()
    @Operation(summary = "Get metric data for hertzbeat", description = "获取监控数据")
    public ResponseEntity<Message<PushMetricsDto>> getMetrics(
            @Parameter(description = "监控id", example = "6565463543") @RequestParam("id") final Long id,
            @Parameter(description = "上一次拉取的时间", example = "6565463543") @RequestParam("time") final Long time) {
        PushMetricsDto pushMetricsDto = pushService.getPushMetricData(id, time);
        return ResponseEntity.ok(Message.success(pushMetricsDto));
    }
}
