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

package org.apache.hertzbeat.log.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.log.service.LogProtocolAdapter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Log Ingestion Controller
 */
@Tag(name = "Log Ingestion Controller")
@RestController
@RequestMapping(path = "/api/logs", produces = "application/json")
@Slf4j
public class LogIngestionController {

    private static final String DEFAULT_PROTOCOL = "otlp";
    private final List<LogProtocolAdapter> protocolAdapters;

    public LogIngestionController(List<LogProtocolAdapter> protocolAdapters) {
        this.protocolAdapters = protocolAdapters;
    }

    /**
     * Receive log payload pushed from external system specifying the log protocol.
     * Examples:
     *  - POST /api/logs/ingest/otlp         (content body is OTLP JSON)
     *
     * @param protocol  log protocol identifier
     * @param content raw request body
     */
    @PostMapping("/ingest/{protocol}")
    public ResponseEntity<Message<Void>> ingestExternLog(@PathVariable("protocol") String protocol,
                                                         @RequestBody String content) {
        log.debug("Receive extern log from protocol: {}, content length: {}", protocol, content == null ? 0 : content.length());
        if (!StringUtils.hasText(protocol)) {
            protocol = DEFAULT_PROTOCOL; // Default to OTLP if no protocol specified
        }
        for (LogProtocolAdapter adapter : protocolAdapters) {
            if (adapter.supportProtocol().equalsIgnoreCase(protocol)) {
                try {
                    adapter.ingest(content);
                    return ResponseEntity.ok(Message.success("Add extern log success"));
                } catch (Exception e) {
                    log.error("Add extern log failed: {}", e.getMessage(), e);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Message.fail(CommonConstants.FAIL_CODE, "Add extern log failed: " + e.getMessage()));
                }
            }
        }
        log.warn("Not support extern log from protocol: {}", protocol);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(CommonConstants.FAIL_CODE, "Not support the " + protocol + " protocol log"));
    }

    /**
     * Receive default log payload (when protocol is not specified).
     * It will look for a service whose supportProtocol() returns "otlp".
     */
    @PostMapping("/ingest")
    public ResponseEntity<Message<Void>> ingestDefaultExternLog(@RequestBody String content) {
        log.info("Receive default extern log content, length: {}", content == null ? 0 : content.length());
        LogProtocolAdapter adapter = protocolAdapters.stream()
                .filter(item -> DEFAULT_PROTOCOL.equalsIgnoreCase(item.supportProtocol()))
                .findFirst()
                .orElse(null);
        if (adapter != null) {
            try {
                adapter.ingest(content);
                return ResponseEntity.ok(Message.success("Add extern log success"));
            } catch (Exception e) {
                log.error("Add extern log failed: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Message.fail(CommonConstants.FAIL_CODE, "Add extern log failed: " + e.getMessage()));
            }
        }
        log.error("Not support default extern log protocol");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(CommonConstants.FAIL_CODE, "Not support the default protocol log"));
    }
}
