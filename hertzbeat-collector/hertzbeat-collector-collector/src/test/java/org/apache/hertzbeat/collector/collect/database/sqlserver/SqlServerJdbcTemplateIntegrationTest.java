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

package org.apache.hertzbeat.collector.collect.database.sqlserver;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Duration;
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
 * Integration test for app-sqlserver.yml against all supported SQL Server
 * versions.  Waits for container readiness via JDBC (same mechanism the
 * collector uses) so timing is independent of the machine.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SqlServerJdbcTemplateIntegrationTest {

    private static final String SA_PASSWORD = "HertzBeat!2026";
    private static final String TEST_LOGIN = "test_login";
    private static final String TEST_PASSWORD = "TestLogin!2026";

    private static final List<String> SUPPORTED_VERSIONS = List.of(
            "2017-latest",
            "2019-latest",
            "2022-latest",
            "2025-latest"
    );

    private record VersionedContainer(
            String versionTag, GenericContainer<?> container) {
    }

    private List<VersionedContainer> containers;
    private List<Metrics> templateMetrics;

    @BeforeAll
    void setUp() throws Exception {
        Assumptions.assumeTrue(
                DockerClientFactory.instance().isDockerAvailable(),
                "Docker is required for integration tests");
        new CollectStrategyFactory().run();
        templateMetrics = loadTemplate().getMetrics();

        containers = new ArrayList<>();
        for (String tag : SUPPORTED_VERSIONS) {
            GenericContainer<?> c = startContainer(tag);
            containers.add(new VersionedContainer(tag, c));
        }
    }

    @AfterAll
    void tearDown() {
        if (containers != null) {
            containers.forEach(vc -> vc.container().stop());
        }
    }

    // ── Contract: account_expiry must exist ──

    @Test
    @DisplayName("account_expiry metric group must be defined")
    void accountExpiryShouldBeDefined() {
        assertTrue(templateMetrics.stream()
                .anyMatch(m -> "account_expiry".equals(m.getName())),
                "app-sqlserver.yml must define an account_expiry metric group");
    }

    @Test
    @DisplayName("account_expiry field types must match schema")
    void accountExpiryFieldTypesShouldMatch() {
        Metrics expiry = templateMetrics.stream()
                .filter(m -> "account_expiry".equals(m.getName()))
                .findFirst().orElseThrow();
        for (Metrics.Field f : expiry.getFields()) {
            switch (f.getField()) {
                case "login_name", "password_expired", "is_disabled" ->
                    assertEquals(1, f.getType(),
                            f.getField() + " must be type 1 (string)");
                case "days_left" ->
                    assertEquals(0, f.getType(),
                            "days_left must be type 0 (number)");
                default ->
                    throw new IllegalStateException(
                            "Unexpected field: " + f.getField());
            }
        }
    }

    // ── Every metric group must collect on every version ──

    @TestFactory
    Stream<DynamicContainer> shouldCollectOnAllSupportedVersions() {
        return containers.stream()
                .map(vc -> DynamicContainer.dynamicContainer(vc.versionTag(),
                        templateMetrics.stream()
                                .map(m -> DynamicTest.dynamicTest(m.getName(),
                                        () -> verifyMetric(m, vc)))));
    }

    private void verifyMetric(Metrics tmpl, VersionedContainer vc)
            throws Exception {
        Metrics metric = materialize(tmpl, vc);
        CollectRep.MetricsData data = collect(metric);

        assertEquals(CollectRep.Code.SUCCESS, data.getCode(),
                () -> vc.versionTag() + " " + metric.getName()
                        + " failed: " + data.getMsg());
        assertEquals(metric.getFields().size(), data.getFieldsCount(),
                () -> vc.versionTag() + " " + metric.getName()
                        + " field count mismatch");

        if ("columns".equals(metric.getJdbc().getQueryType())) {
            assertEquals(1, data.getValuesCount(),
                    () -> vc.versionTag() + " " + metric.getName()
                            + " should be single-row");
        }
        if ("basic".equals(metric.getName())) {
            assertTrue(data.getValuesCount() > 0);
            assertNotNull(data.getValues().getFirst().getColumns(0),
                    vc.versionTag() + " basic.version should be non-null");
        }
        if ("account_expiry".equals(metric.getName())) {
            assertTrue(data.getValuesCount() > 0,
                    vc.versionTag()
                            + " account_expiry must return at least one row");
        }
    }

    // ── Edge-case assertions on account_expiry data ──

    @TestFactory
    @DisplayName("account_expiry edge cases across all versions")
    Stream<DynamicTest> accountExpiryEdgeCases() {
        return containers.stream()
                .flatMap(vc -> Stream.of(
                        DynamicTest.dynamicTest(
                                vc.versionTag() + " sa must appear",
                                () -> assertSaLoginAppears(vc)),
                        DynamicTest.dynamicTest(
                                vc.versionTag() + " days_left must be integer",
                                () -> assertDaysLeftIsInteger(vc)),
                        DynamicTest.dynamicTest(
                                vc.versionTag()
                                        + " password_expired must be 0 or 1",
                                () -> assertPasswordExpiredIsBinary(vc)),
                        DynamicTest.dynamicTest(
                                vc.versionTag()
                                        + " is_disabled must be 0 or 1",
                                () -> assertIsDisabledIsBinary(vc))));
    }

    private void assertSaLoginAppears(VersionedContainer vc) throws Exception {
        CollectRep.MetricsData data = collect(expiryMetric(vc));
        boolean found = false;
        for (int i = 0; i < data.getValuesCount(); i++) {
            if ("sa".equalsIgnoreCase(
                    data.getValues().get(i).getColumns(0))) {
                found = true;
                break;
            }
        }
        assertTrue(found,
                vc.versionTag() + " sa login must appear in account_expiry");
    }

    private void assertDaysLeftIsInteger(VersionedContainer vc)
            throws Exception {
        CollectRep.MetricsData data = collect(expiryMetric(vc));
        for (int i = 0; i < data.getValuesCount(); i++) {
            String v = data.getValues().get(i).getColumns(1);
            assertNotNull(v,
                    vc.versionTag() + " days_left must not be null");
            try {
                Integer.parseInt(v);
            } catch (NumberFormatException e) {
                throw new AssertionError(
                        vc.versionTag() + " days_left not an integer: " + v);
            }
        }
    }

    private void assertPasswordExpiredIsBinary(VersionedContainer vc)
            throws Exception {
        CollectRep.MetricsData data = collect(expiryMetric(vc));
        for (int i = 0; i < data.getValuesCount(); i++) {
            String v = data.getValues().get(i).getColumns(2);
            assertNotNull(v,
                    vc.versionTag() + " password_expired must not be null");
            assertTrue("Y".equals(v) || "N".equals(v),
                    vc.versionTag() + " password_expired must be Y/N: " + v);
        }
    }

    private void assertIsDisabledIsBinary(VersionedContainer vc)
            throws Exception {
        CollectRep.MetricsData data = collect(expiryMetric(vc));
        for (int i = 0; i < data.getValuesCount(); i++) {
            String v = data.getValues().get(i).getColumns(3);
            assertNotNull(v,
                    vc.versionTag() + " is_disabled must not be null");
            assertTrue("Y".equals(v) || "N".equals(v),
                    vc.versionTag() + " is_disabled must be Y/N: " + v);
        }
    }

    private Metrics expiryMetric(VersionedContainer vc) {
        return materialize(
                templateMetrics.stream()
                        .filter(m -> "account_expiry".equals(m.getName()))
                        .findFirst().orElseThrow(),
                vc);
    }

    // ── Container lifecycle ──

    private static GenericContainer<?> startContainer(String versionTag)
            throws Exception {
        GenericContainer<?> container = new GenericContainer<>(
                DockerImageName.parse(
                        "mcr.microsoft.com/mssql/server:" + versionTag))
                .withExposedPorts(1433)
                .withEnv("ACCEPT_EULA", "Y")
                .withEnv("MSSQL_SA_PASSWORD", SA_PASSWORD)
                .waitingFor(Wait.forLogMessage(
                        ".*SQL Server is now ready for client connections.*",
                        1));
        container.start();
        awaitJdbc(container, versionTag);

        // Create a test login with CHECK_EXPIRATION=ON
        String jdbcUrl = "jdbc:sqlserver://"
                + container.getHost() + ":"
                + container.getMappedPort(1433)
                + ";encrypt=false;trustServerCertificate=true";
        try (Connection c = DriverManager.getConnection(
                jdbcUrl, "sa", SA_PASSWORD);
                var stmt = c.createStatement()) {
            stmt.execute("CREATE LOGIN [" + TEST_LOGIN
                    + "] WITH PASSWORD = '" + TEST_PASSWORD
                    + "', CHECK_POLICY = ON, CHECK_EXPIRATION = ON");
        }
        return container;
    }

    /**
     * Poll the container via JDBC until a login succeeds.
     * Uses a generous timeout because SQL Server startup time varies
     * significantly across versions and hardware.
     */
    private static void awaitJdbc(GenericContainer<?> container,
            String versionTag) throws Exception {
        String jdbcUrl = "jdbc:sqlserver://"
                + container.getHost() + ":"
                + container.getMappedPort(1433)
                + ";encrypt=false;trustServerCertificate=true;loginTimeout=5";
        long deadline = System.currentTimeMillis()
                + Duration.ofMinutes(3).toMillis();
        while (System.currentTimeMillis() < deadline) {
            try {
                try (Connection c = DriverManager.getConnection(
                        jdbcUrl, "sa", SA_PASSWORD)) {
                    if (c.isValid(3)) {
                        return;
                    }
                }
            } catch (Exception ignored) {
                // SQL Server not accepting logins yet
            }
            Thread.sleep(5000);
        }
        throw new IllegalStateException(
                "Timed out waiting for " + versionTag + " JDBC connectivity");
    }

    // ── Collection helpers (same pattern as Mysql test) ──

    private CollectRep.MetricsData collect(Metrics metric) {
        Job job = Job.builder()
                .monitorId(1L).tenantId(1L).app("sqlserver")
                .defaultInterval(600L)
                .metadata(new HashMap<>(0))
                .labels(new HashMap<>(0))
                .annotations(new HashMap<>(0))
                .configmap(new ArrayList<>(0))
                .metrics(new ArrayList<>(List.of(metric)))
                .build();
        WheelTimerTask timerTask = new WheelTimerTask(job, timeout -> {
        });
        var dispatch = new CapturingCollectDataDispatch();
        var collector = new MetricsCollect(
                metric, new StubTimeout(timerTask), dispatch,
                "collector-test", List.of());
        collector.run();
        assertNotNull(dispatch.metricsData,
                metric.getName() + " should dispatch metrics data");
        return dispatch.metricsData;
    }

    private Metrics materialize(Metrics templateMetric,
            VersionedContainer vc) {
        Metrics m = JsonUtil.fromJson(
                JsonUtil.toJson(templateMetric), Metrics.class);
        JdbcProtocol jdbc = m.getJdbc();
        jdbc.setHost(vc.container().getHost());
        jdbc.setPort(
                String.valueOf(vc.container().getMappedPort(1433)));
        jdbc.setUsername("sa");
        jdbc.setPassword(SA_PASSWORD);
        jdbc.setTimeout(
                String.valueOf(Duration.ofSeconds(15).toMillis()));
        jdbc.setReuseConnection("false");
        jdbc.setUrl(null);
        jdbc.setSshTunnel(null);
        if (jdbc.getDatabase() == null
                || jdbc.getDatabase().contains("^_^")) {
            jdbc.setDatabase("master");
        }
        if (m.getAliasFields() == null
                || m.getAliasFields().isEmpty()) {
            m.setAliasFields(
                    m.getFields().stream()
                            .map(Metrics.Field::getField)
                            .collect(Collectors.toList()));
        }
        return m;
    }

    private Job loadTemplate() throws Exception {
        Path path = Path.of(
                        "..", "..", "hertzbeat-manager", "src", "main",
                        "resources", "define", "app-sqlserver.yml")
                .toAbsolutePath().normalize();
        try (Reader r = Files.newBufferedReader(path)) {
            return new Yaml().loadAs(r, Job.class);
        }
    }

    // ── inner types ──

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
