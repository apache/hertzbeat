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

package org.apache.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Extern Alarm Manage API
 */
@Tag(name = "Extern Alarm Manage API")
@RestController
@Slf4j
public class AlertReportController {
    
    private final List<ExternAlertService> externAlertServiceList;

    public AlertReportController(List<ExternAlertService> externAlertServiceList) {
        this.externAlertServiceList = externAlertServiceList;
    }

    @PostMapping("/api/alerts/report/{source}")
    @Operation(summary = "Api for receive external alarm information")
    public ResponseEntity<Message<Void>> receiveExternAlert(@PathVariable(value = "source") String source, 
                                                            @RequestBody String content) {
        log.info("Receive extern alert from source: {}, content: {}", source, content);
        if (!StringUtils.hasText(source)) {
            source = "default";
        }
        for (ExternAlertService externAlertService : externAlertServiceList) {
            if (externAlertService.supportSource().equals(source)) {
                try {
                    externAlertService.addExternAlert(content);
                    return ResponseEntity.ok(Message.success("Add extern alert success"));      
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Message.fail(CommonConstants.FAIL_CODE, 
                                    "Add extern alert failed: " + e.getMessage()));
                }
            }
        }
        log.warn("Not support extern alert from source: {}", source);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(CommonConstants.FAIL_CODE, "Not support the " + source + " source alert"));
    }

    @PostMapping("/api/alerts/report")
    @Operation(summary = "Api for receive default external alarm information")
    public ResponseEntity<Message<Void>> receiveDefaultExternAlert(@RequestBody String content) {
        log.info("Receive default extern alert content: {}", content);
        ExternAlertService externAlertService = externAlertServiceList.stream()
                .filter(item -> "default".equals(item.supportSource())).findFirst().orElse(null);
        if (externAlertService != null) {
            try {
                externAlertService.addExternAlert(content);
                return ResponseEntity.ok(Message.success("Add extern alert success"));   
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Message.fail(CommonConstants.FAIL_CODE, 
                                "Add extern alert failed: " + e.getMessage()));
            }
        }
        log.error("Not support default extern alert");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.success("Not support the default source alert"));
    }

    @PostMapping("/api/v2/alerts")
    @Operation(summary = "Api for receive external alarm information")
    public ResponseEntity<Message<Void>> receivePrometheusServerAlert(@RequestBody String content) {
        log.info("Receive prometheus server alert, content: {}", content);
        ExternAlertService externAlertService = externAlertServiceList.stream()
                .filter(item -> "prometheus".equals(item.supportSource())).findFirst().orElse(null);
        if (externAlertService != null) {
            try {
                externAlertService.addExternAlert(content);
                return ResponseEntity.ok(Message.success("Add extern alert success"));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Message.fail(CommonConstants.FAIL_CODE,
                                "Add extern alert failed: " + e.getMessage()));
            }
        }
        log.error("Not support prometheus extern alert");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.success("Not support the prometheus source alert"));
    }
}
