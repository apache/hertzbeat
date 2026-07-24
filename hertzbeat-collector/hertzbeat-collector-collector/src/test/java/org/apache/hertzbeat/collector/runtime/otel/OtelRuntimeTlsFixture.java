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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

/**
 * Generates short-lived certificates for real OTLP Gateway integration tests.
 */
final class OtelRuntimeTlsFixture {

    private final Path directory;

    OtelRuntimeTlsFixture(Path directory) {
        this.directory = directory;
    }

    static boolean opensslAvailable() {
        try {
            return new ProcessBuilder("openssl", "version").start().waitFor() == 0;
        } catch (IOException error) {
            return false;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    CertificatePair server() throws Exception {
        return create("server", "localhost", List.of("-addext", "subjectAltName=IP:127.0.0.1"));
    }

    CertificatePair client() throws Exception {
        return create("client", "hertzbeat-test-client", List.of());
    }

    private CertificatePair create(String name, String commonName, List<String> extraArguments) throws Exception {
        Path certificate = directory.resolve(name + ".crt");
        Path privateKey = directory.resolve(name + ".key");
        java.util.ArrayList<String> command = new java.util.ArrayList<>(List.of(
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-keyout", privateKey.toString(), "-out", certificate.toString(),
                "-subj", "/CN=" + commonName, "-days", "1", "-sha256"));
        command.addAll(extraArguments);
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertEquals(0, process.waitFor(), output);
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(privateKey);
        return new CertificatePair(certificate, privateKey);
    }

    record CertificatePair(Path certificate, Path privateKey) {
    }
}
