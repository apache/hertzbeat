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

package org.apache.hertzbeat.observability.ingestion.quota;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OtlpIngestionQuotaSourceOwnershipTest {

    private static final Path ROOT = Path.of(System.getProperty("user.dir"));

    @Test
    void httpAndGrpcIngestEntrypointsUseSharedQuotaBoundaryBeforeForwarding() throws Exception {
        String logController = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpLogController.java");
        String signalService = source("src/main/java/org/apache/hertzbeat/observability/ingestion/service/impl/"
                + "OtlpGrpcIngestionServiceImpl.java");

        assertTrue(signalService.contains("OtlpIngestionQuotaService"),
                "HTTP/gRPC metrics, logs, and traces ingest must use the shared OTLP quota/backpressure boundary");
        assertTrue(logController.contains("ingestLogsHttp(content, requestHeaders)"),
                "HTTP logs controller must delegate to the unified OTLP ingestion facade");
        assertTrue(signalService.contains("checkRequestBytes(\"logs\", \"http\""),
                "HTTP logs must enforce quota before enrichment and Greptime forwarding");
        assertTrue(signalService.contains("checkLogItems(\"http\""),
                "HTTP logs must enforce signal item batch limits before Greptime forwarding");
        assertTrue(signalService.contains("checkRequestBytes(\"metrics\", \"http\""),
                "HTTP metrics must enforce quota before decoding and proxying");
        assertTrue(signalService.contains("checkMetricItems(\"http\""),
                "HTTP metrics must enforce signal item batch limits before proxying");
        assertTrue(signalService.contains("checkRequestBytes(\"traces\", \"http\""),
                "HTTP traces must enforce quota before decoding and proxying");
        assertTrue(signalService.contains("checkTraceItems(\"http\""),
                "HTTP traces must enforce signal item batch limits before proxying");
        assertTrue(signalService.contains("checkRequestBytes(\"metrics\", \"grpc\""),
                "gRPC metrics must enforce quota before proxying");
        assertTrue(signalService.contains("checkMetricItems(\"grpc\""),
                "gRPC metrics must enforce signal item batch limits before proxying");
        assertTrue(signalService.contains("checkRequestBytes(\"logs\", \"grpc\""),
                "gRPC logs must enforce quota before enrichment and Greptime forwarding");
        assertTrue(signalService.contains("checkLogItems(\"grpc\""),
                "gRPC logs must enforce signal item batch limits before Greptime forwarding");
        assertTrue(signalService.contains("checkRequestBytes(\"traces\", \"grpc\""),
                "gRPC traces must enforce quota before enrichment and proxying");
        assertTrue(signalService.contains("checkTraceItems(\"grpc\""),
                "gRPC traces must enforce signal item batch limits before proxying");
    }

    private String source(String relativePath) throws Exception {
        return Files.readString(ROOT.resolve(relativePath));
    }
}
