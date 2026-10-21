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

package org.apache.hertzbeat.observability.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.metric.NativeMetricSystemContext;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeDbDataStorage;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.NativeMetricSystemContextResolver;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Proves the production native metric writer owns entity dimensions as Greptime tags. */
@Testcontainers
class GreptimeNativeMetricSystemDimensionsE2eTest {

    private static final String GREPTIME_IMAGE = "greptime/greptimedb:v1.1.4";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final String TABLE = "linux_native_system_dimensions";
    private static final long COLLECTION_TIME = 1_712_733_600_123L;
    private static final Pattern PRIMARY_KEY_PATTERN = Pattern.compile(
            "primary\\s+key\\s*\\(([^)]*)\\)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    @Container
    @SuppressWarnings("resource")
    private static final GenericContainer<?> GREPTIME = new GenericContainer<>(DockerImageName.parse(GREPTIME_IMAGE))
            .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    private GreptimeQueryGuard queryGuard;
    private GreptimeDbDataStorage storage;

    @AfterEach
    void closeResources() {
        if (storage != null) {
            storage.destroy();
        }
        if (queryGuard != null) {
            queryGuard.close();
        }
    }

    @Test
    void writesAuthoritativeDimensionsAsTagsAndRejectsAllCollectorCollisions() {
        GreptimeProperties properties = properties();
        RestTemplate restTemplate = new RestTemplate();
        queryGuard = new GreptimeQueryGuard(4, Duration.ofSeconds(10), Duration.ofMillis(100));
        GreptimeSqlQueryExecutor sql = new GreptimeSqlQueryExecutor(properties, restTemplate, queryGuard);
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("nativeMetricSystemContextResolver", authoritativeContextResolver());
        storage = new GreptimeDbDataStorage(properties, restTemplate, sql, queryGuard,
                beanFactory.getBeanProvider(NativeMetricSystemContextResolver.class));

        try (CollectRep.MetricsData metricsData = nativeMetrics();
                CollectRep.MetricsData missingAuthority = nativeMetricsWithoutOptionalAuthority()) {
            storage.saveData(metricsData);
            storage.saveData(missingAuthority);
        }

        await().atMost(Duration.ofSeconds(20)).pollInterval(Duration.ofMillis(200)).untilAsserted(() ->
                assertThat(sql.executeStrict("SELECT COUNT(*) AS row_count FROM " + TABLE).getFirst())
                        .containsEntry("row_count", 3));

        List<Map<String, Object>> description = sql.executeStrict("DESC " + TABLE);
        assertSemanticType(description, "hertzbeat_workspace_id", "tag");
        assertSemanticType(description, "hertzbeat_entity_id", "tag");
        assertSemanticType(description, "hertzbeat_entity_type", "tag");
        assertSemanticType(description, "hertzbeat_monitor_id", "tag");
        assertSemanticType(description, "hertzbeat_collector_id", "tag");
        assertSemanticType(description, "instance", "tag");
        assertSemanticType(description, "ts", "timestamp");
        assertSemanticType(description, "usage", "field");

        String createTable = sql.executeStrict("SHOW CREATE TABLE " + TABLE).stream()
                .flatMap(row -> row.values().stream())
                .map(String::valueOf)
                .reduce("", (left, right) -> left + "\n" + right);
        Matcher primaryKey = PRIMARY_KEY_PATTERN.matcher(createTable);
        assertThat(primaryKey.find()).as(createTable).isTrue();
        String primaryKeyColumns = primaryKey.group(1).toLowerCase(Locale.ROOT);
        assertThat(primaryKeyColumns)
                .contains("hertzbeat_workspace_id")
                .contains("hertzbeat_entity_id")
                .contains("hertzbeat_entity_type")
                .contains("hertzbeat_monitor_id")
                .contains("hertzbeat_collector_id")
                .contains("instance")
                .doesNotContain("usage");

        List<Map<String, Object>> rows = sql.executeStrict("SELECT hertzbeat_workspace_id, "
                + "hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_monitor_id, "
                + "hertzbeat_collector_id, instance, usage, device FROM " + TABLE + " ORDER BY usage DESC");
        assertThat(rows).hasSize(3);
        assertThat(rows.getFirst())
                .containsEntry("hertzbeat_workspace_id", "team-a")
                .containsEntry("hertzbeat_entity_id", "99")
                .containsEntry("hertzbeat_entity_type", "database")
                .containsEntry("hertzbeat_monitor_id", "42")
                .containsEntry("hertzbeat_collector_id", "collector-arm-1")
                .containsEntry("instance", "db.internal:3306")
                .containsEntry("device", "sda");
        assertThat(((Number) rows.getFirst().get("usage")).doubleValue()).isEqualTo(85.5D);
        assertThat(rows.get(1))
                .containsEntry("hertzbeat_workspace_id", "team-a")
                .containsEntry("hertzbeat_entity_id", "99")
                .containsEntry("hertzbeat_monitor_id", "42")
                .containsEntry("device", "sdb");
        assertThat(((Number) rows.get(1).get("usage")).doubleValue()).isEqualTo(73.25D);
        Map<String, Object> missingAuthority = rows.get(2);
        assertThat(missingAuthority)
                .containsKeys("hertzbeat_workspace_id", "hertzbeat_entity_id", "hertzbeat_entity_type",
                        "hertzbeat_collector_id", "instance")
                .containsEntry("hertzbeat_monitor_id", "43")
                .containsEntry("device", "sdc");
        assertThat(missingAuthority.get("hertzbeat_workspace_id")).isNull();
        assertThat(missingAuthority.get("hertzbeat_entity_id")).isNull();
        assertThat(missingAuthority.get("hertzbeat_entity_type")).isNull();
        assertThat(missingAuthority.get("hertzbeat_collector_id")).isNull();
        assertThat(missingAuthority.get("instance")).isNull();
        assertThat(((Number) missingAuthority.get("usage")).doubleValue()).isEqualTo(12.5D);
    }

    private void assertSemanticType(List<Map<String, Object>> description, String column, String semanticType) {
        String row = description.stream()
                .map(Map::toString)
                .filter(value -> value.toLowerCase(Locale.ROOT).contains(column.toLowerCase(Locale.ROOT)))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing Greptime column " + column + ": " + description));
        assertThat(row.toLowerCase(Locale.ROOT)).contains(semanticType);
    }

    private GreptimeProperties properties() {
        return new GreptimeProperties(
                true,
                GREPTIME.getHost() + ":" + GREPTIME.getMappedPort(GREPTIME_GRPC_PORT),
                "http://" + GREPTIME.getHost() + ":" + GREPTIME.getMappedPort(GREPTIME_HTTP_PORT),
                "public",
                "",
                "",
                null);
    }

    private CollectRep.MetricsData nativeMetrics() {
        List<CollectRep.Field> fields = new ArrayList<>();
        for (String name : List.of(
                "hertzbeat_workspace_id",
                "hertzbeat_entity_id",
                "hertzbeat_entity_type",
                "hertzbeat_monitor_id",
                "hertzbeat_collector_id",
                "instance",
                "ts")) {
            fields.add(field(name, CommonConstants.TYPE_STRING, true));
        }
        fields.add(field("usage", CommonConstants.TYPE_NUMBER, false));
        fields.add(field("device", CommonConstants.TYPE_STRING, true));

        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setApp("linux")
                .setMetrics("native_system_dimensions")
                .setTime(COLLECTION_TIME)
                .setCode(CollectRep.Code.SUCCESS)
                .addMetadata("hertzbeat.workspace.id", "spoof-workspace")
                .addMetadata(MetricDataConstants.ENTITY_ID, "999")
                .addMetadata("hertzbeat.entity.type", "spoof-type")
                .addMetadata(MetricDataConstants.COLLECTOR_ID, "collector-arm-1")
                .addMetadata(MetricDataConstants.INSTANCE, "db.internal:3306");
        builder.addAllFields(fields);
        builder.addValueRow(row("spoof-workspace", "spoof-entity", "spoof-type", "spoof-monitor",
                "spoof-collector", "spoof-instance", "spoof-ts", "85.5", "sda"));
        builder.addValueRow(row("spoof-workspace-2", "spoof-entity-2", "spoof-type-2", "spoof-monitor-2",
                "spoof-collector-2", "spoof-instance-2", "spoof-ts-2", "73.25", "sdb"));
        return builder.build();
    }

    private CollectRep.MetricsData nativeMetricsWithoutOptionalAuthority() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder()
                .setId(43L)
                .setApp("linux")
                .setMetrics("native_system_dimensions")
                .setTime(COLLECTION_TIME + 1)
                .setCode(CollectRep.Code.SUCCESS)
                .addMetadata("hertzbeat.workspace.id", "spoof-unbound-workspace")
                .addMetadata(MetricDataConstants.ENTITY_ID, "1000")
                .addMetadata("hertzbeat.entity.type", "spoof-unbound-type");
        builder.addAllFields(List.of(
                field("usage", CommonConstants.TYPE_NUMBER, false),
                field("device", CommonConstants.TYPE_STRING, true)));
        builder.addValueRow(row("12.5", "sdc"));
        return builder.build();
    }

    private NativeMetricSystemContextResolver authoritativeContextResolver() {
        return (metricsData, intrinsic) -> {
            if (intrinsic == null || !Long.valueOf(42L).equals(intrinsic.monitorId())) {
                return intrinsic;
            }
            return new NativeMetricSystemContext(
                    "team-a",
                    99L,
                    "database",
                    intrinsic.monitorId(),
                    intrinsic.collectorId(),
                    intrinsic.instance());
        };
    }

    private CollectRep.Field field(String name, int type, boolean label) {
        return CollectRep.Field.newBuilder().setName(name).setType(type).setLabel(label).build();
    }

    private CollectRep.ValueRow row(String... columns) {
        return CollectRep.ValueRow.newBuilder().setColumns(List.of(columns)).build();
    }
}
