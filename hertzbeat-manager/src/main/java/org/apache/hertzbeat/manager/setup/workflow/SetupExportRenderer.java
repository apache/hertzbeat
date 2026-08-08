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

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.config.ExternalConfigExportArtifact;
import org.apache.hertzbeat.manager.setup.config.SensitiveExportContent;

/** Renders the frozen export formats entirely in memory without writing setup secrets to disk. */
public final class SetupExportRenderer {

    public ExternalConfigExportArtifact render(ExportRequest request, ExportResponse metadata) {
        String content = switch (request.format()) {
            case YAML -> yaml(request.configuration());
            case ENV -> environment(request.configuration());
            case KUBERNETES_SECRET -> kubernetesSecret(request.configuration());
        };
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        try {
            return new ExternalConfigExportArtifact(metadata.fileName(), metadata.mediaType(),
                    SensitiveExportContent.of(bytes));
        } finally {
            Arrays.fill(bytes, (byte) 0);
        }
    }

    private static String yaml(ConfigurationRequest request) {
        var metadata = request.managementDatabase();
        var telemetry = request.telemetryStore();
        StringBuilder output = new StringBuilder();
        yaml(output, DATASOURCE_URL, metadata.jdbcUrl());
        yaml(output, DATASOURCE_USERNAME, metadata.username());
        yaml(output, DATASOURCE_PASSWORD, metadata.password());
        yaml(output, GREPTIME_GRPC, telemetry.grpcEndpoints());
        yaml(output, GREPTIME_HTTP, telemetry.httpEndpoint());
        yaml(output, GREPTIME_DATABASE, telemetry.database());
        if (telemetry.username() != null) {
            yaml(output, GREPTIME_USERNAME, telemetry.username());
            yaml(output, GREPTIME_PASSWORD, telemetry.password());
        }
        return output.toString();
    }

    private static String environment(ConfigurationRequest request) {
        var metadata = request.managementDatabase();
        var telemetry = request.telemetryStore();
        StringBuilder output = new StringBuilder();
        env(output, "SPRING_DATASOURCE_URL", metadata.jdbcUrl());
        env(output, "SPRING_DATASOURCE_USERNAME", metadata.username());
        env(output, "SPRING_DATASOURCE_PASSWORD", metadata.password());
        env(output, "WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS", telemetry.grpcEndpoints());
        env(output, "WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT", telemetry.httpEndpoint());
        env(output, "WAREHOUSE_STORE_GREPTIME_DATABASE", telemetry.database());
        if (telemetry.username() != null) {
            env(output, "WAREHOUSE_STORE_GREPTIME_USERNAME", telemetry.username());
            env(output, "WAREHOUSE_STORE_GREPTIME_PASSWORD", telemetry.password());
        }
        return output.toString();
    }

    private static String kubernetesSecret(ConfigurationRequest request) {
        StringBuilder output = new StringBuilder("apiVersion: v1\nkind: Secret\nmetadata:\n"
                + "  name: hertzbeat-setup\ntype: Opaque\ndata:\n");
        data(output, "managed-application.yml", yaml(request));
        data(output, "managed-setup.env", environment(request));
        return output.toString();
    }

    private static void yaml(StringBuilder output, String key, String value) {
        output.append(key).append(": '").append(value.replace("'", "''")).append("'\n");
    }

    private static void env(StringBuilder output, String key, String value) {
        output.append(key).append('=').append(environmentValue(value)).append('\n');
    }

    private static String environmentValue(String value) {
        if (value.matches("[A-Za-z0-9_./:@+\\-]*")) {
            return value;
        }
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }

    private static void data(StringBuilder output, String key, String value) {
        output.append("  ").append(key).append(": ").append(Base64.getEncoder()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8))).append('\n');
    }

}
