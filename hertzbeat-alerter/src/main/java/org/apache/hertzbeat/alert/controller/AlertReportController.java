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
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Extern Alarm Manage API
 */
@Tag(name = "Extern Alarm Manage API")
@RestController
public class AlertReportController {

    private static final String ALERT_REJECTED = "external_alert_rejected";
    private static final String SOURCE_UNSUPPORTED = "external_alert_source_unsupported";
    
    private final List<ExternAlertService> externAlertServiceList;

    public AlertReportController(List<ExternAlertService> externAlertServiceList) {
        this.externAlertServiceList = externAlertServiceList;
    }

    @PostMapping("/api/alerts/report/{source}")
    @Operation(summary = "Api for receive external alarm information")
    public ResponseEntity<Message<Void>> receiveExternAlert(@PathVariable(value = "source") String source, 
                                                            @RequestBody String content) {
        if (!StringUtils.hasText(source)) {
            source = "default";
        }
        return receive(source, content);
    }

    @PostMapping("/api/alerts/report")
    @Operation(summary = "Api for receive default external alarm information")
    public ResponseEntity<Message<Void>> receiveDefaultExternAlert(@RequestBody String content) {
        return receive("default", content);
    }

    @PostMapping("/api/v2/alerts")
    @Operation(summary = "Api for receive external alarm information")
    public ResponseEntity<Message<Void>> receivePrometheusServerAlert(@RequestBody String content) {
        ExternAlertService externAlertService = externAlertServiceList.stream()
                .filter(item -> "prometheus".equals(item.supportSource())).findFirst().orElse(null);
        return receive(externAlertService, content);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Message<Void>> missingBody() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(CommonConstants.FAIL_CODE, ALERT_REJECTED));
    }

    private ResponseEntity<Message<Void>> receive(String source, String content) {
        ExternAlertService externAlertService = externAlertServiceList.stream()
                .filter(item -> source.equals(item.supportSource())).findFirst().orElse(null);
        return receive(externAlertService, content);
    }

    private ResponseEntity<Message<Void>> receive(ExternAlertService externAlertService, String content) {
        if (externAlertService == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Message.fail(CommonConstants.FAIL_CODE, SOURCE_UNSUPPORTED));
        }
        try {
            externAlertService.addExternAlert(content);
            return ResponseEntity.ok(Message.success("Add extern alert success"));
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Message.fail(CommonConstants.FAIL_CODE, ALERT_REJECTED));
        }
    }
}
