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

package org.apache.hertzbeat.observability.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard.Workload;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Canonical OTLP/HTTP log endpoint backed by the HertzBeat log fan-out. */
@RestController
@RequestMapping("/api/otlp/v1")
@Tag(name = "OTLP Log Controller")
public class OtlpLogController {

    private final OtlpLogIngestionService logIngestionService;
    private final SignalWorkloadGuard workloadGuard;

    public OtlpLogController(OtlpLogIngestionService logIngestionService, SignalWorkloadGuard workloadGuard) {
        this.logIngestionService = logIngestionService;
        this.workloadGuard = workloadGuard;
    }

    @PostMapping("/logs")
    @Operation(summary = "Ingest OTLP logs")
    public ResponseEntity<byte[]> logs(@RequestBody byte[] content, @RequestHeader HttpHeaders headers) {
        return workloadGuard.execute(Workload.OTLP_WRITE,
                () -> logIngestionService.ingestHttp(content, headers));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<byte[]> invalidPayload(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(exception.getMessage().getBytes(StandardCharsets.UTF_8));
    }
}
