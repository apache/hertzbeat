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

package org.apache.hertzbeat.manager.scheduler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.config.PrometheusProxyConfig;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.ReflectionUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Exercises scheduler lifecycle transitions with real assignment state and simulated collectors.
 */
class CollectorJobSchedulerLifecycleTest {

    private static final String MAIN = CommonConstants.MAIN_COLLECTOR_NODE;
    private static final String REMOTE = "remote-lifecycle";
    private static final long MONITOR_ID = 123L;

    @Test
    void pinnedMainStartupDispatchesExactlyOneCompleteJob() throws Exception {
        Fixture fixture = new Fixture(MAIN);
        fixture.init.run();
        assertEquals(1, fixture.issued.size());
        fixture.assertOnlyActive(fixture.monitor.getJobId(), MAIN);
        fixture.assertMetadata(fixture.issued.get(0));
    }

    @Test
    void repeatedInitializationRetiresPreviousMainTask() throws Exception {
        Fixture fixture = new Fixture(MAIN);
        fixture.init.run();
        long previous = fixture.monitor.getJobId();
        fixture.init.run();
        assertEquals(2, fixture.issued.size());
        fixture.assertOnlyActive(fixture.monitor.getJobId(), MAIN);
        assertTrue(fixture.cancelled.contains(previous));
        fixture.issued.forEach(fixture::assertMetadata);
    }

    @Test
    void automaticStartupDispatchesExactlyOneCompleteJob() throws Exception {
        Fixture fixture = new Fixture(null);
        fixture.init.run();
        assertEquals(1, fixture.issued.size());
        fixture.assertOnlyActive(fixture.monitor.getJobId(), MAIN);
        fixture.assertMetadata(fixture.issued.get(0));
    }

    @Test
    void offlinePinnedStartupRestoresOnceWhenRemoteConnects() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.init.run();
        long waitingJob = fixture.monitor.getJobId();
        assertTrue(fixture.issued.isEmpty());
        fixture.online(REMOTE);
        assertEquals(1, fixture.issued.size());
        fixture.assertOnlyActive(fixture.monitor.getJobId(), REMOTE);
        fixture.assertMetadata(fixture.issued.get(0));
        if (waitingJob != fixture.monitor.getJobId()) {
            assertFalse(fixture.cachedJobs().containsKey(waitingJob));
        }
    }

    @Test
    void pausedPinnedMonitorIsNotDispatchedAtStartupOrOnCollectorConnection() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.monitor.setStatus(CommonConstants.MONITOR_PAUSED_CODE);
        fixture.init.run();
        assertTrue(fixture.issued.isEmpty());
        assertTrue(fixture.cachedJobs().isEmpty());
        fixture.online(REMOTE);
        assertTrue(fixture.issued.isEmpty());
        assertTrue(fixture.active(MAIN).isEmpty());
        assertTrue(fixture.active(REMOTE).isEmpty());
        assertTrue(fixture.cachedJobs().isEmpty());
        fixture.assertNotAssigned(77L);
        assertEquals(77L, fixture.monitor.getJobId());
    }

    @Test
    void repeatedOnlineNotificationDoesNotIssueAnotherJob() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.init.run();
        fixture.online(REMOTE);
        long firstId = fixture.monitor.getJobId();
        fixture.online(REMOTE);
        fixture.online(REMOTE);
        assertEquals(1, fixture.issued.size());
        fixture.assertOnlyActive(firstId, REMOTE);
    }

    @Test
    void remoteRestartRebuildsOneJobWithTheSameMetadata() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.init.run();
        fixture.online(REMOTE);
        long previous = fixture.monitor.getJobId();
        fixture.scheduler.collectorGoOffline(REMOTE);
        // A disconnected collector process has lost its own in-memory jobs.
        fixture.active(REMOTE).clear();
        fixture.online(REMOTE);
        assertEquals(2, fixture.issued.size());
        assertNotEquals(previous, fixture.monitor.getJobId());
        fixture.assertOnlyActive(fixture.monitor.getJobId(), REMOTE);
        fixture.issued.forEach(fixture::assertMetadata);
        assertFalse(fixture.cachedJobs().containsKey(previous));
    }

    @Test
    void discoveryAndProxySettingsSurvivePinnedRebuild() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.monitor.setScrape("http_sd");
        when(fixture.proxyConfig.isPrometheusProxy()).thenReturn(true);
        fixture.init.run();
        fixture.online(REMOTE);
        Job restored = fixture.issued.get(0);
        assertEquals("http_sd", restored.getApp());
        assertTrue(restored.isSd());
        assertTrue(restored.isPrometheusProxyMode());
        fixture.assertMetadata(restored);
        fixture.assertOnlyActive(restored.getId(), REMOTE);
    }

    @Test
    void pinnedRebuildUsesMasterScheduleMappingForLegacyMonitor() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.monitor.setScheduleType(null);
        fixture.monitor.setCronExpression("stale legacy cron");
        fixture.init.run();
        fixture.online(REMOTE);
        Job restored = fixture.issued.get(0);
        assertEquals("interval", restored.getScheduleType());
        assertNull(restored.getCronExpression());
        assertEquals(fixture.monitor.getIntervals().longValue(), restored.getDefaultInterval());
        fixture.assertOnlyActive(restored.getId(), REMOTE);
    }

    @Test
    void movingFromMainToRemoteCancelsEveryPreviousLocalJob() throws Exception {
        Fixture fixture = new Fixture(MAIN);
        fixture.init.run();
        fixture.online(REMOTE);
        long previous = fixture.monitor.getJobId();
        Job moved = fixture.issued.get(0).clone();
        moved.setId(previous);
        long replacement = fixture.scheduler.updateAsyncCollectJob(moved, REMOTE);
        fixture.assertOnlyActive(replacement, REMOTE);
        assertTrue(fixture.cancelled.contains(previous));
        assertTrue(fixture.active(MAIN).isEmpty());
        fixture.assertMetadata(fixture.active(REMOTE).get(replacement));
    }

    @Test
    void repeatedAddReplacesMonitorJobAndStaleDeleteCannotCancelReplacement() {
        Fixture fixture = new Fixture(null);
        fixture.online(MAIN);
        long first = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        long second = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        assertNotEquals(first, second);
        fixture.assertOnlyActive(second, MAIN);
        assertTrue(fixture.cancelled.contains(first));
        fixture.scheduler.cancelAsyncCollectJob(first);
        fixture.assertOnlyActive(second, MAIN);
        long third = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        fixture.assertOnlyActive(third, MAIN);
        assertTrue(fixture.cancelled.contains(second));
    }

    @Test
    void rejectedLocalReplacementRetainsPreviousJobAndAllowsSuccessfulRetry() {
        Fixture fixture = new Fixture(null);
        fixture.online(MAIN);
        long previous = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        Job rejected = fixture.job();
        fixture.rejectNextLocalDispatch.set(true);
        assertThrows(IllegalStateException.class, () -> fixture.scheduler.addAsyncCollectJob(rejected, MAIN));
        fixture.assertOnlyActive(previous, MAIN);
        fixture.assertNotAssigned(rejected.getId());
        assertFalse(fixture.cancelled.contains(previous));
        assertEquals(1, fixture.issued.size());
        long replacement = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        fixture.assertOnlyActive(replacement, MAIN);
        assertTrue(fixture.cancelled.contains(previous), "retry must still find and cancel the previous monitor job");
        assertEquals(2, fixture.issued.size());
    }

    @Test
    void rejectedPinnedRemoteReplacementRetainsPreviousJobAndAllowsSuccessfulRetry() {
        assertRemoteReplacementRollback(REMOTE);
    }

    @Test
    void rejectedAutomaticRemoteReplacementRetainsPreviousJobAndAllowsSuccessfulRetry() {
        assertRemoteReplacementRollback(null);
    }

    @Test
    void rollbackCancellationFailurePreservesDispatchFailureAndPreviousJobForRetry() {
        Fixture fixture = new Fixture(null);
        fixture.online(REMOTE);
        long previous = fixture.scheduler.addAsyncCollectJob(fixture.job(), REMOTE);
        Job rejected = fixture.job();
        fixture.rejectNextRemoteDispatch.set(true);
        fixture.rejectNextRemoteCancellation.set(true);
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> fixture.scheduler.addAsyncCollectJob(rejected, REMOTE));
        assertTrue(exception.getMessage().startsWith("Failed to dispatch job "));
        assertEquals(1, exception.getSuppressed().length);
        assertEquals("simulated collector cancellation failure", exception.getSuppressed()[0].getMessage());
        fixture.assertOnlyActive(previous, REMOTE);
        fixture.assertNotAssigned(rejected.getId());
        assertFalse(fixture.cancelled.contains(previous));
        long replacement = fixture.scheduler.addAsyncCollectJob(fixture.job(), REMOTE);
        fixture.assertOnlyActive(replacement, REMOTE);
        assertTrue(fixture.cancelled.contains(previous), "rollback must restore the previous monitor index even when cancellation fails");
    }

    private void assertRemoteReplacementRollback(String collector) {
        Fixture fixture = new Fixture(null);
        fixture.online(REMOTE);
        long previous = fixture.scheduler.addAsyncCollectJob(fixture.job(), collector);
        Job rejected = fixture.job();
        rejected.setId(previous);
        fixture.rejectNextRemoteDispatch.set(true);
        assertThrows(IllegalStateException.class, () -> fixture.scheduler.updateAsyncCollectJob(rejected, collector));
        fixture.assertOnlyActive(previous, REMOTE);
        fixture.assertNotAssigned(rejected.getId());
        assertFalse(fixture.cancelled.contains(previous));
        assertEquals(1, fixture.issued.size());
        fixture.scheduler.reBalanceCollectorAssignJobs();
        fixture.assertOnlyActive(previous, REMOTE);
        long replacement = fixture.scheduler.addAsyncCollectJob(fixture.job(), collector);
        fixture.assertOnlyActive(replacement, REMOTE);
        assertTrue(fixture.cancelled.contains(previous), "retry must still find and cancel the previous monitor job");
        assertEquals(2, fixture.issued.size());
    }

    @Test
    void deletedMonitorCanBeAddedAgainWithoutStaleState() {
        Fixture fixture = new Fixture(null);
        fixture.online(MAIN);
        long deleted = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        fixture.scheduler.cancelAsyncCollectJob(deleted);
        assertTrue(fixture.active(MAIN).isEmpty());
        assertTrue(fixture.cachedJobs().isEmpty());
        long replacement = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        fixture.assertOnlyActive(replacement, MAIN);
    }

    @Test
    void cancellationClearsAllAssignmentSetsBeforeRebalance() {
        Fixture fixture = new Fixture(null);
        fixture.online(MAIN);
        long deleted = fixture.scheduler.addAsyncCollectJob(fixture.job(), MAIN);
        AssignJobs assignments = fixture.hash.getNode(MAIN).getAssignJobs();
        assignments.addAssignJob(deleted);
        assignments.addAddingJob(deleted);
        assignments.addRemovingJob(deleted);
        fixture.scheduler.cancelAsyncCollectJob(deleted);
        fixture.assertNotAssigned(deleted);
        fixture.scheduler.reBalanceCollectorAssignJobs();
        assertTrue(fixture.active(MAIN).isEmpty());
        assertEquals(1, fixture.issued.size());
    }

    @Test
    void deletingDuringPendingRebalanceCancelsOldOwnerAndDoesNotDispatchNewOwner() {
        Fixture fixture = new Fixture(null);
        fixture.online(MAIN);
        List<Long> ids = new ArrayList<>();
        for (long monitorId = 1; monitorId <= 100; monitorId++) {
            Job job = fixture.job();
            job.setMonitorId(monitorId);
            ids.add(fixture.scheduler.addAsyncCollectJob(job, null));
        }
        fixture.hash.addNode(new ConsistentHash.Node(REMOTE, "public", "127.0.0.2", 0L, null));
        Set<Long> pending = fixture.hash.getNode(REMOTE).getAssignJobs().getAddingJobs();
        assertFalse(pending.isEmpty(), "real hash-ring expansion must move at least one test job");
        long deleted = pending.iterator().next();
        fixture.scheduler.cancelAsyncCollectJob(deleted);
        assertFalse(fixture.active(MAIN).containsKey(deleted));
        fixture.assertNotAssigned(deleted);
        fixture.scheduler.reBalanceCollectorAssignJobs();
        assertFalse(fixture.active(REMOTE).containsKey(deleted));
        assertEquals(ids.size() - 1, fixture.active(MAIN).size() + fixture.active(REMOTE).size());
    }

    @Test
    void deletingQueuedAutomaticJobBeforeAnyCollectorConnectsPreventsResurrection() {
        Fixture fixture = new Fixture(null);
        long deleted = fixture.scheduler.addAsyncCollectJob(fixture.job(), null);
        assertEquals(1, fixture.hash.getDispatchJobCache().size());
        assertTrue(fixture.issued.isEmpty());
        fixture.scheduler.cancelAsyncCollectJob(deleted);
        assertTrue(fixture.hash.getDispatchJobCache().isEmpty());
        fixture.online(MAIN);
        fixture.scheduler.reBalanceCollectorAssignJobs();
        assertTrue(fixture.issued.isEmpty());
        assertTrue(fixture.active(MAIN).isEmpty());
        fixture.assertNotAssigned(deleted);
        long replacement = fixture.scheduler.addAsyncCollectJob(fixture.job(), null);
        fixture.assertOnlyActive(replacement, MAIN);
    }

    @Test
    void concurrentAddsAndOnlineRestoreLeaveOnlyOneActiveMonitorJob() throws Exception {
        Fixture fixture = new Fixture(REMOTE);
        fixture.init.run();
        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        try {
            futures.add(executor.submit(() -> {
                await(start);
                fixture.online(REMOTE);
            }));
            for (int i = 0; i < 4; i++) {
                futures.add(executor.submit(() -> {
                    await(start);
                    fixture.scheduler.addAsyncCollectJob(fixture.job(), REMOTE);
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
            assertEquals(1, fixture.active(REMOTE).size());
            long current = fixture.active(REMOTE).keySet().iterator().next();
            fixture.assertOnlyActive(current, REMOTE);
            fixture.issued.stream().filter(job -> job.getId() != current).forEach(job ->
                    assertTrue(fixture.cancelled.contains(job.getId()), "every superseded dispatch must be cancelled"));
        } finally {
            executor.shutdownNow();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError(exception);
        }
    }

    private static final class Fixture {
        private final CollectorJobScheduler scheduler = new CollectorJobScheduler();
        private final SchedulerInit init = new SchedulerInit();
        private final ConsistentHash hash = new ConsistentHash();
        private final PrometheusProxyConfig proxyConfig = mock(PrometheusProxyConfig.class);
        private final Map<String, Map<Long, Job>> activeJobs = new ConcurrentHashMap<>();
        private final List<Job> issued = new CopyOnWriteArrayList<>();
        private final Set<Long> cancelled = ConcurrentHashMap.newKeySet();
        private final AtomicBoolean rejectNextLocalDispatch = new AtomicBoolean();
        private final AtomicBoolean rejectNextRemoteDispatch = new AtomicBoolean();
        private final AtomicBoolean rejectNextRemoteCancellation = new AtomicBoolean();
        private final Monitor monitor = Monitor.builder().id(MONITOR_ID).jobId(77L)
                .name("switch").instance("192.0.2.1").app("huawei_switch_S8700")
                .intervals(60).status((byte) 1).scheduleType("interval")
                .labels(Map.of("核心机房", "1#5", "网络", "外网"))
                .annotations(Map.of("summary", "uplink discards")).build();

        private Fixture(String pinnedCollector) {
            CollectorDao collectors = mock(CollectorDao.class);
            CollectorMonitorBindDao binds = mock(CollectorMonitorBindDao.class);
            MonitorDao monitors = mock(MonitorDao.class);
            ParamDao params = mock(ParamDao.class);
            AppService apps = mock(AppService.class);
            CollectJobService local = mock(CollectJobService.class);
            ManageServer remote = mock(ManageServer.class);
            Map<String, Collector> storedCollectors = new ConcurrentHashMap<>();
            for (String identity : List.of(MAIN, REMOTE)) {
                storedCollectors.put(identity, Collector.builder().name(identity).ip("127.0.0.1")
                        .mode("public").version("test").status(CommonConstants.COLLECTOR_STATUS_OFFLINE).build());
            }
            List<CollectorMonitorBind> storedBinds = pinnedCollector == null ? List.of()
                    : List.of(CollectorMonitorBind.builder().collector(pinnedCollector).monitorId(MONITOR_ID).build());
            when(collectors.findAll()).thenAnswer(invocation -> new ArrayList<>(storedCollectors.values()));
            when(collectors.findCollectorByName(anyString())).thenAnswer(invocation ->
                    Optional.ofNullable(storedCollectors.get(invocation.getArgument(0))));
            when(collectors.save(any(Collector.class))).thenAnswer(invocation -> {
                Collector collector = invocation.getArgument(0);
                storedCollectors.put(collector.getName(), collector);
                return collector;
            });
            when(binds.findAll()).thenReturn(storedBinds);
            when(binds.findCollectorMonitorBindsByCollector(anyString())).thenAnswer(invocation ->
                    storedBinds.stream().filter(bind -> bind.getCollector().equals(invocation.getArgument(0))).toList());
            when(monitors.findMonitorsByStatusNotInAndJobIdNotNull(any())).thenAnswer(invocation -> {
                List<Byte> excludedStatuses = invocation.getArgument(0);
                return monitor.getJobId() == null || excludedStatuses.contains(monitor.getStatus())
                        ? List.of() : List.of(monitor);
            });
            when(monitors.findMonitorsByIdIn(any())).thenReturn(List.of(monitor));
            when(params.findParamsByMonitorId(MONITOR_ID)).thenReturn(List.of());
            when(apps.getAppDefine(anyString())).thenAnswer(invocation -> {
                Job template = new Job();
                template.setApp(invocation.getArgument(0));
                template.setParams(List.of());
                return template;
            });
            doAnswer(invocation -> {
                if (rejectNextLocalDispatch.compareAndSet(true, false)) {
                    throw new IllegalStateException("simulated collector rejected replacement");
                }
                issue(MAIN, invocation.getArgument(0));
                return null;
            }).when(local).addAsyncCollectJob(any(Job.class));
            doAnswer(invocation -> {
                Long id = invocation.getArgument(0);
                active(MAIN).remove(id);
                cancelled.add(id);
                return null;
            }).when(local).cancelAsyncCollectJob(any(Long.class));
            when(remote.sendMsg(anyString(), any(ClusterMsg.Message.class))).thenAnswer(invocation -> {
                String identity = invocation.getArgument(0);
                ClusterMsg.Message message = invocation.getArgument(1);
                String payload = message.getMsg().toStringUtf8();
                if (message.getType() == ClusterMsg.MessageType.ISSUE_CYCLIC_TASK) {
                    if (rejectNextRemoteDispatch.compareAndSet(true, false)) {
                        return false;
                    }
                    issue(identity, JsonUtil.fromJson(payload, Job.class));
                } else if (message.getType() == ClusterMsg.MessageType.DELETE_CYCLIC_TASK) {
                    if (rejectNextRemoteCancellation.compareAndSet(true, false)) {
                        throw new IllegalStateException("simulated collector cancellation failure");
                    }
                    for (Long id : JsonUtil.fromJson(payload, Long[].class)) {
                        active(identity).remove(id);
                        cancelled.add(id);
                    }
                }
                return true;
            });
            ReflectionTestUtils.setField(scheduler, "consistentHash", hash);
            ReflectionTestUtils.setField(scheduler, "collectJobService", local);
            scheduler.setManageServer(remote);
            if (ReflectionUtils.findField(CollectorJobScheduler.class, "prometheusProxyConfig") != null) {
                ReflectionTestUtils.setField(scheduler, "prometheusProxyConfig", proxyConfig);
            }
            for (Object target : List.of(scheduler, init)) {
                ReflectionTestUtils.setField(target, "collectorDao", collectors);
                ReflectionTestUtils.setField(target, "collectorMonitorBindDao", binds);
                ReflectionTestUtils.setField(target, "monitorDao", monitors);
                ReflectionTestUtils.setField(target, "paramDao", params);
                ReflectionTestUtils.setField(target, "appService", apps);
            }
            ReflectionTestUtils.setField(init, "collectorScheduling", scheduler);
            ReflectionTestUtils.setField(init, "collectJobScheduling", scheduler);
            ReflectionTestUtils.setField(init, "prometheusProxyConfig", proxyConfig);
        }

        private void online(String identity) {
            scheduler.collectorGoOnline(identity, CollectorInfo.builder().name(identity).ip("127.0.0.1")
                    .mode("public").version("test").build());
        }

        private Job job() {
            Job job = new Job();
            job.setMonitorId(MONITOR_ID);
            job.setApp(monitor.getApp());
            job.setLabels(monitor.getLabels());
            job.setAnnotations(monitor.getAnnotations());
            job.setParams(List.of());
            job.setCyclic(true);
            return job;
        }

        private void issue(String identity, Job job) {
            Job snapshot = job.clone();
            issued.add(snapshot);
            active(identity).put(snapshot.getId(), snapshot);
        }

        private Map<Long, Job> active(String identity) {
            return activeJobs.computeIfAbsent(identity, key -> new ConcurrentHashMap<>());
        }

        @SuppressWarnings("unchecked")
        private Map<Long, Job> cachedJobs() {
            return (Map<Long, Job>) ReflectionTestUtils.getField(scheduler, "jobContentCache");
        }

        private void assertOnlyActive(long id, String identity) {
            assertEquals(Set.of(id), active(identity).keySet());
            assertEquals(1, activeJobs.values().stream().mapToInt(Map::size).sum());
            assertEquals(Set.of(id), cachedJobs().keySet());
            assertEquals(MONITOR_ID, active(identity).get(id).getMonitorId());
            Set<Long> assigned = ConcurrentHashMap.newKeySet();
            hash.getAllNodes().values().forEach(node -> {
                assigned.addAll(node.getAssignJobs().getJobs());
                assigned.addAll(node.getAssignJobs().getPinnedJobs());
                assigned.addAll(node.getAssignJobs().getAddingJobs());
                assertTrue(node.getAssignJobs().getRemovingJobs().isEmpty());
            });
            assertEquals(Set.of(id), assigned);
        }

        private void assertNotAssigned(long id) {
            hash.getAllNodes().values().forEach(node -> {
                AssignJobs assignments = node.getAssignJobs();
                assertFalse(assignments.getJobs().contains(id));
                assertFalse(assignments.getPinnedJobs().contains(id));
                assertFalse(assignments.getAddingJobs().contains(id));
                assertFalse(assignments.getRemovingJobs().contains(id));
            });
            assertFalse(cachedJobs().containsKey(id));
        }

        private void assertMetadata(Job job) {
            assertEquals(monitor.getLabels(), job.getLabels());
            assertEquals(monitor.getAnnotations(), job.getAnnotations());
            assertEquals(monitor.getName(), job.getMetadata().get(CommonConstants.LABEL_INSTANCE_NAME));
            assertEquals(monitor.getInstance(), job.getMetadata().get(CommonConstants.LABEL_INSTANCE));
            assertEquals(monitor.getIntervals().longValue(), job.getDefaultInterval());
            assertEquals(monitor.getScheduleType(), job.getScheduleType());
        }
    }
}
