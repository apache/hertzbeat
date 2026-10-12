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

package org.apache.hertzbeat.observability.ingestion.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
@RequestMapping(path = {"/api/logs/otlp", "/api/otlp"})
@RequiredArgsConstructor
public class OtlpLogController {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final String CONTENT_TYPE_PROTOBUF_ALT = "application/protobuf";

    private final OtlpGrpcIngestionService otlpGrpcIngestionService;

    /**
     * OTLP/HTTP standard endpoint for logs with JSON-encoded Protobuf payload.
     * Content-Type: application/json
     *
     * Response follows OTLP specification:
     * - Success: HTTP 200 with ExportLogsServiceResponse (JSON or binary encoded)
     * - Failure: HTTP 400 with google.rpc.Status (JSON or binary encoded)
     *
     * @param content JSON-encoded ExportLogsServiceRequest
     * @return ExportLogsServiceResponse on success, Status on failure
     */
    @Operation(summary = "Ingest OTLP logs (JSON format)")
    @PostMapping(
            value = "/v1/logs",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = {MediaType.APPLICATION_JSON_VALUE, CONTENT_TYPE_PROTOBUF, CONTENT_TYPE_PROTOBUF_ALT}
    )
    public ResponseEntity<byte[]> ingestJsonLogs(@RequestBody byte[] content, @RequestHeader HttpHeaders requestHeaders) {
        return otlpGrpcIngestionService.ingestLogsHttp(content, requestHeaders);
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
    @PostMapping(
            value = "/v1/logs",
            consumes = {CONTENT_TYPE_PROTOBUF, CONTENT_TYPE_PROTOBUF_ALT},
            produces = {MediaType.APPLICATION_JSON_VALUE, CONTENT_TYPE_PROTOBUF, CONTENT_TYPE_PROTOBUF_ALT}
    )
    public ResponseEntity<byte[]> ingestBinaryLogs(@RequestBody byte[] content, @RequestHeader HttpHeaders requestHeaders) {
        return otlpGrpcIngestionService.ingestLogsHttp(content, requestHeaders);
    }
}
