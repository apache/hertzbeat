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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.usthe.sureness.matcher.util.TirePathTree;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.config.OpenTelemetryConfig;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Guards module, transport and authorization boundaries after the React/OTLP migration.
 */
class EntityFreeObservabilityTransitionContractTest {

    private static final Path REPOSITORY_ROOT = repositoryRoot();
    private static final String OBSERVABILITY = "hertzbeat-observability/src/main/";
    private static final String JAVA = OBSERVABILITY + "java/org/apache/hertzbeat/observability/";
    private static final String RUNTIME_RULES = "hertzbeat-startup/src/main/resources/sureness.yml";

    @Test
    void reactorAndRuntimeShouldOwnOneObservabilityModule() throws IOException {
        String rootPom = source("pom.xml");
        String managerPom = source("hertzbeat-manager/pom.xml");
        assertTrue(rootPom.contains("<module>hertzbeat-observability</module>"));
        assertFalse(rootPom.contains("<module>hertzbeat-log</module>"));
        assertTrue(managerPom.contains("<artifactId>hertzbeat-observability</artifactId>"));
        assertFalse(managerPom.contains("<artifactId>hertzbeat-log</artifactId>"));
        assertFalse(Files.exists(REPOSITORY_ROOT.resolve("hertzbeat-log")));
    }

    @Test
    void productionSourcesShouldKeepTransportAndManagerPersistenceSeparate() throws IOException {
        String logs = source(JAVA + "ingestion/controller/OtlpLogController.java");
        String signals = source(JAVA + "ingestion/controller/OtlpSignalIngestionController.java");
        assertTrue(logs.contains("\"/api/logs/otlp\", \"/api/otlp\""));
        assertTrue(logs.contains("otlpGrpcIngestionService.ingestLogsHttp(content, requestHeaders)"));
        assertTrue(signals.contains("otlpGrpcIngestionService.ingestMetricsHttp(content, requestHeaders)"));
        assertTrue(signals.contains("otlpGrpcIngestionService.ingestTracesHttp(content, requestHeaders)"));
        String sources;
        try (Stream<Path> paths = Files.walk(REPOSITORY_ROOT.resolve(OBSERVABILITY + "java"))) {
            sources = paths.filter(path -> path.toString().endsWith(".java"))
                    .map(EntityFreeObservabilityTransitionContractTest::readSource)
                    .collect(Collectors.joining("\n"));
        }
        assertFalse(sources.contains("org.apache.hertzbeat.manager."),
                "observability must depend on common gateways, not manager persistence");
        for (String controller : List.of("logs/controller/LogQueryController.java",
                "traces/controller/TraceQueryController.java", "ingestion/controller/OtlpIngestionController.java")) {
            String transport = source(JAVA + controller);
            assertFalse(transport.contains("SELECT "), controller);
            assertFalse(transport.contains("RestTemplate"), controller);
        }
    }

    @Test
    void warehouseAndNativeIngestionShouldOwnTheirActualStorageBoundaries() throws IOException {
        assertTrue(source("hertzbeat-warehouse/pom.xml").contains("<artifactId>hertzbeat-common-spring</artifactId>"));
        assertFalse(source("hertzbeat-warehouse/pom.xml").contains("<artifactId>hertzbeat-observability</artifactId>"));
        String initializer = source("hertzbeat-warehouse/src/main/java/org/apache/hertzbeat/warehouse/"
                + "store/history/tsdb/greptime/GreptimeSignalInitializer.java");
        assertTrue(initializer.contains("greptime/tables/hertzbeat_logs.sql"));
        assertTrue(initializer.contains("greptime/pipelines/hertzbeat_otlp_log_v1.yaml"));
        assertTrue(Files.isRegularFile(REPOSITORY_ROOT.resolve(
                "hertzbeat-common-core/src/main/resources/greptime/pipelines/hertzbeat_otlp_log_v1.yaml")));
        assertFalse(Files.exists(REPOSITORY_ROOT.resolve(
                "hertzbeat-warehouse/src/main/resources/greptime/pipelines/hertzbeat_otlp_log_v1.yaml")),
                "duplicate resource must not shadow the canonical pipeline");
        assertTrue(source(JAVA + "ingestion/forwarder/GreptimeTraceTableInitializer.java")
                .contains("greptime/tables/hzb_traces.sql"));
        assertTrue(source(OBSERVABILITY + "resources/greptime/tables/hzb_traces.sql")
                .contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertTrue(source(JAVA + "ingestion/forwarder/GreptimeApmFlowInitializer.java")
                .contains("greptime/flows/hertzbeat_apm_red_1m.sql"));
        assertFalse(Files.exists(REPOSITORY_ROOT.resolve(JAVA + "service/impl/GreptimeThreeSignalQueryService.java")));
    }

    @Test
    void currentSecurityConfigurationsShouldProtectTheActiveObservabilityRoutes() throws IOException {
        Set<String> baseline = observabilitySubset(rules(RUNTIME_RULES, "resourceRole"));
        assertEquals(Set.of(
                "/api/ingestion/otlp/**===get===[admin,user,guest]",
                "/api/ingestion/otlp/metrics/console===get===[admin,user,guest]",
                "/api/otlp/**===post===[admin,user]",
                "/api/logs/**===get===[admin,user,guest]",
                "/api/logs/analysis/compare===post===[admin,user,guest]",
                "/api/logs/sse/**===get===[admin,user,guest]",
                "/api/traces/**===get===[admin,user,guest]",
                "/api/otlp/v1/**===post===[admin,user]",
                "/api/logs/otlp/**===post===[admin,user]",
                "/api/logs/ingest/**===post===[admin,user]",
                "/api/observability/logs===delete===[admin]",
                "/api/logs===delete===[admin]",
                "/api/observability/**===get===[admin,user,guest]",
                "/api/alert/sse/**===get===[admin,user,guest]",
                "/api/manager/sse/**===get===[admin,user,guest]"), baseline);
        for (String relativePath : configurationCopies()) {
            assertEquals(baseline, observabilitySubset(rules(relativePath, "resourceRole")), relativePath);
            assertEquals(Set.of(), observabilitySubset(rules(relativePath, "excludedResource")), relativePath);
            TirePathTree tree = new TirePathTree();
            tree.buildTree(new LinkedHashSet<>(rules(relativePath, "resourceRole")));
            for (String path : List.of("/api/otlp/v1/logs", "/api/otlp/v1/metrics", "/api/otlp/v1/traces",
                    "/api/logs/otlp/v1/logs", "/api/logs/ingest/otlp")) {
                assertEquals("[admin,user]", tree.searchPathFilterRoles(path + "===post"), relativePath + path);
            }
            assertEquals("[admin]", tree.searchPathFilterRoles("/api/alert/define/preview/query===get"), relativePath);
        }
    }

    @Test
    void activeLogDeletionMustKeepTheAdminOnlyDestructiveBoundary() throws IOException {
        assertTrue(source(JAVA + "logs/controller/LogManagerController.java").contains("path = \"/api/logs\""));
        TirePathTree tree = new TirePathTree();
        tree.buildTree(new LinkedHashSet<>(rules(RUNTIME_RULES, "resourceRole")));
        assertEquals("[admin]", tree.searchPathFilterRoles("/api/logs===delete"),
                "the active DELETE /api/logs route must not lose the former admin-only boundary");
    }

    @Test
    void productAndSelfTelemetryShouldUseSeparateSignalTables() throws Exception {
        Map<String, String> logs = sdkHeaders("buildGreptimeOtlpLogHeaders");
        Map<String, String> traces = sdkHeaders("buildGreptimeOtlpTraceHeaders");
        String nativeTraceSchema = source(OBSERVABILITY + "resources/greptime/tables/hzb_traces.sql");
        assertTrue(nativeTraceSchema.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));
        assertAll("retain the documented external/self telemetry table isolation",
                () -> assertNotEquals(WarehouseConstants.LOG_TABLE_NAME,
                        logs.get("X-Greptime-Log-Table-Name"), "SDK logs must not share the external log table"),
                () -> assertNotEquals("hzb_traces", traces.get("X-Greptime-Trace-Table-Name"),
                        "SDK traces must not share the native external trace table"));
    }

    @Test
    void currentReactClientsAndProbesShouldUseImplementedObservabilityRoutes() throws IOException {
        String api = source("web-app/src/features/explore/api/explore-api.ts");
        for (String route : List.of("/api/logs/list", "/api/traces/list", "/api/ingestion/otlp/metrics/console",
                "/api/logs/sse/subscribe")) {
            assertTrue(api.contains(route), route);
        }
        assertFalse(api.contains("/api/observability/"), "do not call removed Angular-only query paths");
        assertTrue(source("web-app/src/features/explore/api/explore-log-stream.ts")
                .contains("/api/logs/sse/validate"));
        assertTrue(source(JAVA + "logs/controller/LogQueryController.java").contains("path = \"/api/logs\""));
        assertTrue(source(JAVA + "traces/controller/TraceQueryController.java").contains("path = \"/api/traces\""));
        assertTrue(source(JAVA + "ingestion/controller/OtlpIngestionController.java")
                .contains("path = \"/api/ingestion/otlp\""));
        assertTrue(source("hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/vector.yml")
                .contains("/api/logs/otlp/v1/logs"));
        assertTrue(source("docs/observability-query-context-v1.md").contains("exact additional constraint"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> sdkHeaders(String name) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(name, GreptimeProperties.class);
        method.setAccessible(true);
        return (Map<String, String>) method.invoke(new OpenTelemetryConfig(), (GreptimeProperties) null);
    }

    @SuppressWarnings("unchecked")
    private static List<String> rules(String path, String key) throws IOException {
        Map<String, Object> document = new Yaml().load(source(path));
        return (List<String>) document.get(key);
    }

    private static Set<String> observabilitySubset(List<String> rules) {
        List<String> prefixes = List.of("/api/otlp", "/api/observability", "/api/logs", "/api/traces",
                "/api/ingestion", "/api/alert/sse", "/api/manager/sse");
        return rules.stream().filter(rule -> prefixes.stream().anyMatch(rule::startsWith)).collect(Collectors.toSet());
    }

    private static List<String> configurationCopies() {
        return List.of(RUNTIME_RULES,
                "hertzbeat-manager/src/test/resources/sureness.yml",
                "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
                "script/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml");
    }

    private static String source(String relativePath) throws IOException {
        return Files.readString(REPOSITORY_ROOT.resolve(relativePath));
    }

    private static String readSource(Path path) {
        try {
            return Files.readString(path);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to read " + path, exception);
        }
    }

    private static Path repositoryRoot() {
        Path candidate = Path.of("").toAbsolutePath();
        while (candidate != null && !Files.isRegularFile(candidate.resolve("mvnw"))) {
            candidate = candidate.getParent();
        }
        if (candidate == null) {
            throw new IllegalStateException("Unable to locate repository root");
        }
        return candidate;
    }
}
