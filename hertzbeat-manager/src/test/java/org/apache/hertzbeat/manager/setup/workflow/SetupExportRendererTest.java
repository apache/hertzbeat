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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportFormat;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.junit.jupiter.api.Test;

class SetupExportRendererTest {

    private final SetupExportRenderer renderer = new SetupExportRenderer();

    @Test
    void streamsYamlAndEnvironmentWithExactFrozenEscaping() throws IOException {
        assertEquals(expectedYaml(), render(ExportFormat.YAML).toString(StandardCharsets.UTF_8));
        assertEquals(expectedEnvironment(), render(ExportFormat.ENV).toString(StandardCharsets.UTF_8));
    }

    @Test
    void preservesSurrogateReplacementAndCodePointEscaping() throws IOException {
        String password = "pair-😀-high-\uD800-low-\uDC00-O'Brien";
        ConfigurationRequest configuration = configurationWithPassword(password);

        String yaml = render(ExportFormat.YAML, configuration).toString(StandardCharsets.UTF_8);
        String environment = render(ExportFormat.ENV, configuration).toString(StandardCharsets.UTF_8);

        assertTrue(yaml.contains("spring.datasource.password: 'pair-😀-high-?-low-?-O''Brien'\n"));
        assertTrue(environment.contains(
                "SPRING_DATASOURCE_PASSWORD='pair-😀-high-?-low-?-O'\"'\"'Brien'\n"));
    }

    @Test
    void longSecretReachesOutputBeforeTheFieldTraversalCanComplete() throws Exception {
        String password = "x".repeat(9_000);
        String emittedThroughFirstSecretCodePoint = """
                spring.datasource.url: 'jdbc:h2:mem:setup'
                spring.datasource.username: 'safe_user'
                spring.datasource.password: 'x""";
        int blockAfter = emittedThroughFirstSecretCodePoint.getBytes(StandardCharsets.UTF_8).length;
        BlockingOutputStream output = new BlockingOutputStream(blockAfter);

        try (var executor = Executors.newSingleThreadExecutor()) {
            var rendering = executor.submit(() -> {
                renderer.write(new ExportRequest(
                        ExportFormat.YAML, configurationWithPassword(password)), output);
                return null;
            });
            assertTrue(output.firstSecretWrite.await(5, TimeUnit.SECONDS));
            try {
                assertEquals(blockAfter, output.blockedSize);
                assertFalse(rendering.isDone());
            } finally {
                output.release.countDown();
            }
            rendering.get(5, TimeUnit.SECONDS);
        }
        assertEquals(1, output.flushCount);

        CloseTrackingOutputStream environmentOutput = new CloseTrackingOutputStream();
        renderer.write(new ExportRequest(
                ExportFormat.ENV, configurationWithPassword(password)), environmentOutput);
        assertEquals(1, environmentOutput.flushCount);
    }

    @Test
    void streamsKubernetesPayloadsAsExactBase64WithoutClosingCallerOutput() throws IOException {
        byte[] yaml = render(ExportFormat.YAML).toByteArray();
        byte[] environment = render(ExportFormat.ENV).toByteArray();
        CloseTrackingOutputStream output = new CloseTrackingOutputStream();

        renderer.write(new ExportRequest(ExportFormat.KUBERNETES_SECRET, configuration()), output);
        output.write('!');

        String manifest = output.toString(StandardCharsets.UTF_8);
        String encodedYaml = Base64.getEncoder().encodeToString(yaml);
        String encodedEnvironment = Base64.getEncoder().encodeToString(environment);
        assertFalse(output.closed);
        assertEquals(1, output.flushCount);
        assertTrue(encodedYaml.endsWith("=="));
        assertEquals("apiVersion: v1\nkind: Secret\nmetadata:\n  name: hertzbeat-setup\n"
                        + "type: Opaque\ndata:\n  managed-application.yml: "
                        + encodedYaml + "\n  managed-setup.env: " + encodedEnvironment + "\n!",
                manifest);
        assertArrayEquals(yaml, decodePayload(manifest, "managed-application.yml"));
        assertArrayEquals(environment, decodePayload(manifest, "managed-setup.env"));
    }

    @Test
    void propagatesClientWriteFailureWithoutMaterializingFallbackContent() {
        IOException clientAbort = new IOException("client disconnected with export-secret");
        OutputStream output = new OutputStream() {
            @Override
            public void write(int value) throws IOException {
                throw clientAbort;
            }

            @Override
            public void write(byte[] value, int offset, int length) throws IOException {
                throw clientAbort;
            }
        };

        IOException thrown = assertThrows(IOException.class,
                () -> renderer.write(new ExportRequest(ExportFormat.YAML, configuration()), output));

        assertSame(clientAbort, thrown);
    }

    @Test
    void kubernetesStreamingPropagatesMidPayloadFailureWithoutClosingCallerOutput() {
        IOException clientAbort = new IOException("client disconnected with export-secret");
        FailingCloseTrackingOutputStream output = new FailingCloseTrackingOutputStream(116, clientAbort);

        IOException thrown = assertThrows(IOException.class,
                () -> renderer.write(
                        new ExportRequest(ExportFormat.KUBERNETES_SECRET, configuration()), output));

        assertSame(clientAbort, thrown);
        assertFalse(output.closed);
    }

    private ByteArrayOutputStream render(ExportFormat format) throws IOException {
        return render(format, configuration());
    }

    private ByteArrayOutputStream render(
            ExportFormat format, ConfigurationRequest configuration) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        renderer.write(new ExportRequest(format, configuration), output);
        return output;
    }

    private static byte[] decodePayload(String manifest, String key) {
        String prefix = "  " + key + ": ";
        for (String line : manifest.split("\n")) {
            if (line.startsWith(prefix)) {
                return Base64.getDecoder().decode(line.substring(prefix.length()));
            }
        }
        throw new AssertionError("Missing Kubernetes Secret payload");
    }

    private static ConfigurationRequest configuration() {
        return new ConfigurationRequest(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.EXTERNAL_APPLY,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db/main?token=${DB}\nline", "safe_user", "O'Brien"),
                new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                        "", "https://münich.example/δ", "ordinary",
                        "telemetry", "line1\n${TOKEN}'λ"));
    }

    private static ConfigurationRequest configurationWithPassword(String password) {
        return new ConfigurationRequest(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.EXTERNAL_APPLY,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2,
                        "jdbc:h2:mem:setup", "safe_user", password),
                new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                        "localhost:4001", "http://localhost:4000", "public", null, null));
    }

    private static String expectedYaml() {
        return """
                spring.datasource.url: 'jdbc:postgresql://db/main?token=${DB}
                line'
                spring.datasource.username: 'safe_user'
                spring.datasource.password: 'O''Brien'
                warehouse.store.greptime.grpc-endpoints: ''
                warehouse.store.greptime.http-endpoint: 'https://münich.example/δ'
                warehouse.store.greptime.database: 'ordinary'
                warehouse.store.greptime.username: 'telemetry'
                warehouse.store.greptime.password: 'line1
                ${TOKEN}''λ'
                """;
    }

    private static String expectedEnvironment() {
        return """
                SPRING_DATASOURCE_URL='jdbc:postgresql://db/main?token=${DB}
                line'
                SPRING_DATASOURCE_USERNAME=safe_user
                SPRING_DATASOURCE_PASSWORD='O'"'"'Brien'
                WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS=
                WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT='https://münich.example/δ'
                WAREHOUSE_STORE_GREPTIME_DATABASE=ordinary
                WAREHOUSE_STORE_GREPTIME_USERNAME=telemetry
                WAREHOUSE_STORE_GREPTIME_PASSWORD='line1
                ${TOKEN}'"'"'λ'
                """;
    }

    private static final class CloseTrackingOutputStream extends ByteArrayOutputStream {

        private boolean closed;
        private int flushCount;

        @Override
        public void flush() throws IOException {
            flushCount++;
            super.flush();
        }

        @Override
        public void close() throws IOException {
            closed = true;
            super.close();
        }
    }

    private static final class FailingCloseTrackingOutputStream extends OutputStream {

        private final int failAfter;
        private final IOException failure;
        private int written;
        private boolean closed;

        private FailingCloseTrackingOutputStream(int failAfter, IOException failure) {
            this.failAfter = failAfter;
            this.failure = failure;
        }

        @Override
        public void write(byte[] value, int offset, int length) throws IOException {
            int allowed = Math.max(0, failAfter - written);
            if (allowed < length) {
                written += allowed;
                throw failure;
            }
            written += length;
        }

        @Override
        public void write(int value) throws IOException {
            if (written >= failAfter) {
                throw failure;
            }
            written++;
        }

        @Override
        public void close() {
            closed = true;
        }
    }

    private static final class BlockingOutputStream extends OutputStream {

        private final int blockAfter;
        private final CountDownLatch firstSecretWrite = new CountDownLatch(1);
        private final CountDownLatch release = new CountDownLatch(1);
        private int written;
        private volatile int blockedSize;
        private int flushCount;

        private BlockingOutputStream(int blockAfter) {
            this.blockAfter = blockAfter;
        }

        @Override
        public void write(byte[] value, int offset, int length) throws IOException {
            written += length;
            blockIfFirstSecretCodePointWasWritten();
        }

        @Override
        public void write(int value) throws IOException {
            written++;
            blockIfFirstSecretCodePointWasWritten();
        }

        @Override
        public void flush() {
            flushCount++;
        }

        private void blockIfFirstSecretCodePointWasWritten() throws IOException {
            if (blockedSize == 0 && written >= blockAfter) {
                blockedSize = written;
                firstSecretWrite.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) {
                        throw new IOException("Timed out waiting to continue export rendering");
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IOException("Interrupted while observing export streaming", exception);
                }
            }
        }
    }
}
