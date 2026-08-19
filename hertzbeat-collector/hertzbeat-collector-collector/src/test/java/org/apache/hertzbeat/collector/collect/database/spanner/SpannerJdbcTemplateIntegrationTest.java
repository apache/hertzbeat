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

package org.apache.hertzbeat.collector.collect.database.spanner;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.cloud.spanner.Dialect;
import com.google.cloud.spanner.InstanceConfigId;
import com.google.cloud.spanner.InstanceId;
import com.google.cloud.spanner.InstanceInfo;
import com.google.cloud.spanner.Spanner;
import com.google.cloud.spanner.SpannerOptions;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.collector.dispatch.CollectDataDispatch;
import org.apache.hertzbeat.collector.dispatch.MetricsCollect;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.DynamicContainer;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import org.yaml.snakeyaml.Yaml;

/**
 * Integration test for app-cloudspanner.yml (Google Standard SQL dialect) and
 * app-cloudspanner-pg.yml (PostgreSQL dialect) against the official Cloud Spanner
 * emulator.  A single emulator container hosts both databases; the GSS database
 * is created via autoConfigEmulator and the PG database via the Spanner Java client.
 * SPANNER_SYS statistics tables are not supported by the emulator and are therefore
 * not covered here.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SpannerJdbcTemplateIntegrationTest {

    private static final String EMULATOR_IMAGE =
            "gcr.io/cloud-spanner-emulator/emulator:1.5.53";
    private static final int GRPC_PORT = 9010;

    private static final String PROJECT   = "test-project";
    private static final String INSTANCE  = "test-instance";
    private static final String DATABASE  = "test-db";
    private static final String PG_DATABASE = "pg-test-db";

    // SPANNER_SYS statistics views are not available in the emulator
    private static final java.util.Set<String> EMULATOR_UNSUPPORTED_GROUPS =
            java.util.Set.of("query_stats", "txn_stats", "lock_stats", "table_sizes");

    private GenericContainer<?> emulator;
    private String jdbcUrl;
    private String pgJdbcUrl;
    private List<Metrics> templateMetrics;
    private List<Metrics> pgTemplateMetrics;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(
                DockerClientFactory.instance().isDockerAvailable(),
                "Docker/Podman is required for integration tests");

        new CollectStrategyFactory().run();
        templateMetrics = loadTemplate().getMetrics();
        pgTemplateMetrics = loadPgTemplate().getMetrics();

        emulator = new GenericContainer<>(DockerImageName.parse(EMULATOR_IMAGE))
                .withExposedPorts(GRPC_PORT)
                .waitingFor(Wait.forListeningPort());
        emulator.start();

        provisionEmulator();

        jdbcUrl = String.format(
                "jdbc:cloudspanner://%s:%d/projects/%s/instances/%s/databases/%s"
                        + ";usePlainText=true;autoConfigEmulator=true",
                emulator.getHost(),
                emulator.getMappedPort(GRPC_PORT),
                PROJECT, INSTANCE, DATABASE);
        createSchema();
        seedData();

        pgJdbcUrl = String.format(
                "jdbc:cloudspanner://%s:%d/projects/%s/instances/%s/databases/%s"
                        + ";usePlainText=true;autoConfigEmulator=true",
                emulator.getHost(),
                emulator.getMappedPort(GRPC_PORT),
                PROJECT, INSTANCE, PG_DATABASE);
        createPgSchema();
        seedPgData();
    }

    @AfterAll
    void tearDown() {
        if (emulator != null) {
            emulator.stop();
        }
    }

    // ── Contract: metric groups must exist ──

    @Test
    @DisplayName("tables metric group must be defined")
    void tablesShouldBeDefined() {
        assertTrue(templateMetrics.stream()
                .anyMatch(m -> "tables".equals(m.getName())),
                "app-cloudspanner.yml must define a tables metric group");
    }

    @Test
    @DisplayName("indexes metric group must be defined")
    void indexesShouldBeDefined() {
        assertTrue(templateMetrics.stream()
                .anyMatch(m -> "indexes".equals(m.getName())),
                "app-cloudspanner.yml must define an indexes metric group");
    }

    @Test
    @DisplayName("database_options metric group must be defined")
    void databaseOptionsShouldBeDefined() {
        assertTrue(templateMetrics.stream()
                .anyMatch(m -> "database_options".equals(m.getName())),
                "app-cloudspanner.yml must define a database_options metric group");
    }

    // ── Field type contracts ──

    @Test
    @DisplayName("tables fields must all be type string")
    void tablesFieldTypesShouldBeStrings() {
        Metrics m = findMetric("tables");
        for (Metrics.Field f : m.getFields()) {
            assertEquals(1, f.getType(),
                    "tables." + f.getField() + " must be type 1 (string)");
        }
    }

    @Test
    @DisplayName("indexes fields must all be type string")
    void indexesFieldTypesShouldBeStrings() {
        Metrics m = findMetric("indexes");
        for (Metrics.Field f : m.getFields()) {
            assertEquals(1, f.getType(),
                    "indexes." + f.getField() + " must be type 1 (string)");
        }
    }

    @Test
    @DisplayName("database_options fields must all be type string")
    void databaseOptionsFieldTypesShouldBeStrings() {
        Metrics m = findMetric("database_options");
        for (Metrics.Field f : m.getFields()) {
            assertEquals(1, f.getType(),
                    "database_options." + f.getField() + " must be type 1 (string)");
        }
    }

    // ── Every metric group must collect successfully ──

    @TestFactory
    @DisplayName("all metric groups must collect successfully against the emulator")
    Stream<DynamicContainer> shouldCollectAllMetricGroups() {
        return templateMetrics.stream()
                .filter(tmpl -> !EMULATOR_UNSUPPORTED_GROUPS.contains(tmpl.getName()))
                .map(tmpl -> DynamicContainer.dynamicContainer(
                        tmpl.getName(),
                        Stream.of(
                                DynamicTest.dynamicTest("collects without error",
                                        () -> {
                                            CollectRep.MetricsData data =
                                                    collect(materialize(tmpl));
                                            assertEquals(
                                                    CollectRep.Code.SUCCESS,
                                                    data.getCode(),
                                                    tmpl.getName() + " failed: "
                                                            + data.getMsg());
                                            assertEquals(
                                                    tmpl.getFields().size(),
                                                    data.getFieldsCount(),
                                                    tmpl.getName()
                                                            + " field count mismatch");
                                        }))));
    }

    // ── tables-specific assertions ──

    @TestFactory
    @DisplayName("tables metric group edge cases")
    Stream<DynamicTest> tablesEdgeCases() {
        return Stream.of(
                DynamicTest.dynamicTest(
                        "returns at least one row",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("tables")));
                            assertTrue(data.getValuesCount() > 0,
                                    "tables must return at least one row");
                        }),
                DynamicTest.dynamicTest(
                        "test_table must appear",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("tables")));
                            boolean found = false;
                            for (int i = 0; i < data.getValuesCount(); i++) {
                                if ("test_table".equalsIgnoreCase(
                                        data.getValues().get(i).getColumns(0))) {
                                    found = true;
                                    break;
                                }
                            }
                            assertTrue(found,
                                    "tables must include test_table");
                        }),
                DynamicTest.dynamicTest(
                        "spanner_state must be COMMITTED for all rows",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("tables")));
                            for (int i = 0; i < data.getValuesCount(); i++) {
                                assertEquals("COMMITTED",
                                        data.getValues().get(i).getColumns(2),
                                        "spanner_state must be COMMITTED");
                            }
                        }));
    }

    // ── indexes-specific assertions ──

    @TestFactory
    @DisplayName("indexes metric group edge cases")
    Stream<DynamicTest> indexesEdgeCases() {
        return Stream.of(
                DynamicTest.dynamicTest(
                        "returns at least one row",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("indexes")));
                            assertTrue(data.getValuesCount() > 0,
                                    "indexes must return at least one row");
                        }),
                DynamicTest.dynamicTest(
                        "secondary index idx_test_name must appear",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("indexes")));
                            boolean found = false;
                            for (int i = 0; i < data.getValuesCount(); i++) {
                                if ("idx_test_name".equalsIgnoreCase(
                                        data.getValues().get(i).getColumns(1))) {
                                    found = true;
                                    break;
                                }
                            }
                            assertTrue(found,
                                    "indexes must include idx_test_name");
                        }),
                DynamicTest.dynamicTest(
                        "is_unique must be Y or N for all rows",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("indexes")));
                            for (int i = 0; i < data.getValuesCount(); i++) {
                                String v = data.getValues().get(i).getColumns(4);
                                assertTrue("Y".equals(v) || "N".equals(v),
                                        "is_unique must be Y/N, got: " + v);
                            }
                        }),
                DynamicTest.dynamicTest(
                        "is_null_filtered must be Y or N for all rows",
                        () -> {
                            CollectRep.MetricsData data =
                                    collect(materialize(findMetric("indexes")));
                            for (int i = 0; i < data.getValuesCount(); i++) {
                                String v = data.getValues().get(i).getColumns(5);
                                assertTrue("Y".equals(v) || "N".equals(v),
                                        "is_null_filtered must be Y/N, got: " + v);
                            }
                        }));
    }

    // ── database_options-specific assertions ──

    @Test
    @DisplayName("database_options must return at least one row")
    void databaseOptionsShouldReturnRows() throws Exception {
        CollectRep.MetricsData data =
                collect(materialize(findMetric("database_options")));
        assertTrue(data.getValuesCount() > 0,
                "database_options must return at least one row");
    }

    @Test
    @DisplayName("database_dialect option must be GOOGLE_STANDARD_SQL")
    void databaseDialectShouldBeGoogleSql() throws Exception {
        CollectRep.MetricsData data =
                collect(materialize(findMetric("database_options")));
        boolean found = false;
        for (int i = 0; i < data.getValuesCount(); i++) {
            if ("database_dialect".equalsIgnoreCase(
                    data.getValues().get(i).getColumns(0))) {
                assertEquals("GOOGLE_STANDARD_SQL",
                        data.getValues().get(i).getColumns(1),
                        "database_dialect must be GOOGLE_STANDARD_SQL");
                found = true;
                break;
            }
        }
        assertTrue(found, "database_options must include database_dialect");
    }

    private void createSchema() throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             Statement stmt = conn.createStatement()) {
            stmt.execute("""
                    CREATE TABLE test_table (
                        id    INT64  NOT NULL,
                        name  STRING(100) NOT NULL,
                        value FLOAT64
                    ) PRIMARY KEY (id)""");
            stmt.execute(
                    "CREATE INDEX idx_test_name ON test_table (name)");
        }
    }

    private void seedData() throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             var ps = conn.prepareStatement(
                     "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)")) {
            ps.setLong(1, 1);
            ps.setString(2, "alpha");
            ps.setDouble(3, 1.0);
            ps.executeUpdate();
            ps.setLong(1, 2);
            ps.setString(2, "beta");
            ps.setDouble(3, 2.0);
            ps.executeUpdate();
            ps.setLong(1, 3);
            ps.setString(2, "gamma");
            ps.setDouble(3, 3.0);
            ps.executeUpdate();
        }
    }

    // ── Collection helpers ──

    private CollectRep.MetricsData collect(Metrics metric) {
        Job job = Job.builder()
                .monitorId(1L).tenantId(1L).app("cloudspanner")
                .defaultInterval(600L)
                .metadata(new HashMap<>(0))
                .labels(new HashMap<>(0))
                .annotations(new HashMap<>(0))
                .configmap(new ArrayList<>(0))
                .metrics(new ArrayList<>(List.of(metric)))
                .build();
        WheelTimerTask timerTask = new WheelTimerTask(job, timeout -> { });
        var dispatch = new CapturingCollectDataDispatch();
        var collector = new MetricsCollect(
                metric, new StubTimeout(timerTask), dispatch,
                "collector-test", List.of());
        collector.run();
        assertNotNull(dispatch.metricsData,
                metric.getName() + " should dispatch metrics data");
        return dispatch.metricsData;
    }

    private Metrics materialize(Metrics templateMetric) {
        Metrics m = JsonUtil.fromJson(
                JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbc = m.getJdbc();
        jdbc.setUrl(jdbcUrl);
        jdbc.setTimeout("30000");
        jdbc.setReuseConnection("false");
        if (m.getAliasFields() == null || m.getAliasFields().isEmpty()) {
            m.setAliasFields(
                    m.getFields().stream()
                            .map(Metrics.Field::getField)
                            .collect(Collectors.toList()));
        }
        return m;
    }

    private Metrics findMetric(String name) {
        return templateMetrics.stream()
                .filter(m -> name.equals(m.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Metric group not found: " + name));
    }

    private Job loadTemplate() throws Exception {
        Path path = Path.of(
                        "..", "..", "hertzbeat-manager", "src", "main",
                        "resources", "define", "app-cloudspanner.yml")
                .toAbsolutePath().normalize();
        try (Reader r = Files.newBufferedReader(path)) {
            return new Yaml().loadAs(r, Job.class);
        }
    }

    // ── Emulator provisioning ──

    private void provisionEmulator() throws Exception {
        SpannerOptions opts = SpannerOptions.newBuilder()
                .setEmulatorHost(emulator.getHost() + ":"
                        + emulator.getMappedPort(GRPC_PORT))
                .setProjectId(PROJECT)
                .build();
        try (Spanner spanner = opts.getService()) {
            spanner.getInstanceAdminClient()
                    .createInstance(InstanceInfo
                            .newBuilder(InstanceId.of(PROJECT, INSTANCE))
                            .setDisplayName(INSTANCE)
                            .setInstanceConfigId(
                                    InstanceConfigId.of(PROJECT, "emulator-config"))
                            .setNodeCount(1)
                            .build())
                    .get();
            var dbAdmin = spanner.getDatabaseAdminClient();
            dbAdmin.createDatabase(INSTANCE, DATABASE, List.of()).get();
            dbAdmin.createDatabase(INSTANCE,
                    "CREATE DATABASE \"" + PG_DATABASE + "\"",
                    Dialect.POSTGRESQL, List.of()).get();
        }
    }

    private void createPgSchema() throws Exception {
        try (Connection conn = DriverManager.getConnection(pgJdbcUrl);
                Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE test_table ("
                    + "id bigint PRIMARY KEY,"
                    + " name varchar(100) NOT NULL,"
                    + " value float8"
                    + ")");
            stmt.execute("CREATE INDEX idx_test_name ON test_table (name)");
        }
    }

    private void seedPgData() throws Exception {
        try (Connection conn = DriverManager.getConnection(pgJdbcUrl);
                var ps = conn.prepareStatement(
                        "INSERT INTO test_table (id, name, value)"
                                + " VALUES (?, ?, ?)")) {
            ps.setLong(1, 1);
            ps.setString(2, "alpha");
            ps.setDouble(3, 1.0);
            ps.executeUpdate();
            ps.setLong(1, 2);
            ps.setString(2, "beta");
            ps.setDouble(3, 2.0);
            ps.executeUpdate();
            ps.setLong(1, 3);
            ps.setString(2, "gamma");
            ps.setDouble(3, 3.0);
            ps.executeUpdate();
        }
    }

    private Job loadPgTemplate() throws Exception {
        Path path = Path.of(
                        "..", "..", "hertzbeat-manager", "src", "main",
                        "resources", "define", "app-cloudspanner-pg.yml")
                .toAbsolutePath().normalize();
        try (Reader r = Files.newBufferedReader(path)) {
            return new Yaml().loadAs(r, Job.class);
        }
    }

    private Metrics materializePg(Metrics templateMetric) {
        Metrics m = JsonUtil.fromJson(
                JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbc = m.getJdbc();
        jdbc.setUrl(pgJdbcUrl);
        jdbc.setTimeout("30000");
        jdbc.setReuseConnection("false");
        if (m.getAliasFields() == null || m.getAliasFields().isEmpty()) {
            m.setAliasFields(
                    m.getFields().stream()
                            .map(Metrics.Field::getField)
                            .collect(Collectors.toList()));
        }
        return m;
    }

    private Metrics findPgMetric(String name) {
        return pgTemplateMetrics.stream()
                .filter(m -> name.equals(m.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "PG metric group not found: " + name));
    }

    // ── PG dialect contract tests ──

    @Test
    @DisplayName("PG tables metric group must be defined")
    void pgTablesShouldBeDefined() {
        assertTrue(pgTemplateMetrics.stream()
                .anyMatch(m -> "tables".equals(m.getName())),
                "app-cloudspanner-pg.yml must define a tables metric group");
    }

    @Test
    @DisplayName("PG indexes metric group must be defined")
    void pgIndexesShouldBeDefined() {
        assertTrue(pgTemplateMetrics.stream()
                .anyMatch(m -> "indexes".equals(m.getName())),
                "app-cloudspanner-pg.yml must define an indexes metric group");
    }

    @Test
    @DisplayName("PG database_options metric group must be defined")
    void pgDatabaseOptionsShouldBeDefined() {
        assertTrue(pgTemplateMetrics.stream()
                .anyMatch(m -> "database_options".equals(m.getName())),
                "app-cloudspanner-pg.yml must define a database_options metric group");
    }

    // ── PG dialect collection tests ──

    @TestFactory
    @DisplayName("all PG metric groups must collect successfully against the emulator")
    Stream<DynamicContainer> shouldCollectAllPgMetricGroups() {
        return pgTemplateMetrics.stream()
                .filter(tmpl -> !EMULATOR_UNSUPPORTED_GROUPS.contains(tmpl.getName()))
                .map(tmpl -> DynamicContainer.dynamicContainer(
                        "pg-" + tmpl.getName(),
                        Stream.of(DynamicTest.dynamicTest(
                                "collects without error",
                                () -> {
                                    CollectRep.MetricsData data =
                                            collect(materializePg(tmpl));
                                    assertEquals(
                                            CollectRep.Code.SUCCESS,
                                            data.getCode(),
                                            tmpl.getName() + " failed: "
                                                    + data.getMsg());
                                    assertEquals(
                                            tmpl.getFields().size(),
                                            data.getFieldsCount(),
                                            tmpl.getName()
                                                    + " field count mismatch");
                                }))));
    }

    @Test
    @DisplayName("PG database_dialect option must be POSTGRESQL")
    void pgDatabaseDialectShouldBePostgresql() throws Exception {
        CollectRep.MetricsData data =
                collect(materializePg(findPgMetric("database_options")));
        boolean found = false;
        for (int i = 0; i < data.getValuesCount(); i++) {
            if ("database_dialect".equalsIgnoreCase(
                    data.getValues().get(i).getColumns(0))) {
                assertEquals("POSTGRESQL",
                        data.getValues().get(i).getColumns(1),
                        "database_dialect must be POSTGRESQL");
                found = true;
                break;
            }
        }
        assertTrue(found,
                "database_options must include database_dialect");
    }

    @Test
    @DisplayName("PG test_table must appear in tables metric group")
    void pgTestTableShouldAppear() throws Exception {
        CollectRep.MetricsData data =
                collect(materializePg(findPgMetric("tables")));
        assertTrue(data.getValuesCount() > 0,
                "PG tables must return at least one row");
        boolean found = false;
        for (int i = 0; i < data.getValuesCount(); i++) {
            if ("test_table".equalsIgnoreCase(
                    data.getValues().get(i).getColumns(0))) {
                found = true;
                break;
            }
        }
        assertTrue(found, "PG tables must include test_table");
    }

    @Test
    @DisplayName("PG idx_test_name must appear in indexes metric group")
    void pgIndexShouldAppear() throws Exception {
        CollectRep.MetricsData data =
                collect(materializePg(findPgMetric("indexes")));
        assertTrue(data.getValuesCount() > 0,
                "PG indexes must return at least one row");
        boolean found = false;
        for (int i = 0; i < data.getValuesCount(); i++) {
            if ("idx_test_name".equalsIgnoreCase(
                    data.getValues().get(i).getColumns(1))) {
                found = true;
                break;
            }
        }
        assertTrue(found, "PG indexes must include idx_test_name");
    }

    // ── Inner types ──

    private static final class CapturingCollectDataDispatch
            implements CollectDataDispatch {
        private CollectRep.MetricsData metricsData;

        @Override
        public void dispatchCollectData(Timeout timeout, Metrics metrics,
                CollectRep.MetricsData data) {
            this.metricsData = data;
        }

        @Override
        public void dispatchCollectData(Timeout timeout, Metrics metrics,
                List<CollectRep.MetricsData> list) {
            if (list != null && !list.isEmpty()) {
                this.metricsData = list.getFirst();
            }
        }
    }

    private record StubTimeout(WheelTimerTask wheelTimerTask) implements Timeout {
        @Override
        public org.apache.hertzbeat.common.timer.Timer timer() {
            return null;
        }

        @Override
        public org.apache.hertzbeat.common.timer.TimerTask task() {
            return wheelTimerTask;
        }

        @Override
        public boolean isExpired() {
            return false;
        }

        @Override
        public boolean isCancelled() {
            return false;
        }

        @Override
        public boolean cancel() {
            return false;
        }
    }
}
