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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class OtlpLogControllerSourceOwnershipTest {

    @Test
    void logHttpControllerDelegatesToUnifiedIngestionFacade() throws Exception {
        String source = Files.readString(Path.of(
                "src/main/java/org/apache/hertzbeat/observability/ingestion/controller/OtlpLogController.java"));

        assertTrue(source.contains("OtlpGrpcIngestionService"));
        assertTrue(source.contains("ingestLogsHttp(content, requestHeaders)"));
        assertFalse(source.contains("OtlpIngestionAuditService"));
        assertFalse(source.contains("OtlpIngestionGovernanceService"));
        assertFalse(source.contains("OtlpIngestionQuotaService"));
        assertFalse(source.contains("GreptimeOtlpForwarder"));
        assertFalse(source.contains("OtlpCorrelationEnricher"));
    }
}
