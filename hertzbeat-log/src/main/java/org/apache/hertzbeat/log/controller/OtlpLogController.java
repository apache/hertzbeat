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

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import com.google.rpc.Status;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.log.service.impl.OtlpLogProtocolAdapter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * OTLP Log Ingestion Controller
 * Implements OTLP/HTTP specification for log ingestion.
 * Supports both binary-encoded Protobuf (application/x-protobuf) and JSON-encoded Protobuf (application/json).
 * 
 * @see <a href="https://opentelemetry.io/docs/specs/otlp/#otlphttp">OTLP/HTTP Specification</a>
 */
@Tag(name = "OTLP Log Controller")
@RestController
@RequestMapping(path = "/api/logs/otlp")
@Slf4j
public class OtlpLogController {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    
    private static final ExportLogsServiceResponse EMPTY_RESPONSE = ExportLogsServiceResponse.newBuilder().build();

    private final OtlpLogProtocolAdapter otlpLogProtocolAdapter;

    public OtlpLogController(OtlpLogProtocolAdapter otlpLogProtocolAdapter) {
        this.otlpLogProtocolAdapter = otlpLogProtocolAdapter;
    }

    /**
     * OTLP/HTTP standard endpoint for logs with JSON-encoded Protobuf payload.
     * Content-Type: application/json
     * 
     * Response follows OTLP specification:
     * - Success: HTTP 200 with ExportLogsServiceResponse (JSON encoded)
     * - Failure: HTTP 400 with google.rpc.Status (JSON encoded)
     *
     * @param content JSON-encoded ExportLogsServiceRequest
     * @return ExportLogsServiceResponse on success, Status on failure
     */
    @Operation(summary = "Ingest OTLP logs (JSON format)")
    @PostMapping(value = "/v1/logs", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> ingestJsonLogs(@RequestBody String content) {
        log.debug("Receive OTLP JSON logs, content length: {}", content == null ? 0 : content.length());
        try {
            otlpLogProtocolAdapter.ingest(content);
            return ResponseEntity.ok(toJsonResponse(EMPTY_RESPONSE));
        } catch (Exception e) {
            log.error("Failed to ingest OTLP JSON logs: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(toJsonErrorResponse(e.getMessage()));
        }
    }

    /**
     * OTLP/HTTP standard endpoint for logs with binary-encoded Protobuf payload.
     * Content-Type: application/x-protobuf
     * 
     * Response follows OTLP specification:
     * - Success: HTTP 200 with ExportLogsServiceResponse (binary encoded)
     * - Failure: HTTP 400 with google.rpc.Status (binary encoded)
     *
     * @param content binary-encoded ExportLogsServiceRequest
     * @return ExportLogsServiceResponse on success, Status on failure
     */
    @Operation(summary = "Ingest OTLP logs (binary Protobuf format)")
    @PostMapping(value = "/v1/logs", consumes = CONTENT_TYPE_PROTOBUF, produces = CONTENT_TYPE_PROTOBUF)
    public ResponseEntity<byte[]> ingestBinaryLogs(@RequestBody byte[] content) {
        log.debug("Receive OTLP binary logs, content length: {}", content == null ? 0 : content.length);
        try {
            otlpLogProtocolAdapter.ingestBinary(content);
            return ResponseEntity.ok(EMPTY_RESPONSE.toByteArray());
        } catch (Exception e) {
            log.error("Failed to ingest OTLP binary logs: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createBinaryErrorResponse(e.getMessage()));
        }
    }

    private String toJsonResponse(ExportLogsServiceResponse response) {
        try {
            return JsonFormat.printer().print(response);
        } catch (InvalidProtocolBufferException e) {
            return "{}";
        }
    }

    private String toJsonErrorResponse(String message) {
        Status status = Status.newBuilder()
                .setMessage(message != null ? message : "Unknown error")
                .build();
        try {
            return JsonFormat.printer().print(status);
        } catch (InvalidProtocolBufferException e) {
            return "{\"message\":\"" + escapeJson(message) + "\"}";
        }
    }

    private String escapeJson(String message) {
        if (message == null) {
            return "";
        }
        return message.replace("\\", "\\\\")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r")
                      .replace("\t", "\\t");
    }

    private byte[] createBinaryErrorResponse(String message) {
        return Status.newBuilder()
                .setMessage(message != null ? message : "Unknown error")
                .build()
                .toByteArray();
    }
}
