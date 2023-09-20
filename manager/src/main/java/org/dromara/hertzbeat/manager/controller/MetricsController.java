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

import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.common.queue.impl.InMemoryCommonDataQueue;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * hertzbeat metrics exporter
 * @author tom
 *
 */
@Tag(name = "Inner Metrics Exporter API | 内部监控指标API")
@RestController
@RequestMapping(path = "/api/metrics", produces = {APPLICATION_JSON_VALUE})
public class MetricsController {

    @Autowired
    private CommonDataQueue commonDataQueue;

    @GetMapping()
    @Operation(summary = "Get Hertzbeat Metrics Data")
    public ResponseEntity<Message<Map<String, Object>>> getMetricsInfo() {
        Map<String, Object> metricsInfo = new HashMap<>(8);
        if (commonDataQueue instanceof InMemoryCommonDataQueue) {
            Map<String, Integer> queueInfo = ((InMemoryCommonDataQueue) commonDataQueue).getQueueSizeMetricsInfo();
            metricsInfo.putAll(queueInfo);
        }
        return ResponseEntity.ok(Message.success(metricsInfo));
    }
}
