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

package org.apache.hertzbeat.alert.reduce;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.util.AlertWorkspaceLabelKeys;
import org.apache.hertzbeat.common.concurrent.ManagedExecutor;
import org.apache.hertzbeat.common.concurrent.ManagedExecutors;
import org.apache.hertzbeat.common.concurrent.WorkAdmissionGate;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * common reduce alarm worker
 */
@Service
@Slf4j
public class AlarmCommonReduce implements DisposableBean {

    private final AlarmGroupReduce alarmGroupReduce;

    private final ManagedExecutor workerExecutor;

    private final WorkAdmissionGate maintenanceGate = new WorkAdmissionGate();

    private final ReentrantLock maintenanceLock = new ReentrantLock(true);

    private final Deque<Runnable> deferredTasks = new ArrayDeque<>();

    private boolean stopped;

    public AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce) {
        this(alarmGroupReduce, VirtualThreadProperties.defaults());
    }

    @Autowired
    public AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce, VirtualThreadProperties virtualThreadProperties) {
        this.alarmGroupReduce = alarmGroupReduce;
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        this.workerExecutor = initWorkExecutor(properties);
    }

    AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce, ManagedExecutor workerExecutor) {
        this.alarmGroupReduce = alarmGroupReduce;
        this.workerExecutor = workerExecutor;
    }

    private ManagedExecutor initWorkExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("alerter-reduce-worker has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.enabled()) {
            VirtualThreadProperties.QueueProperties queueProperties = properties.alerter().reduce();
            return ManagedExecutors.newQueuedVirtualExecutor("alerter-reduce-worker", "alerter-reduce-worker-",
                    queueProperties.maxConcurrentJobs(), queueProperties.queueCapacity(), handler);
        }
        return ManagedExecutors.wrap("alerter-reduce-worker", new java.util.concurrent.ThreadPoolExecutor(2,
                2,
                10,
                java.util.concurrent.TimeUnit.SECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(),
                new ThreadFactoryBuilder()
                        .setUncaughtExceptionHandler(handler)
                        .setDaemon(true)
                        .setNameFormat("alerter-reduce-worker-%d")
                        .build(),
                new java.util.concurrent.ThreadPoolExecutor.AbortPolicy()));
    }


    public void reduceAndSendAlarm(SingleAlert alert) {
        reduceAndSendSystemAlarm(alert);
    }

    public void reduceAndSendSystemAlarm(SingleAlert alert) {
        reduceAndSendAlarm(AuthTokenScopes.DEFAULT_WORKSPACE_ID, alert);
    }

    public void reduceAndSendAlarm(String workspaceId, SingleAlert alert) {
        requireWorkspace(workspaceId);
        if (alert == null) {
            throw new IllegalArgumentException("alert_required");
        }
        alert.setWorkspaceId(workspaceId);
        submitOrDefer(reduceAlarmTask(alert));
    }

    public void reduceAndSendAlarmGroup(Map<String, String> groupLabels, List<SingleAlert> alerts) {
        reduceAndSendSystemAlarmGroup(groupLabels, alerts);
    }

    public void reduceAndSendSystemAlarmGroup(Map<String, String> groupLabels, List<SingleAlert> alerts) {
        reduceAndSendAlarmGroup(AuthTokenScopes.DEFAULT_WORKSPACE_ID, groupLabels, alerts);
    }

    public void reduceAndSendAlarmGroup(String workspaceId, Map<String, String> groupLabels,
                                        List<SingleAlert> alerts) {
        requireWorkspace(workspaceId);
        if (alerts == null || alerts.isEmpty()) {
            throw new IllegalArgumentException("alerts_required");
        }
        alerts.forEach(alert -> {
            if (alert == null) {
                throw new IllegalArgumentException("alert_required");
            }
            alert.setWorkspaceId(workspaceId);
        });
        submitOrDefer(() -> {
            try {
                // Generate alert fingerprint
                for (SingleAlert alert : alerts) {
                    stripReservedWorkspaceLabels(alert);
                    String fingerprint = generateAlertFingerprint(alert.getLabels());
                    alert.setFingerprint(fingerprint);
                }
                // Process the group alert
                alarmGroupReduce.processGroupAlert(groupLabels, alerts);
            } catch (Exception e) {
                log.error("Reduce alarm group failed: {}", e.getMessage());
            }
        });
    }

    private static void requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new IllegalArgumentException("workspace_required");
        }
    }

    public void pauseAdmission() {
        maintenanceLock.lock();
        try {
            maintenanceGate.pauseAdmission();
        } finally {
            maintenanceLock.unlock();
        }
    }

    public void awaitDrained(long timeoutNanos) throws InterruptedException, TimeoutException {
        maintenanceGate.awaitDrained(timeoutNanos);
    }

    public void resumeAdmission() {
        maintenanceLock.lock();
        try {
            if (stopped) {
                return;
            }
            while (!deferredTasks.isEmpty()) {
                Runnable deferred = deferredTasks.peekFirst();
                WorkAdmissionGate.Permit permit = maintenanceGate.reserveReplay();
                if (permit == null) {
                    return;
                }
                submitAdmitted(deferred, permit);
                deferredTasks.removeFirst();
            }
            maintenanceGate.resumeAdmission();
        } finally {
            maintenanceLock.unlock();
        }
    }

    private void submitOrDefer(Runnable task) {
        maintenanceLock.lock();
        try {
            if (stopped) {
                return;
            }
            WorkAdmissionGate.Permit permit = maintenanceGate.tryAcquire();
            if (permit != null) {
                beforeAdmittedSubmission();
                submitAdmitted(task, permit);
                return;
            }
            deferredTasks.addLast(task);
        } finally {
            maintenanceLock.unlock();
        }
    }

    void beforeAdmittedSubmission() {
    }

    boolean hasQueuedMaintenanceThread(Thread thread) {
        return maintenanceLock.hasQueuedThread(thread);
    }

    int deferredTaskCount() {
        maintenanceLock.lock();
        try {
            return deferredTasks.size();
        } finally {
            maintenanceLock.unlock();
        }
    }

    private void submitAdmitted(Runnable task, WorkAdmissionGate.Permit permit) {
        try {
            workerExecutor.execute(() -> {
                try (permit) {
                    task.run();
                }
            });
        } catch (RuntimeException exception) {
            permit.close();
            throw exception;
        }
    }

    Runnable reduceAlarmTask(SingleAlert alert) {
        return () -> {
            try {
                // Generate alert fingerprint
                stripReservedWorkspaceLabels(alert);
                String fingerprint = generateAlertFingerprint(alert.getLabels());
                alert.setFingerprint(fingerprint);
                alarmGroupReduce.processGroupAlert(alert);
            } catch (Exception e) {
                log.error("Reduce alarm failed: {}", e.getMessage());
            }
        };
    }

    /**
     * Generate fingerprint for alert to identify duplicates
     * Fingerprint is based on labels excluding timestamp related fields
     */
    private String generateAlertFingerprint(Map<String, String> labels) {
        return labels.entrySet().stream()
                .filter(e -> !"timestamp".equals(e.getKey())
                        && !"starts_at".equals(e.getKey()) && !"actives_at".equals(e.getKey())
                        && !"end_at".equals(e.getKey()) && !"ends_at".equals(e.getKey())
                        && !"start_at".equals(e.getKey()) && !"active_at".equals(e.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + ":" + e.getValue())
                .collect(Collectors.joining(","));
    }

    private void stripReservedWorkspaceLabels(SingleAlert alert) {
        if (alert.getLabels() == null || alert.getLabels().isEmpty()) {
            return;
        }
        Map<String, String> labels = new java.util.HashMap<>(alert.getLabels());
        labels.keySet().removeIf(AlertWorkspaceLabelKeys::isReserved);
        alert.setLabels(labels);
    }

    @Override
    public void destroy() {
        maintenanceLock.lock();
        try {
            maintenanceGate.stop();
            deferredTasks.clear();
            stopped = true;
        } finally {
            maintenanceLock.unlock();
        }
        workerExecutor.close();
    }
}
