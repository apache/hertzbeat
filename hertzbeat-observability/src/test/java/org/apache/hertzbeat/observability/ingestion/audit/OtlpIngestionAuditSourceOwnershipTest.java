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

package org.apache.hertzbeat.observability.ingestion.audit;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OtlpIngestionAuditSourceOwnershipTest {

    @Test
    void httpAndGrpcIngestEntrypointsUseSharedAuditBoundary() throws IOException {
        String logController = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpLogController.java");
        String signalService = source("src/main/java/org/apache/hertzbeat/observability/ingestion/service/impl/"
                + "OtlpGrpcIngestionServiceImpl.java");

        assertTrue(signalService.contains("OtlpIngestionAuditService"),
                "HTTP/gRPC metrics, logs, and traces ingest must use the shared OTLP audit/self-observability boundary");
        assertTrue(logController.contains("ingestLogsHttp(content, requestHeaders)"),
                "HTTP logs controller must delegate to the unified OTLP ingestion facade");
        assertTrue(signalService.contains("recordAccepted(\"logs\", \"http\""),
                "HTTP logs success must be audited with signal/protocol");
        assertTrue(signalService.contains("recordRejected(\"logs\", \"http\""),
                "HTTP logs failures, including quota failures, must be audited with signal/protocol");
        assertTrue(signalService.contains("recordAccepted(\"metrics\", \"http\""),
                "HTTP metrics success must be audited with signal/protocol");
        assertTrue(signalService.contains("recordRejected(\"metrics\", \"http\""),
                "HTTP metrics failures must be audited with signal/protocol");
        assertTrue(signalService.contains("recordAccepted(\"logs\", \"grpc\""),
                "gRPC logs success must be audited with signal/protocol");
        assertTrue(signalService.contains("recordRejected(\"logs\", \"grpc\""),
                "gRPC logs failures must be audited with signal/protocol");
    }

    private String source(String relativePath) throws IOException {
        return Files.readString(Path.of(relativePath));
    }
}
