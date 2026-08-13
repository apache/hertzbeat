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

import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATASOURCE_PASSWORD;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATASOURCE_URL;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATASOURCE_USERNAME;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_DATABASE;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_GRPC;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_HTTP;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_PASSWORD;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_USERNAME;

import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportFormat;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportRequest;

/** Incrementally writes frozen external configuration formats without retaining a rendered body. */
public final class SetupExportRenderer {

    public void write(ExportRequest request, OutputStream output) throws IOException {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(output, "output");
        switch (request.format()) {
            case YAML -> writeYaml(request.configuration(), output);
            case ENV -> writeEnvironment(request.configuration(), output);
            case KUBERNETES_SECRET -> writeKubernetesSecret(request.configuration(), output);
            default -> throw new IllegalArgumentException("Unsupported export format");
        }
        output.flush();
    }

    private static void writeYaml(ConfigurationRequest request, OutputStream output) throws IOException {
        var metadata = request.managementDatabase();
        var telemetry = request.telemetryStore();
        Writer writer = utf8Writer(output);
        writeYamlEntry(writer, DATASOURCE_URL, metadata.jdbcUrl());
        writeYamlEntry(writer, DATASOURCE_USERNAME, metadata.username());
        writeYamlEntry(writer, DATASOURCE_PASSWORD, metadata.password());
        writeYamlEntry(writer, GREPTIME_GRPC, telemetry.grpcEndpoints());
        writeYamlEntry(writer, GREPTIME_HTTP, telemetry.httpEndpoint());
        writeYamlEntry(writer, GREPTIME_DATABASE, telemetry.database());
        if (telemetry.username() != null) {
            writeYamlEntry(writer, GREPTIME_USERNAME, telemetry.username());
            writeYamlEntry(writer, GREPTIME_PASSWORD, telemetry.password());
        }
        writer.flush();
    }

    private static void writeEnvironment(ConfigurationRequest request, OutputStream output) throws IOException {
        var metadata = request.managementDatabase();
        var telemetry = request.telemetryStore();
        Writer writer = utf8Writer(output);
        writeEnvironmentEntry(writer, "SPRING_DATASOURCE_URL", metadata.jdbcUrl());
        writeEnvironmentEntry(writer, "SPRING_DATASOURCE_USERNAME", metadata.username());
        writeEnvironmentEntry(writer, "SPRING_DATASOURCE_PASSWORD", metadata.password());
        writeEnvironmentEntry(writer, "WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS", telemetry.grpcEndpoints());
        writeEnvironmentEntry(writer, "WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT", telemetry.httpEndpoint());
        writeEnvironmentEntry(writer, "WAREHOUSE_STORE_GREPTIME_DATABASE", telemetry.database());
        if (telemetry.username() != null) {
            writeEnvironmentEntry(writer, "WAREHOUSE_STORE_GREPTIME_USERNAME", telemetry.username());
            writeEnvironmentEntry(writer, "WAREHOUSE_STORE_GREPTIME_PASSWORD", telemetry.password());
        }
        writer.flush();
    }

    private static void writeKubernetesSecret(ConfigurationRequest request, OutputStream output) throws IOException {
        Writer writer = utf8Writer(output);
        writer.write("apiVersion: v1\nkind: Secret\nmetadata:\n  name: hertzbeat-setup\ntype: Opaque\ndata:\n");
        writer.write("  managed-application.yml: ");
        writer.flush();
        writeBase64(request, ExportFormat.YAML, output);
        writer.write("\n  managed-setup.env: ");
        writer.flush();
        writeBase64(request, ExportFormat.ENV, output);
        writer.write('\n');
        writer.flush();
    }

    private static void writeBase64(
            ConfigurationRequest request, ExportFormat format, OutputStream output) throws IOException {
        OutputStream encoded = Base64.getEncoder().wrap(new CloseShieldOutputStream(output));
        if (format == ExportFormat.YAML) {
            writeYaml(request, encoded);
        } else {
            writeEnvironment(request, encoded);
        }
        encoded.close();
    }

    private static void writeYamlEntry(Writer writer, String key, String value) throws IOException {
        writer.write(key);
        writer.write(": '");
        writeDynamicValue(writer, value, "''");
        writer.write("'\n");
    }

    private static void writeEnvironmentEntry(Writer writer, String key, String value) throws IOException {
        writer.write(key);
        writer.write('=');
        if (isSafeEnvironmentValue(value)) {
            writeDynamicValue(writer, value, null);
        } else {
            writer.write('\'');
            writeDynamicValue(writer, value, "'\"'\"'");
            writer.write('\'');
        }
        writer.write('\n');
    }

    private static void writeDynamicValue(
            Writer writer, String value, String apostropheEscape) throws IOException {
        // Setup export is a one-time path; per-code-point flushes bound secret residency in encoder buffers.
        for (int index = 0; index < value.length();) {
            char current = value.charAt(index);
            if (current == '\'' && apostropheEscape != null) {
                writer.write(apostropheEscape);
                index++;
            } else if (Character.isHighSurrogate(current) && index + 1 < value.length()
                    && Character.isLowSurrogate(value.charAt(index + 1))) {
                writer.write(value, index, 2);
                index += 2;
            } else if (Character.isSurrogate(current)) {
                writer.write('?');
                index++;
            } else {
                writer.write(current);
                index++;
            }
            writer.flush();
        }
    }

    private static boolean isSafeEnvironmentValue(String value) {
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (!(current >= 'A' && current <= 'Z') && !(current >= 'a' && current <= 'z')
                    && !(current >= '0' && current <= '9') && "_./:@+-".indexOf(current) < 0) {
                return false;
            }
        }
        return true;
    }

    private static Writer utf8Writer(OutputStream output) {
        return new OutputStreamWriter(new DeferredFlushOutputStream(output), StandardCharsets.UTF_8);
    }

    /** Drains the UTF-8 encoder without turning every secret code point into a servlet flush. */
    private static final class DeferredFlushOutputStream extends FilterOutputStream {

        private DeferredFlushOutputStream(OutputStream output) {
            super(output);
        }

        @Override
        public void flush() {
            // The top-level renderer owns the single caller-visible flush.
        }
    }

    /** Lets a Base64 wrapper finalize padding without owning the caller's response stream. */
    private static final class CloseShieldOutputStream extends FilterOutputStream {

        private CloseShieldOutputStream(OutputStream output) {
            super(output);
        }

        @Override
        public void close() {
            // Base64 padding is already written before close reaches this shield.
        }
    }
}
