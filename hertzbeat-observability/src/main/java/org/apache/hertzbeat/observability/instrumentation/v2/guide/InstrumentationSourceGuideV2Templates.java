/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.guide;

import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry.GuideContext;

/** Structured templates for Collector and managed-source recipes. */
final class InstrumentationSourceGuideV2Templates {

    private static final String TOKEN = "${HERTZBEAT_TOKEN}";
    private static final String TOKEN_NAME = "authorizationToken";

    private InstrumentationSourceGuideV2Templates() {
    }

    static List<GuideBlock> hybridCollector(GuideContext context) {
        String environment = hybridEnvironment(context) + "\n"
                + "HERTZBEAT_OTLP_GRPC_LISTEN_ENDPOINT=127.0.0.1:4317\n"
                + "HERTZBEAT_OTLP_HTTP_LISTEN_ENDPOINT=127.0.0.1:4318";
        String configuration = "collector:\n"
                + "  otel-runtime:\n"
                + "    enabled: ${HERTZBEAT_OTEL_RUNTIME_ENABLED}\n"
                + "    export-endpoint: ${HERTZBEAT_OTLP_HTTP_ENDPOINT}\n"
                + "    token: ${HERTZBEAT_OTLP_TOKEN}\n"
                + "    otlp-grpc-endpoint: ${HERTZBEAT_OTLP_GRPC_LISTEN_ENDPOINT}\n"
                + "    otlp-http-endpoint: ${HERTZBEAT_OTLP_HTTP_LISTEN_ENDPOINT}";
        return common("hertzbeat_collector", environment, "yaml", configuration);
    }

    static List<GuideBlock> openTelemetry(GuideContext context) {
        String environment = tokenEnvironment();
        String exporter = "processors:\n"
                + "  resource/hertzbeat_context:\n"
                + "    attributes:\n"
                + "      - key: service.name\n"
                + "        value: \"" + context.service().name() + "\"\n"
                + "        action: upsert\n"
                + "      - key: service.namespace\n"
                + "        value: \"" + context.service().namespace() + "\"\n"
                + "        action: upsert\n"
                + "      - key: deployment.environment.name\n"
                + "        value: \"" + context.service().environment() + "\"\n"
                + "        action: upsert\n"
                + "exporters:\n"
                + "  otlphttp/hertzbeat:\n"
                + "    endpoint: " + context.endpoint() + "\n"
                + "    headers:\n"
                + "      Authorization: \"Bearer ${env:HERTZBEAT_TOKEN}\"\n"
                + "# Merge these entries into every intended service pipeline:\n"
                + "# processors: [<existing-processors>, resource/hertzbeat_context]\n"
                + "# exporters: [<existing-exporters>, otlphttp/hertzbeat]";
        String locationKey = "instrumentation.location.otel_collector";
        return List.of(
                copyable(
                        "configure_environment",
                        BlockType.ENVIRONMENT,
                        "instrumentation.v2.block.configure_environment",
                        locationKey,
                        "dotenv",
                        environment),
                copyable(
                        "configure_exporter",
                        BlockType.CODE,
                        "instrumentation.v2.block.configure_exporter",
                        locationKey,
                        "yaml",
                        exporter),
                explanatory(
                        "merge_exporter",
                        BlockType.NOTE,
                        "instrumentation.v2.block.merge_exporter",
                        "instrumentation.v2.note.merge_exporter",
                        locationKey),
                explanatory(
                        "restart_collector",
                        BlockType.NOTE,
                        "instrumentation.v2.block.restart_collector",
                        "instrumentation.v2.note.restart_collector",
                        locationKey),
                explanatory(
                        "validate_signals",
                        BlockType.CHECK,
                        "instrumentation.v2.block.validate_signals",
                        "instrumentation.v2.check.detect_scoped_signals",
                        "instrumentation.location.hertzbeat_ui"));
    }

    static List<GuideBlock> logstash(GuideContext context) {
        String environment = tokenEnvironment()
                + "\nLOGSTASH_OTEL_TCP_HOST=otel-collector"
                + "\nLOGSTASH_OTEL_TCP_PORT=2256";
        String configuration = "# OpenTelemetry Collector config\n"
                + "receivers:\n"
                + "  tcplog/logstash:\n"
                + "    listen_address: 0.0.0.0:2256\n"
                + "    operators:\n"
                + "      - type: json_parser\n"
                + "        on_error: send_quiet\n"
                + "exporters:\n"
                + "  otlphttp/hertzbeat:\n"
                + "    endpoint: " + context.endpoint() + "\n"
                + "    headers:\n"
                + "      Authorization: \"Bearer ${env:HERTZBEAT_TOKEN}\"\n"
                + "processors:\n"
                + "  transform/logstash_context:\n"
                + "    log_statements:\n"
                + "      - context: resource\n"
                + "        statements:\n"
                + "          - set(attributes[\"service.name\"], \"" + context.service().name() + "\")\n"
                + "          - set(attributes[\"service.namespace\"], \""
                + context.service().namespace() + "\")\n"
                + "          - set(attributes[\"deployment.environment.name\"], \""
                + context.service().environment() + "\")\n"
                + "  batch:\n"
                + "service:\n"
                + "  pipelines:\n"
                + "    logs/logstash:\n"
                + "      receivers: [tcplog/logstash]\n"
                + "      processors: [transform/logstash_context, batch]\n"
                + "      exporters: [otlphttp/hertzbeat]\n"
                + "---\n"
                + "# logstash.conf: TCP JSON goes to the Collector, not directly to OTLP.\n"
                + "output {\n"
                + "  tcp {\n"
                + "    codec => json_lines\n"
                + "    host => \"${LOGSTASH_OTEL_TCP_HOST}\"\n"
                + "    port => \"${LOGSTASH_OTEL_TCP_PORT}\"\n"
                + "  }\n"
                + "}";
        return common("logstash", environment, "yaml", configuration);
    }

    static List<GuideBlock> vector(GuideContext context) {
        String configuration = "transforms:\n"
                + "  to_otlp_resource_logs:\n"
                + "    type: remap\n"
                + "    inputs: [<vector-source-id>]\n"
                + "    source: |-\n"
                + "      event = .\n"
                + "      . = {\"resourceLogs\": [{\"resource\": {\"attributes\": [\n"
                + "        {\"key\": \"service.name\", \"value\": {\"stringValue\": \""
                + context.service().name() + "\"}},\n"
                + "        {\"key\": \"service.namespace\", \"value\": {\"stringValue\": \""
                + context.service().namespace() + "\"}},\n"
                + "        {\"key\": \"deployment.environment.name\", \"value\": {\"stringValue\": \""
                + context.service().environment() + "\"}}\n"
                + "      ]}, \"scopeLogs\": [{\"logRecords\": [{\"body\": {\"stringValue\": "
                + "encode_json(event)}}]}]}]}\n"
                + "sinks:\n"
                + "  hertzbeat_otlp:\n"
                + "    type: opentelemetry\n"
                + "    inputs: [to_otlp_resource_logs]\n"
                + "    protocol:\n"
                + "      type: http\n"
                + "      uri: " + signalEndpoint(context.endpoint(), "logs") + "\n"
                + "      method: post\n"
                + "      encoding:\n"
                + "        codec: otlp\n"
                + "      request:\n"
                + "        headers:\n"
                + "          Authorization: \"Bearer ${HERTZBEAT_TOKEN}\"";
        return common("vector", tokenEnvironment(), "yaml", configuration);
    }

    static List<GuideBlock> hostMetrics(GuideContext context) {
        String environment = hybridEnvironment(context)
                + "\nHERTZBEAT_OTEL_HOST_METRICS_ENABLED=true"
                + "\nHERTZBEAT_OTEL_HOST_METRICS_INTERVAL=<10s-to-5m>";
        String configuration = runtimePrefix()
                + "    host-metrics-enabled: ${HERTZBEAT_OTEL_HOST_METRICS_ENABLED}\n"
                + "    host-metrics-interval: ${HERTZBEAT_OTEL_HOST_METRICS_INTERVAL}";
        return common("hertzbeat_collector", environment, "yaml", configuration);
    }

    static List<GuideBlock> prometheus(GuideContext context) {
        String configuration = runtimePrefix()
                + "    prometheus-targets:\n"
                + "      - name: <safe-target-name>\n"
                + "        endpoint: <http-or-https-metrics-endpoint>\n"
                + "        interval: <10s-to-5m>\n"
                + "        timeout: <1s-to-1m>";
        return common("hertzbeat_collector", hybridEnvironment(context), "yaml", configuration);
    }

    static List<GuideBlock> fileLogs(GuideContext context) {
        String configuration = runtimePrefix()
                + "    file-log-allow-roots:\n"
                + "      - /var/log/<administrator-approved-service>\n"
                + "    file-log-profiles:\n"
                + "      <administrator-approved-path-profile>:\n"
                + "        - /var/log/<administrator-approved-service>/*.log\n"
                + "    file-log-sources:\n"
                + "      - name: <safe-source-name>\n"
                + "        path-profile: <administrator-approved-path-profile>";
        return common("hertzbeat_collector", hybridEnvironment(context), "yaml", configuration);
    }

    private static List<GuideBlock> common(
            String location, String environment, String language, String configuration) {
        String locationKey = "instrumentation.location." + location;
        return List.of(
                copyable(
                        "configure_environment",
                        BlockType.ENVIRONMENT,
                        "instrumentation.v2.block.configure_environment",
                        locationKey,
                        "dotenv",
                        environment),
                copyable(
                        "configure_source",
                        BlockType.CODE,
                        "instrumentation.v2.block.configure_source",
                        locationKey,
                        language,
                        configuration),
                explanatory(
                        "restart_source",
                        BlockType.NOTE,
                        "instrumentation.v2.block.restart_source",
                        "instrumentation.v2.note.restart_source",
                        locationKey),
                explanatory(
                        "validate_signals",
                        BlockType.CHECK,
                        "instrumentation.v2.block.validate_signals",
                        "instrumentation.v2.check.detect_scoped_signals",
                        "instrumentation.location.hertzbeat_ui"));
    }

    private static GuideBlock copyable(
            String id,
            BlockType type,
            String titleKey,
            String locationKey,
            String language,
            String content) {
        return new GuideBlock(
                id,
                type,
                titleKey,
                null,
                locationKey,
                language,
                content,
                null,
                content.contains(TOKEN) ? List.of(TOKEN_NAME) : List.of());
    }

    private static GuideBlock explanatory(
            String id, BlockType type, String titleKey, String bodyKey, String locationKey) {
        return new GuideBlock(
                id, type, titleKey, bodyKey, locationKey, null, null, null, List.of());
    }

    private static String tokenEnvironment() {
        return "HERTZBEAT_TOKEN=" + TOKEN;
    }

    private static String hybridEnvironment(GuideContext context) {
        return "HERTZBEAT_OTEL_RUNTIME_ENABLED=true\n"
                + "HERTZBEAT_OTLP_HTTP_ENDPOINT=" + context.endpoint() + "\n"
                + "HERTZBEAT_OTLP_TOKEN=" + TOKEN + "\n"
                + "OTEL_RESOURCE_ATTRIBUTES=service.name=" + context.service().name()
                + ",service.namespace=" + context.service().namespace()
                + ",deployment.environment.name=" + context.service().environment();
    }

    private static String runtimePrefix() {
        return "collector:\n"
                + "  otel-runtime:\n"
                + "    enabled: ${HERTZBEAT_OTEL_RUNTIME_ENABLED}\n"
                + "    export-endpoint: ${HERTZBEAT_OTLP_HTTP_ENDPOINT}\n"
                + "    token: ${HERTZBEAT_OTLP_TOKEN}\n";
    }

    private static String signalEndpoint(String endpoint, String signal) {
        return endpoint.endsWith("/") ? endpoint + "v1/" + signal : endpoint + "/v1/" + signal;
    }
}
