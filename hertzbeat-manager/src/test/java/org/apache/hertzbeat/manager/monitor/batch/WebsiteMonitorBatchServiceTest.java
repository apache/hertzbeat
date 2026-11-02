/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.batch;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import javax.sql.DataSource;

/**
 * Isolated H2 claims with a controlled native-domain boundary; no existing app database or external
 * site is used.
 */
@SpringJUnitConfig(WebsiteMonitorBatchServiceTest.Config.class)
@Timeout(30)
class WebsiteMonitorBatchServiceTest {
    private static final WebsiteMonitorBatch.Caller USER =
            new WebsiteMonitorBatch.Caller("test-owner", "test-workspace", List.of("user"));
    @Autowired private WebsiteMonitorBatchItemDao rows;
    @Autowired private MonitorService monitors;
    @Autowired private org.apache.hertzbeat.manager.dao.ParamDao candidateParams;
    @Autowired private jakarta.persistence.EntityManagerFactory entityFactory;
    private WebsiteMonitorBatchService service;
    private final Map<Long, MonitorDto> stored = new ConcurrentHashMap<>();
    private final AtomicInteger effects = new AtomicInteger();
    private final AtomicInteger probes = new AtomicInteger();
    private final AtomicInteger validations = new AtomicInteger();

    @BeforeEach
    void setup() {
        rows.deleteAll();
        reset(monitors);
        stored.clear();
        effects.set(0);
        probes.set(0);
        validations.set(0);
        service = new WebsiteMonitorBatchService(rows, monitors);
        doAnswer(
                        inv -> {
                            validations.incrementAndGet();
                            MonitorDto draft = inv.getArgument(0);
                            for (Param param : draft.getParams()) {
                                assertEquals(
                                        "port".equals(param.getField())
                                                        || "timeout".equals(param.getField())
                                                ? 0
                                                : 1,
                                        param.getType());
                            }
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        doAnswer(
                        inv -> {
                            probes.incrementAndGet();
                            return null;
                        })
                .when(monitors)
                .detectMonitor(any(), any(), isNull());
        doAnswer(
                        inv -> {
                            Monitor monitor = inv.getArgument(0);
                            monitor.setId(9007199254740992L + effects.incrementAndGet());
                            monitor.setStatus(
                                    org.apache.hertzbeat.common.constants.CommonConstants
                                            .MONITOR_PENDING_CODE);
                            MonitorDto dto = new MonitorDto();
                            dto.setMonitor(monitor);
                            dto.setParams(inv.getArgument(1), false);
                            stored.put(monitor.getId(), dto);
                            return null;
                        })
                .when(monitors)
                .addMonitor(any(), any(), isNull(), isNull());
        when(monitors.getMonitorDto(anyLong()))
                .thenAnswer(inv -> stored.get(inv.<Long>getArgument(0)));
    }

    @Test
    void candidateHostIndexUsesActualMappedWebsiteParamsWithoutLeakingOtherFields() {
        var entity = entityFactory.createEntityManager();
        try {
            entity.getTransaction().begin();
            entity.persist(
                    Monitor.builder()
                            .id(71L)
                            .name("candidate-index-website")
                            .app("website")
                            .intervals(600)
                            .build());
            entity.persist(
                    Monitor.builder()
                            .id(72L)
                            .name("candidate-index-other")
                            .app("mysql")
                            .intervals(600)
                            .build());
            entity.persist(
                    Param.builder().monitorId(71L).field("host").paramValue("Apache.org").build());
            entity.persist(
                    Param.builder().monitorId(72L).field("host").paramValue("mozilla.org").build());
            entity.persist(
                    Param.builder()
                            .monitorId(71L)
                            .field("password")
                            .paramValue("not-a-host-secret")
                            .build());
            entity.getTransaction().commit();
            assertEquals(
                    List.of("apache.org"),
                    candidateParams.findExistingWebsiteHosts(
                            List.of("apache.org", "mozilla.org", "not-a-host-secret")));
            var projection = candidateParams.findWebsiteHostProjection(List.of(71L, 72L));
            assertEquals(1, projection.size());
            assertEquals(2, projection.getFirst().length);
            assertEquals(71L, projection.getFirst()[0]);
            assertEquals("Apache.org", projection.getFirst()[1]);
            assertTrue(candidateParams.findWebsiteHostProjection(List.of(72L)).isEmpty());
        } finally {
            entity.close();
        }
    }

    @Test
    void candidatePlanningCannotExecuteAnyNetworkBeforeApproval() {
        var params = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        try (var candidateService = new WebsiteMonitorBatchService(rows, monitors, params, 2)) {
            var result = candidateService.preflight(USER, publicCandidates(2), 1000, () -> true);
            org.mockito.Mockito.verify(monitors, org.mockito.Mockito.never())
                    .detectMonitor(any(), any(), any());
            assertEquals(false, result.get("creationProof"));
            assertEquals(false, result.get("networkProbePerformed"));
            for (var candidate : (List<Map<String, Object>>) result.get("items")) {
                assertEquals("NOT_CHECKED", candidate.get("state"));
                assertEquals("APPROVAL_REQUIRED_NATIVE_PROBE", candidate.get("reason"));
            }
            assertEquals(0, probes.get());
            assertEquals(0, effects.get());
            assertEquals(0, rows.count());
        }
    }

    @Test
    void candidatePlanningOnlyChecksExistingHostsAndFinalNativeFailureStaysFailure() {
        var params = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        when(params.findExistingWebsiteHosts(any()))
                .thenReturn(
                        List.of("site0.org", "site1.org", "site2.org", "site3.org", "site4.org"));
        var request = publicCandidates(50);
        try (var candidateService = new WebsiteMonitorBatchService(rows, monitors, params, 10)) {
            var result = candidateService.preflight(USER, request, 2000, () -> true);
            var results = (List<Map<String, Object>>) result.get("items");
            assertEquals(
                    45,
                    results.stream()
                            .filter(
                                    item ->
                                            "APPROVAL_REQUIRED_NATIVE_PROBE"
                                                    .equals(item.get("reason")))
                            .count());
            assertEquals(
                    5,
                    results.stream().filter(item -> "EXISTING".equals(item.get("state"))).count());
            assertEquals(
                    0,
                    results.stream().filter(item -> "AVAILABLE".equals(item.get("state"))).count());
            assertEquals(0, probes.get());
            assertEquals(false, result.get("creationProof"));
            assertEquals(false, result.get("networkProbePerformed"));
            assertEquals(0, effects.get());
            assertEquals(0, rows.count());
            doAnswer(
                            invocation -> {
                                throw new IllegalArgumentException("Invalid native configuration");
                            })
                    .when(monitors)
                    .validate(any(), anyBoolean());
            var finalCheck =
                    candidateService.create(
                            USER,
                            new WebsiteMonitorBatch.Request(
                                    List.of(request.items().get(7)), false));
            assertEquals(1, finalCheck.failed());
            assertEquals("NATIVE_VALIDATION_FAILED", finalCheck.items().getFirst().reason());
            assertEquals(0, effects.get());
        }
    }

    @Test
    void hostCreatedWhileApprovalWaitsIsNotDuplicatedByFinalNativeBatch() {
        var params = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        try (var candidateService = new WebsiteMonitorBatchService(rows, monitors, params, 10)) {
            var request =
                    new WebsiteMonitorBatch.Request(
                            List.of(publicCandidates(2).items().getFirst()), false);
            var sample = candidateService.preflight(USER, request, 1000, () -> true);
            assertEquals(
                    "NOT_CHECKED",
                    ((List<Map<String, Object>>) sample.get("items")).getFirst().get("state"));
            when(params.findExistingWebsiteHosts(any())).thenReturn(List.of("site0.org"));
            var created = candidateService.createUniqueHosts(USER, request, () -> true);
            assertEquals(1, created.failed());
            assertEquals("WEBSITE_ALREADY_MONITORED", created.items().getFirst().reason());
            assertEquals(0, effects.get());
            assertEquals(0, probes.get());
        }
    }

    @Test
    void candidateDeadlineCancellationPermissionsAndNonPublicTargetsNeverWrite() {
        var params = mock(org.apache.hertzbeat.manager.dao.ParamDao.class);
        try (var candidateService = new WebsiteMonitorBatchService(rows, monitors, params, 10)) {
            var cancelled =
                    candidateService.preflight(USER, publicCandidates(50), 1000, () -> false);
            assertEquals(0, probes.get());
            assertTrue(
                    ((List<Map<String, Object>>) cancelled.get("items"))
                            .stream().allMatch(item -> "NOT_CHECKED".equals(item.get("state"))));
            when(params.findExistingWebsiteHosts(any()))
                    .thenAnswer(
                            invocation -> {
                                Thread.sleep(60);
                                return List.of();
                            });
            var timed = candidateService.preflight(USER, publicCandidates(50), 40, () -> true);
            assertTrue(
                    ((List<Map<String, Object>>) timed.get("items"))
                            .stream().noneMatch(item -> "AVAILABLE".equals(item.get("state"))));
            assertThrows(
                    SecurityException.class,
                    () ->
                            candidateService.preflight(
                                    new WebsiteMonitorBatch.Caller("user", "scope", List.of()),
                                    publicCandidates(2),
                                    1000,
                                    () -> true));
            assertThrows(
                    IllegalArgumentException.class,
                    () -> candidateService.preflight(USER, request(item("a")), 1000, () -> true));
            assertEquals(0, effects.get());
            assertEquals(0, rows.count());
        }
    }

    private WebsiteMonitorBatch.Request publicCandidates(int count) {
        return new WebsiteMonitorBatch.Request(
                java.util.stream.IntStream.range(0, count)
                        .mapToObj(
                                index ->
                                        new WebsiteMonitorBatch.Item(
                                                "candidate-" + index,
                                                "candidate-" + index,
                                                "https://site" + index + ".org/",
                                                600,
                                                3000))
                        .toList(),
                false);
    }

    @Test
    void nativeCreationDoesNotRequireSuccessfulAvailabilityDetection() {
        doAnswer(
                        invocation -> {
                            throw new IllegalArgumentException("StatusCode 403");
                        })
                .when(monitors)
                .detectMonitor(any(), any(), isNull());
        var result = service.create(USER, request(item("a"), item("b")));
        assertEquals(2, result.verified());
        assertEquals(0, result.failed());
        assertEquals(0, result.unknown());
        assertEquals(2, effects.get());
        assertTrue(
                stored.values().stream()
                        .allMatch(
                                dto ->
                                        Byte.valueOf(
                                                        org.apache.hertzbeat.common.constants
                                                                .CommonConstants
                                                                .MONITOR_PENDING_CODE)
                                                .equals(dto.getMonitor().getStatus())));
        org.mockito.Mockito.verify(monitors, org.mockito.Mockito.never())
                .detectMonitor(any(), any(), any());
        assertEquals(2, service.status(USER, request(item("a"), item("b"))).verified());
    }

    @Test
    void durableReplayAcrossServiceInstancesDoesNotProbeOrWriteAgain() {
        var request = request(item("a"), item("b"));
        var first = service.create(USER, request);
        assertEquals(2, first.verified());
        assertEquals(
                "ai-e2e-a",
                stored.get(Long.valueOf(first.items().getFirst().monitorId()))
                        .getMonitor()
                        .getName());
        assertEquals(
                2,
                first.items().stream()
                        .map(WebsiteMonitorBatch.Receipt::monitorId)
                        .distinct()
                        .count());
        var restarted = new WebsiteMonitorBatchService(rows, monitors);
        var replayed = restarted.create(USER, request);
        assertEquals(
                first.items().stream().map(WebsiteMonitorBatch.Receipt::monitorId).toList(),
                replayed.items().stream().map(WebsiteMonitorBatch.Receipt::monitorId).toList());
        assertTrue(
                replayed.items().stream()
                        .allMatch(
                                item ->
                                        "VERIFIED".equals(item.state())
                                                && "NATIVE_IDEMPOTENT_REPLAY"
                                                        .equals(item.reason())));
        assertEquals(2, effects.get());
        assertEquals(0, probes.get());
        assertEquals(2, validations.get());
        assertEquals(2, rows.count());
    }

    @Test
    void validationFailuresStayFailuresAndLegacyProbeRetryOnlyCreatesUnwrittenItem() {
        doAnswer(
                        invocation -> {
                            if ("ai-e2e-b"
                                    .equals(
                                            invocation
                                                    .<MonitorDto>getArgument(0)
                                                    .getMonitor()
                                                    .getName()))
                                throw new IllegalArgumentException("Invalid native configuration");
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        var request = request(item("a"), item("b"), item("c"));
        var first = service.create(USER, request);
        assertEquals(2, first.verified());
        assertEquals(1, first.failed());
        assertEquals("NATIVE_VALIDATION_FAILED", first.items().get(1).reason());
        assertEquals(2, effects.get());
        assertEquals(0, probes.get());
        // Historical health-gated claims remain terminal unless explicitly retried.
        var legacy =
                rows.findAll().stream()
                        .filter(row -> "INVALID".equals(row.getState()))
                        .findFirst()
                        .orElseThrow();
        legacy.setState("PROBE_FAILED");
        legacy.setReason("HTTP_403");
        rows.saveAndFlush(legacy);
        assertEquals(2, service.create(USER, request).verified());
        assertEquals(2, effects.get());
        assertEquals("HTTP_403", service.status(USER, request).items().get(1).reason());
        doAnswer(invocation -> null).when(monitors).validate(any(), anyBoolean());
        var resumed = service.create(USER, new WebsiteMonitorBatch.Request(request.items(), true));
        assertEquals(3, resumed.verified());
        assertEquals(3, effects.get());
        assertEquals(0, probes.get());
        assertEquals(first.items().get(0).monitorId(), resumed.items().get(0).monitorId());
        assertEquals(first.items().get(2).monitorId(), resumed.items().get(2).monitorId());
    }

    @Test
    void changedArgumentsBoundToExistingKeyAreRejectedBeforeNewWrites() {
        service.create(USER, request(item("a")));
        var changed =
                new WebsiteMonitorBatch.Item("a", "ai-e2e-a", "https://other.example/", 600, 10000);
        assertThrows(
                IllegalArgumentException.class,
                () -> service.create(USER, request(item("c"), changed)));
        assertEquals(1, effects.get());
    }

    @Test
    void rejectsOversizedDuplicateSecretAndUnauthorizedRequestsWithoutEffects() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.create(
                                USER,
                                new WebsiteMonitorBatch.Request(
                                        java.util.stream.IntStream.range(0, 51)
                                                .mapToObj(i -> item("s" + i))
                                                .toList(),
                                        false)));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.create(USER, request(item("a"), item("a"))));
        var duplicate =
                new WebsiteMonitorBatch.Item("other", "ai-e2e-other", item("a").url(), 600, 5000);
        assertThrows(
                IllegalArgumentException.class,
                () -> service.create(USER, request(item("a"), duplicate)));
        var secret =
                new WebsiteMonitorBatch.Item(
                        "secret",
                        "ai-e2e-secret",
                        "https://user:password@example.test/",
                        600,
                        10000);
        assertThrows(IllegalArgumentException.class, () -> service.create(USER, request(secret)));
        assertThrows(
                SecurityException.class,
                () ->
                        service.create(
                                new WebsiteMonitorBatch.Caller(
                                        "guest", "test-workspace", List.of("guest")),
                                request(item("a"))));
        assertEquals(0, rows.count());
        assertEquals(0, effects.get());
    }

    @Test
    void concurrentSameKeyNeverRunsTwoNativeCreates() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            entered.countDown();
                            assertTrue(release.await(5, TimeUnit.SECONDS));
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> service.create(USER, request(item("a"))));
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            var second = pool.submit(() -> service.create(USER, request(item("a"))));
            assertEquals("IN_PROGRESS", second.get(5, TimeUnit.SECONDS).items().getFirst().state());
            release.countDown();
            assertEquals(1, first.get(5, TimeUnit.SECONDS).verified());
            assertEquals(1, service.create(USER, request(item("a"))).verified());
            assertEquals(1, effects.get());
        } finally {
            release.countDown();
        }
    }

    @Test
    void assignedIdAfterConstraintRollbackStaysUnknownWithoutReceiptAndCannotRetry() {
        long assignedId = 697803892804864L;
        doAnswer(
                        inv -> {
                            effects.incrementAndGet();
                            Monitor monitor = inv.getArgument(0);
                            monitor.setId(assignedId);
                            var failure =
                                    new org.apache.hertzbeat.manager.support.exception
                                            .MonitorDatabaseException("native persistence failed");
                            failure.initCause(
                                    new org.springframework.dao.DataIntegrityViolationException(
                                            "isolated constraint failure",
                                            new java.sql.SQLException(
                                                    "opaque database diagnostic", "23505")));
                            throw failure;
                        })
                .when(monitors)
                .addMonitor(any(), any(), isNull(), isNull());
        var request = request(item("rollback"));
        var first = service.create(USER, request);
        assertEquals(0, first.verified());
        assertEquals(0, first.failed());
        assertEquals(1, first.unknown());
        assertEquals(Long.toString(assignedId), first.items().getFirst().monitorId());
        assertEquals(
                "NATIVE_WRITE_CONSTRAINT_READBACK_UNAVAILABLE", first.items().getFirst().reason());
        assertTrue(first.items().getFirst().fields().isEmpty());
        assertTrue(first.items().getFirst().parameters().isEmpty());
        assertEquals(1, service.status(USER, request).unknown());
        assertEquals(
                1,
                service.create(USER, new WebsiteMonitorBatch.Request(request.items(), true))
                        .unknown());
        assertEquals(1, effects.get(), "A missing readback is never permission to repeat a write");
        assertEquals(0, probes.get());
    }

    @Test
    void unknownWriteWithoutReceiptNeverRetriesAndReadOnlyStatusDoesNotClaim() {
        doAnswer(
                        inv -> {
                            effects.incrementAndGet();
                            throw new IllegalStateException("transport uncertain");
                        })
                .when(monitors)
                .addMonitor(any(), any(), isNull(), isNull());
        assertEquals(1, service.create(USER, request(item("a"))).unknown());
        assertEquals(
                1,
                service.create(USER, new WebsiteMonitorBatch.Request(List.of(item("a")), true))
                        .unknown());
        assertEquals(1, effects.get());
        assertEquals(
                "NOT_STARTED",
                service.status(USER, request(item("not-started"))).items().getFirst().state());
        assertEquals(1, rows.count());
    }

    @Test
    void revokedExecutionGateStopsQueuedItemsAndCannotBeBypassedByClearedInterrupt() {
        var active = new java.util.concurrent.atomic.AtomicBoolean(true);
        doAnswer(
                        inv -> {
                            validations.incrementAndGet();
                            active.set(false);
                            Thread.interrupted();
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        service.close();
        service = new WebsiteMonitorBatchService(rows, monitors, 1);
        var result = service.create(USER, request(item("a"), item("b")), active::get);
        assertEquals(0, effects.get());
        assertEquals("UNKNOWN", result.items().getFirst().state());
        assertEquals("EXECUTION_STOPPED_RECONCILE", result.items().getFirst().reason());
        var replay =
                service.create(USER, new WebsiteMonitorBatch.Request(List.of(item("a")), true));
        assertEquals(1, replay.unknown());
        assertEquals(0, probes.get());
        assertEquals(1, validations.get());
        assertEquals(0, effects.get());
        assertEquals("NOT_STARTED", result.items().get(1).state());
        assertEquals(1, rows.count());
    }

    @Test
    void otherOwnerAndWorkspaceCannotReadAnotherCallersReceipt() {
        service.create(USER, request(item("a")));
        var other =
                new WebsiteMonitorBatch.Caller("another-owner", USER.workspace(), List.of("user"));
        assertEquals(
                "NOT_STARTED",
                service.status(other, request(item("a"))).items().getFirst().state());
        var workspace =
                new WebsiteMonitorBatch.Caller(USER.actor(), "another-workspace", List.of("user"));
        assertEquals(
                "NOT_STARTED",
                service.status(workspace, request(item("a"))).items().getFirst().state());
        assertEquals(1, effects.get());
    }

    @org.junit.jupiter.api.AfterEach
    void shutdownWorkerPool() {
        service.close();
        org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext.clear();
        com.usthe.sureness.util.SurenessContextHolder.clear();
    }

    @Test
    void fiftyConfigurationsPersistBeforeOptionalHttpChecksAndReplayWritesNothing()
            throws Exception {
        var concurrent = new AtomicInteger();
        var peak = new AtomicInteger();
        var http =
                com.sun.net.httpserver.HttpServer.create(
                        new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        var httpPool = Executors.newFixedThreadPool(10);
        http.setExecutor(httpPool);
        http.createContext(
                "/target/",
                exchange -> {
                    try {
                        Thread.sleep(350);
                        byte[] body =
                                "fixture-only".getBytes(java.nio.charset.StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, body.length);
                        try (var output = exchange.getResponseBody()) {
                            output.write(body);
                        }
                    } catch (InterruptedException cancelled) {
                        Thread.currentThread().interrupt();
                    } finally {
                        exchange.close();
                    }
                });
        http.start();
        var client = java.net.http.HttpClient.newHttpClient();
        var nativeWorkers = Executors.newFixedThreadPool(10);
        var timerReference =
                new java.util.concurrent.atomic.AtomicReference<
                        org.apache.hertzbeat.collector.timer.TimerDispatcher>();
        var jobIds = ConcurrentHashMap.<Long>newKeySet();
        org.apache.hertzbeat.collector.dispatch.MetricsTaskDispatch dispatch =
                timeout ->
                        nativeWorkers.submit(
                                () -> {
                                    var job =
                                            ((org.apache.hertzbeat.collector.timer.WheelTimerTask)
                                                            timeout.task())
                                                    .getJob();
                                    jobIds.add(job.getId());
                                    String path =
                                            job.getConfigmap().stream()
                                                    .filter(param -> "uri".equals(param.getKey()))
                                                    .findFirst()
                                                    .orElseThrow()
                                                    .getValue()
                                                    .toString();
                                    org.apache.hertzbeat.common.entity.message.CollectRep.Code code;
                                    try {
                                        var response =
                                                client.send(
                                                        java.net.http.HttpRequest.newBuilder(
                                                                        java.net.URI.create(
                                                                                "http://127.0.0.1:"
                                                                                        + http.getAddress()
                                                                                                .getPort()
                                                                                        + path))
                                                                .timeout(
                                                                        java.time.Duration
                                                                                .ofSeconds(5))
                                                                .GET()
                                                                .build(),
                                                        java.net.http.HttpResponse.BodyHandlers
                                                                .discarding());
                                        code =
                                                response.statusCode() == 200
                                                        ? org.apache.hertzbeat.common.entity.message
                                                                .CollectRep.Code.SUCCESS
                                                        : org.apache.hertzbeat.common.entity.message
                                                                .CollectRep.Code.FAIL;
                                    } catch (Exception error) {
                                        code =
                                                org.apache.hertzbeat.common.entity.message
                                                        .CollectRep.Code.FAIL;
                                    }
                                    timerReference
                                            .get()
                                            .responseSyncJobData(
                                                    job.getId(),
                                                    List.of(
                                                            org.apache.hertzbeat.common.entity
                                                                    .message.CollectRep.MetricsData
                                                                    .newBuilder()
                                                                    .setCode(code)
                                                                    .build()));
                                });
        @SuppressWarnings("unchecked")
        org.springframework.beans.factory.ObjectProvider<
                        org.apache.hertzbeat.collector.dispatch.MetricsTaskDispatch>
                provider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(provider.getObject()).thenReturn(dispatch);
        var nativeTimer = new org.apache.hertzbeat.collector.timer.TimerDispatcher(provider);
        timerReference.set(nativeTimer);
        var collector =
                new org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService(
                        nativeTimer,
                        new org.apache.hertzbeat.collector.dispatch.DispatchProperties(),
                        mock(org.apache.hertzbeat.collector.dispatch.WorkerPool.class));
        var scheduler = mock(org.apache.hertzbeat.manager.scheduler.CollectJobScheduling.class);
        when(scheduler.collectSyncJobData(any()))
                .thenAnswer(call -> collector.collectSyncJobData(call.getArgument(0)));
        var appService = mock(org.apache.hertzbeat.manager.service.AppService.class);
        when(appService.getAppDefine("website"))
                .thenAnswer(
                        call ->
                                org.apache.hertzbeat.common.entity.job.Job.builder()
                                        .id(0)
                                        .app("website")
                                        .metrics(
                                                List.of(
                                                        org.apache.hertzbeat.common.entity.job
                                                                .Metrics.builder()
                                                                .name("summary")
                                                                .priority((byte) 0)
                                                                .interval(1L)
                                                                .build()))
                                        .build());
        var nativeDetector = new org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl();
        org.springframework.test.util.ReflectionTestUtils.setField(
                nativeDetector, "appService", appService);
        org.springframework.test.util.ReflectionTestUtils.setField(
                nativeDetector, "collectJobScheduling", scheduler);
        doAnswer(
                        inv -> {
                            int current = concurrent.incrementAndGet();
                            peak.accumulateAndGet(current, Math::max);
                            try {
                                assertEquals(
                                        USER.workspace(),
                                        org.apache.hertzbeat.common.observability.gateway
                                                .AuthTokenRequestContext.currentWorkspaceId());
                                assertEquals(
                                        USER.actor(),
                                        String.valueOf(
                                                com.usthe.sureness.util.SurenessContextHolder
                                                        .getBindSubject()
                                                        .getPrincipal()));
                                List<Param> params = inv.getArgument(1);
                                nativeDetector.detectMonitor(inv.getArgument(0), params, null);
                                probes.incrementAndGet();
                                return null;
                            } finally {
                                concurrent.decrementAndGet();
                            }
                        })
                .when(monitors)
                .detectMonitor(any(), any(), isNull());
        doAnswer(
                        invocation -> {
                            assertEquals(
                                    USER.workspace(),
                                    org.apache.hertzbeat.common.observability.gateway
                                            .AuthTokenRequestContext.currentWorkspaceId());
                            assertEquals(
                                    USER.actor(),
                                    String.valueOf(
                                            com.usthe.sureness.util.SurenessContextHolder
                                                    .getBindSubject()
                                                    .getPrincipal()));
                            // Controlled native persistence latency makes durable progress
                            // observable.
                            Thread.sleep(50);
                            Monitor monitor = invocation.getArgument(0);
                            monitor.setId(9007199254740992L + effects.incrementAndGet());
                            monitor.setStatus(
                                    org.apache.hertzbeat.common.constants.CommonConstants
                                            .MONITOR_PENDING_CODE);
                            MonitorDto dto = new MonitorDto();
                            dto.setMonitor(monitor);
                            dto.setParams(invocation.getArgument(1), false);
                            stored.put(monitor.getId(), dto);
                            return null;
                        })
                .when(monitors)
                .addMonitor(any(), any(), isNull(), isNull());
        var request = fifty(http.getAddress().getPort(), "fixture");
        var progress = new java.util.ArrayList<Integer>();
        long started = System.nanoTime();
        try (var pool = Executors.newSingleThreadExecutor()) {
            var work =
                    pool.submit(
                            () -> {
                                org.apache.hertzbeat.common.observability.gateway
                                        .AuthTokenRequestContext.bindWorkspaceId(USER.workspace());
                                var subject = mock(com.usthe.sureness.subject.SubjectSum.class);
                                when(subject.getPrincipal()).thenReturn(USER.actor());
                                com.usthe.sureness.util.SurenessContextHolder.bindSubject(subject);
                                try {
                                    return service.create(USER, request);
                                } finally {
                                    org.apache.hertzbeat.common.observability.gateway
                                            .AuthTokenRequestContext.clear();
                                    com.usthe.sureness.util.SurenessContextHolder.clear();
                                }
                            });
            while (!work.isDone()) {
                progress.add(service.progress(USER, request).verified());
                Thread.sleep(100);
            }
            var result = work.get(25, TimeUnit.SECONDS);
            long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            assertEquals(50, result.verified());
            assertEquals(0, result.failed() + result.pending() + result.unknown());
            assertEquals(
                    50,
                    result.items().stream()
                            .map(WebsiteMonitorBatch.Receipt::monitorId)
                            .distinct()
                            .count());
            assertEquals(50, effects.get());
            assertEquals(0, probes.get());
            // Explicit diagnostics are independent; creating configurations never calls this path.
            try (var diagnostics = Executors.newFixedThreadPool(10)) {
                var checks =
                        stored.values().stream()
                                .map(
                                        dto ->
                                                diagnostics.submit(
                                                        () -> {
                                                            org.apache.hertzbeat.common
                                                                    .observability.gateway
                                                                    .AuthTokenRequestContext
                                                                    .bindWorkspaceId(
                                                                            USER.workspace());
                                                            var subject =
                                                                    mock(
                                                                            com.usthe.sureness
                                                                                    .subject
                                                                                    .SubjectSum
                                                                                    .class);
                                                            when(subject.getPrincipal())
                                                                    .thenReturn(USER.actor());
                                                            com.usthe.sureness.util
                                                                    .SurenessContextHolder
                                                                    .bindSubject(subject);
                                                            try {
                                                                monitors.detectMonitor(
                                                                        dto.getMonitor(),
                                                                        dto.getParams(),
                                                                        null);
                                                                return true;
                                                            } finally {
                                                                org.apache.hertzbeat.common
                                                                        .observability.gateway
                                                                        .AuthTokenRequestContext
                                                                        .clear();
                                                                com.usthe.sureness.util
                                                                        .SurenessContextHolder
                                                                        .clear();
                                                            }
                                                        }))
                                .toList();
                for (var check : checks) assertTrue(check.get(15, TimeUnit.SECONDS));
            }
            assertEquals(50, probes.get());
            assertEquals(50, jobIds.size());
            assertTrue(peak.get() > 1 && peak.get() <= 10);
            assertTrue(elapsed < 60000, "isolated fifty-item native batch exceeded60s: " + elapsed);
            assertTrue(
                    progress.stream().anyMatch(count -> count > 0 && count < 50),
                    progress.toString());
            assertEquals(
                    50,
                    rows.findAll().stream()
                            .filter(row -> "VERIFIED".equals(row.getState()))
                            .count());
            int readCount =
                    org.mockito.Mockito.mockingDetails(monitors).getInvocations().stream()
                            .filter(inv -> inv.getMethod().getName().equals("getMonitorDto"))
                            .toList()
                            .size();
            assertEquals(50, service.progress(USER, request).verified());
            assertEquals(
                    readCount,
                    org.mockito.Mockito.mockingDetails(monitors).getInvocations().stream()
                            .filter(inv -> inv.getMethod().getName().equals("getMonitorDto"))
                            .toList()
                            .size());
            assertEquals(50, service.create(USER, request).verified());
            assertEquals(50, probes.get());
            assertEquals(50, effects.get());
            System.out.println(
                    "ISOLATED_NATIVE_CONFIG50 elapsedMs="
                            + elapsed
                            + " peak="
                            + peak
                            + " progress="
                            + progress);
        } finally {
            nativeTimer.destroy();
            nativeWorkers.shutdownNow();
            assertTrue(nativeWorkers.awaitTermination(3, TimeUnit.SECONDS));
            http.stop(0);
            httpPool.shutdownNow();
        }
    }

    @Test
    void concurrentFiftyItemReplayKeepsSingleWritePerKey() throws Exception {
        doAnswer(
                        inv -> {
                            validations.incrementAndGet();
                            Thread.sleep(30);
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        var request = fifty(8080, "race");
        try (var clients = Executors.newFixedThreadPool(2)) {
            var first = clients.submit(() -> service.create(USER, request));
            var second = clients.submit(() -> service.create(USER, request));
            first.get(15, TimeUnit.SECONDS);
            second.get(15, TimeUnit.SECONDS);
            assertEquals(50, service.status(USER, request).verified());
            assertEquals(50, effects.get());
            assertEquals(0, probes.get());
            assertEquals(50, validations.get());
            assertEquals(50, rows.count());
        }
    }

    @Test
    void deadlineKeepsInFlightWritesUnknownAndNeverStartsTheRemainingQueue() throws Exception {
        service.close();
        service =
                new WebsiteMonitorBatchService(rows, monitors, 2, java.time.Duration.ofSeconds(2));
        var entered = new CountDownLatch(2);
        var release = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            entered.countDown();
                            // Deliberately emulate a non-interruptible in-flight native write.
                            boolean released = false;
                            while (!released) {
                                try {
                                    released = release.await(5, TimeUnit.SECONDS);
                                } catch (InterruptedException ignored) {
                                }
                            }
                            Monitor monitor = inv.getArgument(0);
                            monitor.setId(9007199254740992L + effects.incrementAndGet());
                            MonitorDto dto = new MonitorDto();
                            dto.setMonitor(monitor);
                            dto.setParams(inv.getArgument(1), false);
                            stored.put(monitor.getId(), dto);
                            return null;
                        })
                .when(monitors)
                .addMonitor(any(), any(), isNull(), isNull());
        var request = fifty(8080, "deadline");
        try (var client = Executors.newSingleThreadExecutor()) {
            var work = client.submit(() -> service.create(USER, request));
            assertTrue(entered.await(2, TimeUnit.SECONDS));
            var result = work.get(5, TimeUnit.SECONDS);
            assertTrue(result.unknown() > 0);
            assertEquals(0, result.verified());
            assertEquals(0, effects.get());
            assertEquals(0, probes.get());
            assertEquals(2, validations.get());
            release.countDown();
            long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (service.status(USER, request).verified() < 2 && System.nanoTime() < until)
                Thread.sleep(20);
            assertEquals(2, service.status(USER, request).verified());
            assertEquals(2, effects.get());
            assertEquals(0, probes.get());
            assertEquals(2, validations.get());
            assertEquals(48, service.progress(USER, request).pending());
        } finally {
            release.countDown();
        }
    }

    @Test
    void cancellationDuringNativeValidationPreventsAllUnstartedWrites() throws Exception {
        var active = new java.util.concurrent.atomic.AtomicBoolean(true);
        var entered = new CountDownLatch(10);
        var release = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            validations.incrementAndGet();
                            entered.countDown();
                            assertTrue(release.await(5, TimeUnit.SECONDS));
                            return null;
                        })
                .when(monitors)
                .validate(any(), anyBoolean());
        var request = fifty(8080, "cancel");
        try (var client = Executors.newSingleThreadExecutor()) {
            var work = client.submit(() -> service.create(USER, request, active::get));
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            active.set(false);
            release.countDown();
            var result = work.get(10, TimeUnit.SECONDS);
            assertEquals(0, effects.get());
            assertEquals(0, probes.get());
            assertEquals(10, validations.get());
            assertEquals(0, result.verified());
            assertEquals(40, result.pending());
            assertEquals(0, result.failed());
            assertEquals(10, result.unknown());
            var replay =
                    service.create(
                            USER,
                            new WebsiteMonitorBatch.Request(request.items().subList(0, 10), true));
            assertEquals(10, replay.unknown());
            assertEquals(0, effects.get());
        } finally {
            release.countDown();
        }
    }

    @Test
    void legacyInterruptedProbeCannotBeMisreportedOrRetriedAsAvailabilityFailure() {
        service.create(USER, request(item("a")));
        var row = rows.findAll().getFirst();
        row.setMonitorId(null);
        row.setState("PROBE_FAILED");
        row.setReason("EXECUTION_NO_LONGER_ACTIVE");
        rows.saveAndFlush(row);
        int before = effects.get();
        assertEquals(1, service.status(USER, request(item("a"))).unknown());
        assertEquals(1, service.progress(USER, request(item("a"))).unknown());
        assertEquals(
                1,
                service.create(USER, new WebsiteMonitorBatch.Request(List.of(item("a")), true))
                        .unknown());
        assertEquals(before, effects.get());
        assertEquals(0, probes.get());
        assertEquals(1, validations.get());
    }

    private WebsiteMonitorBatch.Request fifty(int port, String prefix) {
        return new WebsiteMonitorBatch.Request(
                java.util.stream.IntStream.range(0, 50)
                        .mapToObj(
                                index ->
                                        new WebsiteMonitorBatch.Item(
                                                prefix + "-" + index,
                                                "ai-perf-" + prefix + "-" + index,
                                                "http://127.0.0.1:" + port + "/target/" + index,
                                                600,
                                                1000))
                        .toList(),
                false);
    }

    private WebsiteMonitorBatch.Item item(String key) {
        return new WebsiteMonitorBatch.Item(
                key, "ai-e2e-" + key, "https://" + key + ".example/", 600, 10000);
    }

    private WebsiteMonitorBatch.Request request(WebsiteMonitorBatch.Item... items) {
        return new WebsiteMonitorBatch.Request(List.of(items), false);
    }

    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = WebsiteMonitorBatchItemDao.class)
    static class Config {
        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource(
                    "jdbc:h2:mem:website-batch-"
                            + java.util.UUID.randomUUID()
                            + ";DB_CLOSE_DELAY=-1",
                    "sa",
                    "");
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setManagedTypes(org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes.of(
                    List.of(WebsiteMonitorBatchItem.class.getName(), Monitor.class.getName(), Param.class.getName()), List.of()));
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        org.apache.hertzbeat.manager.dao.ParamDao candidateParams(jakarta.persistence.EntityManagerFactory factory) {
            return new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(
                    org.springframework.orm.jpa.SharedEntityManagerCreator.createSharedEntityManager(factory))
                    .getRepository(org.apache.hertzbeat.manager.dao.ParamDao.class);
        }

        @Bean
        PlatformTransactionManager transactionManager(
                jakarta.persistence.EntityManagerFactory emf) {
            return new JpaTransactionManager(emf);
        }

        @Bean
        MonitorService monitorService() {
            return mock(MonitorService.class);
        }
    }
}
