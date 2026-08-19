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
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard.Workload;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Deprecated 1.8.x OTLP log ingestion routes kept as aliases of {@code POST /api/otlp/v1/logs}.
 *
 * <p>HertzBeat 1.8.0 documented {@code POST /api/logs/otlp/v1/logs} and also exposed
 * {@code POST /api/logs/ingest/{protocol}}. Collectors and SDKs configured against those paths keep
 * working on 1.9.x through this alias, which forwards to the same log fan-out as the canonical
 * route and stamps a {@code Deprecation} / {@code Link} header on every response.
 *
 * <p>These aliases are scheduled for removal in HertzBeat 2.0. New integrations must use
 * {@code /api/otlp/v1/logs}.
 *
 * @deprecated since 1.9.0, use {@code POST /api/otlp/v1/logs}
 */
@Deprecated(since = "1.9.0", forRemoval = true)
@Slf4j
@RestController
@Tag(name = "OTLP Log Controller (deprecated 1.8 aliases)")
public class LegacyOtlpLogRouteController {

    /**
     * Canonical route the aliases forward to.
     */
    public static final String CANONICAL_LOGS_ROUTE = "/api/otlp/v1/logs";

    /**
     * 1.8.0 documented OTLP/HTTP log route.
     */
    public static final String LEGACY_OTLP_LOGS_ROUTE = "/api/logs/otlp/v1/logs";

    /**
     * 1.8.0 protocol-named log route; only the {@code otlp} protocol ever had an adapter.
     */
    public static final String LEGACY_INGEST_ROUTE = "/api/logs/ingest/{protocol}";

    private static final String OTLP_PROTOCOL = "otlp";

    private static final String DEPRECATION_HEADER = "Deprecation";
    private static final String LINK_HEADER = "Link";
    private static final String LINK_VALUE = "<" + CANONICAL_LOGS_ROUTE + ">; rel=\"successor-version\"";

    private final OtlpLogIngestionService logIngestionService;
    private final SignalWorkloadGuard workloadGuard;

    public LegacyOtlpLogRouteController(OtlpLogIngestionService logIngestionService,
                                        SignalWorkloadGuard workloadGuard) {
        this.logIngestionService = logIngestionService;
        this.workloadGuard = workloadGuard;
    }

    @PostMapping(LEGACY_OTLP_LOGS_ROUTE)
    @Operation(summary = "Deprecated alias of POST /api/otlp/v1/logs", deprecated = true)
    public ResponseEntity<byte[]> legacyOtlpLogs(@RequestBody byte[] content, @RequestHeader HttpHeaders headers) {
        return forward(LEGACY_OTLP_LOGS_ROUTE, content, headers);
    }

    @PostMapping(LEGACY_INGEST_ROUTE)
    @Operation(summary = "Deprecated alias of POST /api/otlp/v1/logs (otlp protocol only)", deprecated = true)
    public ResponseEntity<byte[]> legacyIngest(@PathVariable("protocol") String protocol,
                                               @RequestBody byte[] content,
                                               @RequestHeader HttpHeaders headers) {
        if (!OTLP_PROTOCOL.equalsIgnoreCase(protocol)) {
            log.warn("Deprecated route /api/logs/ingest/{} rejected: only the otlp protocol is supported", protocol);
            return deprecated(ResponseEntity.status(HttpStatus.BAD_REQUEST))
                    .body(("Not support the " + protocol + " protocol log, use " + CANONICAL_LOGS_ROUTE)
                            .getBytes(StandardCharsets.UTF_8));
        }
        return forward("/api/logs/ingest/" + OTLP_PROTOCOL, content, headers);
    }

    private ResponseEntity<byte[]> forward(String legacyRoute, byte[] content, HttpHeaders headers) {
        log.warn("Deprecated OTLP log route {} was called; migrate the exporter to {} before HertzBeat 2.0",
                legacyRoute, CANONICAL_LOGS_ROUTE);
        ResponseEntity<byte[]> canonical = workloadGuard.execute(Workload.OTLP_WRITE,
                () -> logIngestionService.ingestHttp(content, headers));
        return deprecated(ResponseEntity.status(canonical.getStatusCode()).headers(canonical.getHeaders()))
                .body(canonical.getBody());
    }

    static ResponseEntity.BodyBuilder deprecated(ResponseEntity.BodyBuilder builder) {
        return builder
                .header(DEPRECATION_HEADER, "true")
                .header(LINK_HEADER, LINK_VALUE);
    }
}
