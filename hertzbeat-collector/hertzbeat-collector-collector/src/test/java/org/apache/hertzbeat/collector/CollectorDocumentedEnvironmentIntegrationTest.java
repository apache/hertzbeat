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

package org.apache.hertzbeat.collector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class CollectorDocumentedEnvironmentIntegrationTest {

    private static final String DOCUMENTED_COMMON_SECRET =
            "0123456789abcdef0123456789abcdef";

    private static final String DOCUMENTED_CLUSTER_AUTH_SECRET =
            "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    @Test
    void documentedIndependentSecretsStartStandaloneCollectorProcess() {
        org.junit.jupiter.api.Assertions.assertTimeoutPreemptively(
                Duration.ofSeconds(120),
                this::startCollectorAndVerifyStableProcess);
    }

    private void startCollectorAndVerifyStableProcess() throws Exception {
        assertEquals(32, DOCUMENTED_COMMON_SECRET.getBytes(StandardCharsets.UTF_8).length);
        assertTrue(DOCUMENTED_CLUSTER_AUTH_SECRET.getBytes(StandardCharsets.UTF_8).length >= 32);
        assertFalse(DOCUMENTED_COMMON_SECRET.equals(DOCUMENTED_CLUSTER_AUTH_SECRET));

        String testClasspath = System.getProperty(
                "surefire.test.class.path",
                System.getProperty("java.class.path"));
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        ProcessBuilder processBuilder = new ProcessBuilder(
                java.toString(),
                "-cp",
                testClasspath,
                Collector.class.getName(),
                "--spring.main.banner-mode=off");
        processBuilder.directory(Path.of("target").toAbsolutePath().toFile());
        processBuilder.redirectErrorStream(true);
        Map<String, String> environment = processBuilder.environment();
        environment.put("COMMON_SECRET", DOCUMENTED_COMMON_SECRET);
        environment.put("CLUSTER_AUTH_ACTIVE_SECRET", DOCUMENTED_CLUSTER_AUTH_SECRET);
        environment.put("IDENTITY", "documented-environment-test");
        environment.put("MANAGER_HOST", "127.0.0.1");
        environment.put("MANAGER_PORT", "65534");
        environment.put("SERVER_PORT", "0");

        Process process = processBuilder.start();
        StringBuilder output = new StringBuilder();
        Thread outputReader = Thread.ofVirtual().start(() -> readOutput(process, output));
        try {
            waitForStableStartup(process, output);
        } finally {
            process.destroy();
            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                process.waitFor(10, TimeUnit.SECONDS);
            }
            outputReader.join(TimeUnit.SECONDS.toMillis(10));
        }
    }

    private void waitForStableStartup(Process process, StringBuilder output)
            throws InterruptedException {
        Instant deadline = Instant.now().plusSeconds(90);
        while (Instant.now().isBefore(deadline)) {
            String currentOutput = snapshot(output);
            if (!process.isAlive()) {
                fail("Collector exited before stable startup:\n" + currentOutput);
            }
            if (currentOutput.contains("Started Collector")) {
                Thread.sleep(TimeUnit.SECONDS.toMillis(5));
                String stableOutput = snapshot(output);
                assertTrue(process.isAlive(), "Collector exited after startup:\n" + stableOutput);
                assertFalse(
                        stableOutput.contains("A standalone Collector must configure"),
                        stableOutput);
                assertFalse(stableOutput.contains("common.secret must be"), stableOutput);
                return;
            }
            Thread.sleep(200);
        }
        fail("Collector did not start before the deadline:\n" + snapshot(output));
    }

    private void readOutput(Process process, StringBuilder output) {
        try (BufferedReader reader =
                process.inputReader(StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                synchronized (output) {
                    output.append(line).append(System.lineSeparator());
                }
            }
        } catch (IOException exception) {
            synchronized (output) {
                output.append("Unable to read Collector output: ")
                        .append(exception.getMessage())
                        .append(System.lineSeparator());
            }
        }
    }

    private String snapshot(StringBuilder output) {
        synchronized (output) {
            return output.toString();
        }
    }
}
