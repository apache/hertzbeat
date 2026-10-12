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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class ExternalLanguageProcessHarnessTest {

    @Test
    void reportsExitedProcessOutputWithoutLeakingSensitiveValues() throws Exception {
        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("external-diagnostic-")) {
            Process process = harness.start(
                    List.of(
                            javaExecutable().toString(),
                            "-cp",
                            testClasses().toString(),
                            FailingProcess.class.getName()),
                    Map.of(),
                    "failing-process");

            assertTrue(process.waitFor(Duration.ofSeconds(5).toMillis(), TimeUnit.MILLISECONDS));
            assertEquals(23, process.exitValue());
            String diagnostic = harness.processDiagnostic(process, "failing-process");
            assertTrue(diagnostic.contains("exited with code 23"));
            assertTrue(diagnostic.contains("startup failed"));
            assertTrue(diagnostic.contains("<redacted>"));
            assertFalse(diagnostic.contains("secret-value"));
        }
    }

    @Test
    void transportsSecretOnlyThroughStdinAndRedactsChildFailure() throws Exception {
        String relayToken = "relay-secret-value";
        List<String> command = List.of(
                javaExecutable().toString(),
                "-cp",
                testClasses().toString(),
                StdinSecretProcess.class.getName());
        assertTrue(command.stream().noneMatch(argument -> argument.contains(relayToken)));

        try (ExternalLanguageProcessHarness harness = ExternalLanguageProcessHarness.create("external-secret-input-")) {
            char[] secretInput = relayToken.toCharArray();
            Process process = harness.startWithSecretInput(
                    command, Map.of(), "stdin-secret-process", secretInput);
            assertTrue(allCleared(secretInput));

            assertTrue(process.waitFor(Duration.ofSeconds(5).toMillis(), TimeUnit.MILLISECONDS));
            assertEquals(29, process.exitValue());
            String diagnostic = harness.processDiagnostic(process, "stdin-secret-process");
            assertTrue(diagnostic.contains("<redacted>"));
            assertFalse(diagnostic.contains(relayToken));

            char[] rejectedSecretInput = relayToken.toCharArray();
            assertThrows(IllegalArgumentException.class, () -> harness.startWithSecretInput(
                    List.of(javaExecutable().toString(), relayToken),
                    Map.of(),
                    "rejected-secret-argument",
                    rejectedSecretInput));
            assertTrue(allCleared(rejectedSecretInput));
        }
    }

    private boolean allCleared(char[] value) {
        for (char character : value) {
            if (character != '\0') {
                return false;
            }
        }
        return true;
    }

    private Path javaExecutable() {
        String executable = System.getProperty("os.name").toLowerCase().contains("win") ? "java.exe" : "java";
        return Path.of(System.getProperty("java.home"), "bin", executable);
    }

    private Path testClasses() throws Exception {
        return Path.of(ExternalLanguageProcessHarnessTest.class
                .getProtectionDomain().getCodeSource().getLocation().toURI());
    }

    static class FailingProcess {

        public static void main(String[] arguments) {
            System.out.println("Authorization=Bearer secret-value");
            System.out.println("startup failed");
            System.exit(23);
        }
    }

    static class StdinSecretProcess {

        public static void main(String[] arguments) throws Exception {
            String relayToken = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            System.out.println("Authorization=Bearer " + relayToken);
            System.out.println("relay startup failed");
            System.exit(29);
        }
    }
}
