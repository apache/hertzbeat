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

package org.apache.hertzbeat.observability.ingestion.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source ownership guard for OTLP ingest request context resolution.
 */
class OtlpIngestionRequestContextSourceOwnershipTest {

    private static final Path ROOT = Path.of(System.getProperty("user.dir"));

    @Test
    void httpAndGrpcIngestPathsDelegateRequestContextResolutionToSharedBoundary() throws Exception {
        String logController = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpLogController.java");
        String signalService = source("src/main/java/org/apache/hertzbeat/observability/ingestion/service/impl/"
                + "OtlpGrpcIngestionServiceImpl.java");

        assertTrue(logController.contains("OtlpIngestionRequestContextResolver"),
                "OTLP logs HTTP ingest must resolve authenticated context through the shared boundary");
        assertTrue(signalService.contains("OtlpIngestionRequestContextResolver"),
                "OTLP metrics/traces/logs service ingest must resolve authenticated context through the shared boundary");

        assertFalse(logController.contains("OtlpCorrelationContext.empty()"),
                "OTLP logs HTTP ingest must not discard authenticated workspace context");
        assertFalse(signalService.contains("OtlpCorrelationContext.empty()"),
                "OTLP service ingest paths must not discard authenticated workspace context");
    }

    private String source(String relativePath) throws Exception {
        return Files.readString(ROOT.resolve(relativePath));
    }
}
