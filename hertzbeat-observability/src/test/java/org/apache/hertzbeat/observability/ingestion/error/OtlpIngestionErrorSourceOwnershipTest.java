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

package org.apache.hertzbeat.observability.ingestion.error;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source ownership guard for the shared OTLP HTTP error response boundary.
 */
class OtlpIngestionErrorSourceOwnershipTest {

    private static final Path ROOT = Path.of(System.getProperty("user.dir"));

    @Test
    void otlpHttpControllersAndServicesDelegateErrorsToSharedFactory() throws Exception {
        String logController = source("src/main/java/org/apache/hertzbeat/observability/ingestion/controller/"
                + "OtlpLogController.java");
        String signalService = source("src/main/java/org/apache/hertzbeat/observability/ingestion/service/impl/"
                + "OtlpGrpcIngestionServiceImpl.java");

        assertTrue(signalService.contains("OtlpIngestionErrorResponseFactory"),
                "metrics/logs/traces HTTP ingest must use the shared OTLP error response factory");
        assertTrue(logController.contains("ingestLogsHttp(content, requestHeaders)"),
                "logs HTTP controller must delegate errors to the unified OTLP ingestion facade");

        assertFalse(logController.contains("com.google.rpc.Status"),
                "logs HTTP ingest must not build google.rpc.Status payloads locally");
        assertFalse(logController.contains("JsonStringEncoder"),
                "logs HTTP ingest must not own fallback JSON escaping for OTLP errors");
        assertFalse(logController.contains("private HttpStatus toHttpStatus("),
                "logs HTTP ingest must not own gRPC-to-HTTP status mapping");
        assertFalse(logController.contains("toJsonErrorResponse("),
                "logs HTTP ingest must not own JSON OTLP error body construction");
        assertFalse(logController.contains("createBinaryErrorResponse("),
                "logs HTTP ingest must not own binary OTLP error body construction");

        assertFalse(signalService.contains("private ResponseEntity<byte[]> errorResponse("),
                "metrics/traces HTTP ingest must not own OTLP HTTP error response construction");
        assertFalse(signalService.contains("private byte[] toBinaryErrorResponse("),
                "metrics/traces HTTP ingest must not own binary OTLP error body construction");
        assertFalse(signalService.contains("private byte[] toJsonErrorResponse("),
                "metrics/traces HTTP ingest must not own JSON OTLP error body construction");
    }

    private String source(String relativePath) throws Exception {
        return Files.readString(ROOT.resolve(relativePath));
    }
}
