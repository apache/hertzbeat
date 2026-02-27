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
import org.apache.hertzbeat.push.config.PushErrorRequestWrapper;
import org.apache.hertzbeat.push.config.PushSuccessRequestWrapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * push gateway controller
 */
@Tag(name = "Metrics Push Gateway API")
@RestController
@RequestMapping(value = "/api/push/prometheus/**")
public class PushPrometheusController {

    @PostMapping()
    @Operation(summary = "Prometheus push gateway", description = "Push prometheus metric data to hertzbeat")
    public ResponseEntity<Message<Void>> pushMetrics(HttpServletRequest request) {
        if (request instanceof PushErrorRequestWrapper error) {
            return ResponseEntity.badRequest().body(Message.success(String.format("Push failed, job: %s, instance: %s", 
                            error.getJob(), error.getInstance())));
        }
        else if (request instanceof PushSuccessRequestWrapper success) {
            return ResponseEntity.ok(Message.success(String.format("Push success, job: %s, instance: %s",
                    success.getJob(), success.getInstance())));
        }
        else {
            return ResponseEntity.badRequest()
                    .body(Message.success(String.format("Request  %s not matched.", request.getRequestURI())));
        }
    }

}
