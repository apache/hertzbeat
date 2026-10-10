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

package org.apache.hertzbeat.observability.ingestion.red;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OtlpIngestionRedSummarySourceOwnershipTest {

    private static final Path ROOT = Path.of(System.getProperty("user.dir"));

    @Test
    void ingestRedSummaryIsExposedFromRealAuditEventsWithDuration() throws Exception {
        String controller = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpIngestionController.java");
        String logController = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpLogController.java");
        String signalService = source("src/main/java/org/apache/hertzbeat/observability/ingestion/service/impl/"
                + "OtlpGrpcIngestionServiceImpl.java");
        String auditEvent = source("src/main/java/org/apache/hertzbeat/observability/ingestion/audit/"
                + "OtlpIngestionAuditEvent.java");

        assertTrue(controller.contains("OtlpIngestionRedSummaryService"),
                "OTLP ingestion API must expose RED summary through the shared RED summary service");
        assertTrue(controller.contains("\"/intake/red\""),
                "OTLP ingestion API must expose a stable ingest RED summary endpoint");
        assertTrue(auditEvent.contains("Long durationMillis"),
                "Audit events must store real ingest duration evidence for RED duration");
        assertTrue(logController.contains("ingestLogsHttp(content, requestHeaders)"),
                "HTTP logs ingest must delegate to the shared ingest service that records audit duration");
        assertTrue(signalService.contains("durationMillis(startedAtNanos)"),
                "HTTP/gRPC metrics, logs, and traces ingest must record real request duration in audit events");
    }

    private String source(String relativePath) throws Exception {
        return Files.readString(ROOT.resolve(relativePath));
    }
}
