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

import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class OtelRuntimeFailureClassifierTest {

    @ParameterizedTest
    @MethodSource("failures")
    void classifiesStableFailureCodesWithoutReturningDiagnosticContent(
            String diagnostic, ManagedOtelRuntimeStatus.FailureCode expected) {
        assertEquals(expected, new OtelRuntimeFailureClassifier().classify(diagnostic));
    }

    private static Stream<Arguments> failures() {
        return Stream.of(
                Arguments.of("configuration validation failed", failure("configuration_error")),
                Arguments.of("listen tcp 127.0.0.1:4318: bind: address already in use", failure("port_conflict")),
                Arguments.of("export failed: connection refused", failure("backend_unavailable")),
                Arguments.of("request failed with HTTP status code 429", failure("backend_unavailable")),
                Arguments.of("export failed with HTTP 401 Unauthorized", failure("authentication_failed")),
                Arguments.of("sending queue is full", failure("queue_full")),
                Arguments.of("database reached maximum size", failure("storage_full")),
                Arguments.of("failed to enqueue: database reached maximum size", failure("storage_full")),
                Arguments.of("the storage extension has run out of available space", failure("storage_full")),
                Arguments.of("write failed: no space left on device", failure("storage_full")),
                Arguments.of("failed to open storage: checksum error", failure("storage_corrupted")),
                Arguments.of("failed to open storage: invalid database", failure("storage_corrupted")),
                Arguments.of("runtime exited unexpectedly with code 137", failure("process_crash")));
    }

    private static ManagedOtelRuntimeStatus.FailureCode failure(String name) {
        return ManagedOtelRuntimeStatus.FailureCode.valueOf(name.toUpperCase(java.util.Locale.ROOT));
    }
}
