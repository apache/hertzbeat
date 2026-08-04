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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class EntityFreeObservabilityTransitionContractTest {

    private static final Path REPOSITORY_ROOT = repositoryRoot();

    @Test
    void reactorAndRuntimeShouldOwnOneObservabilityModule() throws IOException {
        String rootPom = Files.readString(REPOSITORY_ROOT.resolve("pom.xml"));
        String managerPom = Files.readString(REPOSITORY_ROOT.resolve("hertzbeat-manager/pom.xml"));

        assertTrue(rootPom.contains("<module>hertzbeat-observability</module>"));
        assertFalse(rootPom.contains("<module>hertzbeat-log</module>"));
        assertTrue(managerPom.contains("<artifactId>hertzbeat-observability</artifactId>"));
        assertFalse(managerPom.contains("<artifactId>hertzbeat-log</artifactId>"));
        assertFalse(Files.exists(REPOSITORY_ROOT.resolve("hertzbeat-log")));
    }

    @Test
    void productionSourcesShouldExposeOnlyTheCanonicalEntityFreeContract() throws IOException {
        Path sourceRoot = REPOSITORY_ROOT.resolve("hertzbeat-observability/src/main/java");
        assertTrue(Files.isDirectory(sourceRoot));

        String productionSources;
        try (Stream<Path> sources = Files.walk(sourceRoot)) {
            productionSources = sources
                    .filter(path -> path.toString().endsWith(".java"))
                    .map(EntityFreeObservabilityTransitionContractTest::readSource)
                    .reduce("", (left, right) -> left + '\n' + right);
        }

        assertTrue(productionSources.contains("/api/otlp/v1"));
        assertTrue(productionSources.contains("/api/observability"));
        assertFalse(productionSources.contains("/api/logs/otlp"));
        assertFalse(productionSources.contains("/api/logs/ingest"));
        assertFalse(productionSources.contains("/api/logs"));
        assertFalse(productionSources.contains("/api/ingestion/otlp"));
        assertFalse(productionSources.contains("/api/traces"));
        assertFalse(productionSources.contains("org.apache.hertzbeat.manager.service.entity"));
        assertFalse(productionSources.contains("HERTZBEAT_ENTITY_ID"));
        assertFalse(productionSources.contains("HERTZBEAT_ENTITY_TYPE"));
        assertFalse(productionSources.contains("EntityObservability"));
        assertFalse(productionSources.contains("EntityTrace"));
        assertFalse(productionSources.contains("OtlpEntity"));
    }

    @Test
    void warehouseShouldOwnGreptimeSignalStorageSchemaAndQueries() throws IOException {
        Path warehouseRoot = REPOSITORY_ROOT.resolve("hertzbeat-warehouse/src/main");
        Path observabilityRoot = REPOSITORY_ROOT.resolve("hertzbeat-observability/src/main");

        assertTrue(Files.isRegularFile(warehouseRoot.resolve(
                "java/org/apache/hertzbeat/warehouse/store/history/tsdb/greptime/GreptimeSignalInitializer.java")));
        assertTrue(Files.isRegularFile(warehouseRoot.resolve(
                "java/org/apache/hertzbeat/warehouse/store/history/tsdb/greptime/GreptimeOtlpSignalStorage.java")));
        assertTrue(Files.isRegularFile(warehouseRoot.resolve(
                "java/org/apache/hertzbeat/warehouse/service/impl/GreptimeThreeSignalQueryService.java")));
        assertTrue(Files.isRegularFile(warehouseRoot.resolve("resources/greptime/tables/hertzbeat_traces.sql")));
        assertTrue(Files.isRegularFile(warehouseRoot.resolve(
                "resources/greptime/pipelines/hertzbeat_otlp_log_v1.yaml")));

        assertFalse(Files.exists(observabilityRoot.resolve(
                "java/org/apache/hertzbeat/observability/config/GreptimeSignalInitializer.java")));
        assertFalse(Files.exists(observabilityRoot.resolve(
                "java/org/apache/hertzbeat/observability/service/impl/GreptimeThreeSignalQueryService.java")));
        assertFalse(Files.exists(observabilityRoot.resolve("resources/greptime")));

        String warehousePom = Files.readString(REPOSITORY_ROOT.resolve("hertzbeat-warehouse/pom.xml"));
        assertFalse(warehousePom.contains("<artifactId>hertzbeat-observability</artifactId>"));
        String observabilityForwarder = Files.readString(observabilityRoot.resolve(
                "java/org/apache/hertzbeat/observability/service/impl/GreptimeOtlpSignalForwarder.java"));
        assertTrue(observabilityForwarder.contains("OtlpSignalStorage"));
        assertFalse(observabilityForwarder.contains("RestTemplate"));
    }

    @Test
    void currentSecurityConfigurationsShouldProtectOnlyCanonicalObservabilityRoutes() throws IOException {
        for (String relativePath : new String[] {
                "hertzbeat-startup/src/main/resources/sureness.yml",
                "hertzbeat-manager/src/test/resources/sureness.yml",
                "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
                "script/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
                "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
                "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml"
        }) {
            String securityConfig = Files.readString(REPOSITORY_ROOT.resolve(relativePath));
            assertTrue(securityConfig.contains("/api/otlp/v1/**===post===[admin,user]"), relativePath);
            assertTrue(securityConfig.contains("/api/observability/**===get===[admin,user,guest]"), relativePath);
            assertTrue(securityConfig.contains("/api/observability/logs===delete===[admin]"), relativePath);
            assertFalse(securityConfig.contains("/api/logs/"), relativePath);
            assertFalse(securityConfig.contains("/api/ingestion/otlp"), relativePath);
            assertFalse(securityConfig.contains("/api/traces/"), relativePath);
            assertFalse(securityConfig.contains("/api/otlp/**"), relativePath);
            assertFalse(securityConfig.contains("/api/observability/capability===get"), relativePath);
        }
    }

    @Test
    void productAndSelfTelemetryShouldUseSeparateSignalTables() throws IOException {
        String traceSchema = Files.readString(REPOSITORY_ROOT.resolve(
                "hertzbeat-warehouse/src/main/resources/greptime/tables/hertzbeat_traces.sql"));
        assertTrue(traceSchema.contains("CREATE TABLE IF NOT EXISTS hertzbeat_traces"));
        assertFalse(traceSchema.contains("CREATE TABLE IF NOT EXISTS hzb_traces"));

        String selfTelemetry = Files.readString(REPOSITORY_ROOT.resolve(
                "hertzbeat-otel/src/main/java/org/apache/hertzbeat/otel/config/OpenTelemetryConfig.java"));
        assertTrue(selfTelemetry.contains("DEFAULT_LOGS_TABLE_NAME = \"hzb_internal_logs\""));
        assertTrue(selfTelemetry.contains("DEFAULT_TRACES_TABLE_NAME = \"hzb_internal_traces\""));
        assertFalse(selfTelemetry.contains("DEFAULT_LOGS_TABLE_NAME = \"hertzbeat_logs\""));
        assertFalse(selfTelemetry.contains("DEFAULT_TRACES_TABLE_NAME = \"hertzbeat_traces\""));
    }

    @Test
    void currentClientsDocsAndProbesShouldUseCanonicalObservabilityRoutes() throws IOException {
        for (String relativePath : new String[] {
                "web-app/src/app/service/log.service.ts",
                "web-app/src/app/service/observability.service.ts",
                "web-app/src/app/routes/log/log-stream/log-stream.component.ts",
                "web-app/src/assets/doc/log-integration/otlp.en-US.md",
                "web-app/src/assets/doc/log-integration/otlp.zh-CN.md",
                "home/docs/help/log_integration.md",
                "home/i18n/zh-cn/docusaurus-plugin-content-docs/current/help/log_integration.md",
                "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/vector.yml"
        }) {
            String content = Files.readString(REPOSITORY_ROOT.resolve(relativePath));
            assertFalse(content.contains("/api/logs"), relativePath);
            assertFalse(content.contains("/logs/list"), relativePath);
            assertFalse(content.contains("/logs/stats"), relativePath);
            assertFalse(content.contains("/ingestion/otlp/metrics"), relativePath);
            assertFalse(content.contains("/traces/list"), relativePath);
            assertFalse(content.contains("/traces/stats"), relativePath);
        }

        String logService = Files.readString(REPOSITORY_ROOT.resolve("web-app/src/app/service/log.service.ts"));
        assertTrue(logService.contains("/observability/logs"));
        String observabilityService = Files.readString(
                REPOSITORY_ROOT.resolve("web-app/src/app/service/observability.service.ts"));
        assertTrue(observabilityService.contains("/observability/metrics/query"));
        assertTrue(observabilityService.contains("/observability/traces"));
        String streamComponent = Files.readString(REPOSITORY_ROOT.resolve(
                "web-app/src/app/routes/log/log-stream/log-stream.component.ts"));
        assertTrue(streamComponent.contains("/api/observability/logs/stream"));
        String vectorConfig = Files.readString(REPOSITORY_ROOT.resolve(
                "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/vector.yml"));
        assertTrue(vectorConfig.contains("/api/otlp/v1/logs"));
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
