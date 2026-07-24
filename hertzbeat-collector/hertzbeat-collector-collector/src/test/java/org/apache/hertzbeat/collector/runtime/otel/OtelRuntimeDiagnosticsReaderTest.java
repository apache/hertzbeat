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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeDiagnosticsReaderTest {

    @TempDir
    private Path tempDir;

    @Test
    void returnsOnlyClassificationAndRedactsKnownCredentialMaterial() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setLog(Path.of("logs/runtime.log"));
        properties.setToken("collector-secret-token");
        Path log = tempDir.resolve("logs/runtime.log");
        Files.createDirectories(log.getParent());
        Files.writeString(log, "export failed with HTTP 401 Unauthorized: user log body must not escape\n");
        OtelRuntimeDiagnosticsReader reader =
                new OtelRuntimeDiagnosticsReader(new OtelRuntimeFailureClassifier());

        ManagedOtelRuntimeStatus.FailureCode code = reader.latestFailure(properties);
        String sanitized = reader.sanitize(
                "Authorization: Bearer collector-secret-token\n"
                        + "-----BEGIN CERTIFICATE-----\ncertificate-content\n-----END CERTIFICATE-----",
                properties);

        assertEquals(ManagedOtelRuntimeStatus.FailureCode.AUTHENTICATION_FAILED, code);
        assertFalse(sanitized.contains("collector-secret-token"));
        assertFalse(sanitized.contains("Authorization"));
        assertFalse(sanitized.contains("Bearer"));
        assertFalse(sanitized.contains("certificate-content"));
        assertFalse(sanitized.contains("user log body"));
    }

    @Test
    void classifiesBoundedStorageFailuresFromTheRuntimeLog() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setLog(Path.of("logs/runtime.log"));
        Path log = tempDir.resolve("logs/runtime.log");
        Files.createDirectories(log.getParent());
        OtelRuntimeDiagnosticsReader reader =
                new OtelRuntimeDiagnosticsReader(new OtelRuntimeFailureClassifier());

        Files.writeString(log, "persistent queue write failed: database reached maximum size\n");
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.STORAGE_FULL, reader.latestFailure(properties));

        Files.writeString(log, "failed to open persistent queue: checksum error\n");
        assertEquals(ManagedOtelRuntimeStatus.FailureCode.STORAGE_CORRUPTED, reader.latestFailure(properties));
    }
}
