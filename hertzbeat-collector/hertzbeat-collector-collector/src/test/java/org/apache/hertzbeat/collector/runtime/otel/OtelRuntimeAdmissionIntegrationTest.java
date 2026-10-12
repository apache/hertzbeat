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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeAdmissionIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final int BURST_REQUESTS = 32;
    private static final int LARGE_LOG_BYTES = 3 * 1024 * 1024;

    @TempDir
    private Path tempDir;

    @Test
    void rejectsConcurrentBurstAndRecoversWithoutRestart() throws Exception {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        OtelRuntimeTestSupport.OtlpCapture sink = OtelRuntimeTestSupport.OtlpCapture.discarding();
        sink.start();
        OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                tempDir, runtimeBinary, sink.port(), "collector-admission-integration");
        properties.setRuntimeMemoryLimitMiB(64);
        properties.setRuntimeMemorySpikeLimitMiB(16);
        properties.setRuntimeMemoryCheckInterval(Duration.ofMillis(100));
        OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            URI endpoint = URI.create("http://" + properties.getOtlpHttpEndpoint() + "/v1/logs");
            byte[] largeLog = largeLogJson(LARGE_LOG_BYTES);

            sendBurst(client, endpoint, largeLog, BURST_REQUESTS);
            Thread.sleep(500);
            List<Integer> overloadedStatuses = sendBurst(client, endpoint, largeLog, BURST_REQUESTS);

            assertTrue(overloadedStatuses.stream().anyMatch(status -> status == 503),
                    () -> "concurrent burst was not refused: " + overloadedStatuses);
            awaitAccepted(client, endpoint, Duration.ofSeconds(20));
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        } finally {
            supervisor.close();
            sink.close();
        }
    }

    private static List<Integer> sendBurst(HttpClient client, URI endpoint, byte[] payload, int count) {
        List<CompletableFuture<HttpResponse<String>>> requests = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                    .build();
            requests.add(client.sendAsync(request, HttpResponse.BodyHandlers.ofString()));
        }
        CompletableFuture.allOf(requests.toArray(CompletableFuture[]::new)).join();
        return requests.stream().map(request -> request.join().statusCode()).toList();
    }

    private static void awaitAccepted(HttpClient client, URI endpoint, Duration timeout) throws Exception {
        byte[] recoveryLog = smallLogJson("hertzbeat admission recovered");
        long deadline = System.nanoTime() + timeout.toNanos();
        int status;
        do {
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(recoveryLog))
                    .build();
            status = client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status == 200) {
                return;
            }
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        assertEquals(200, status, "runtime did not leave overload admission mode");
    }

    private static byte[] largeLogJson(int targetBytes) {
        String prefix = logPrefix();
        String suffix = logSuffix();
        int bodyLength = targetBytes - prefix.length() - suffix.length();
        char[] body = new char[bodyLength];
        java.util.Arrays.fill(body, 'x');
        return (prefix + new String(body) + suffix).getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] smallLogJson(String body) {
        return (logPrefix() + body + logSuffix()).getBytes(StandardCharsets.UTF_8);
    }

    private static String logPrefix() {
        long now = System.currentTimeMillis() * 1_000_000;
        return "{\"resourceLogs\":[{\"scopeLogs\":[{\"logRecords\":[{\"timeUnixNano\":\""
                + now + "\",\"body\":{\"stringValue\":\"";
    }

    private static String logSuffix() {
        return "\"}}]}]}]}";
    }
}
