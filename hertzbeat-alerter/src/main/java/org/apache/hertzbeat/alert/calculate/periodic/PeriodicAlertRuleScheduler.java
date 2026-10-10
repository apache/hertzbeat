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

package org.apache.hertzbeat.alert.calculate.periodic;

import static org.apache.hertzbeat.common.constants.CommonConstants.LOG_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.apache.hertzbeat.common.constants.CommonConstants.METRIC_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.apache.hertzbeat.common.constants.CommonConstants.TRACE_ALERT_THRESHOLD_TYPE_PERIODIC;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.concurrent.WorkAdmissionGate;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Periodic Alert Rule Scheduler
 */
@Slf4j
@Component
public class PeriodicAlertRuleScheduler {

    private final MetricsPeriodicAlertCalculator metricsCalculator;
    private final LogPeriodicAlertCalculator logCalculator;
    private final TracePeriodicAlertCalculator traceCalculator;
    private final AlertDefineDao alertDefineDao;
    private ScheduledExecutorService scheduledExecutor;
    private ExecutorService periodicExecutor;
    private Semaphore periodicPermits;
    private final VirtualThreadProperties virtualThreadProperties;
    private boolean virtualThreadsEnabled;
    private final Map<Long, ScheduledTaskState> scheduledTasks;
    private final WorkAdmissionGate maintenanceGate = new WorkAdmissionGate();
    private boolean maintenancePaused;

    @Autowired
    public PeriodicAlertRuleScheduler(MetricsPeriodicAlertCalculator metricsCalculator,
                                      LogPeriodicAlertCalculator logCalculator,
                                      TracePeriodicAlertCalculator traceCalculator,
                                      AlertDefineDao alertDefineDao,
                                      VirtualThreadProperties virtualThreadProperties) {
        this.metricsCalculator = metricsCalculator;
        this.logCalculator = logCalculator;
        this.traceCalculator = traceCalculator;
        this.alertDefineDao = alertDefineDao;
        this.virtualThreadProperties = virtualThreadProperties == null
                ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        this.scheduledTasks = new ConcurrentHashMap<>();
    }

    synchronized void start() {
        if (scheduledExecutor != null) {
            return;
        }
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Scheduled periodic alert threshold has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("periodic-alert-threshold-worker-%d")
                .build();
        scheduledExecutor = Executors.newScheduledThreadPool(10, threadFactory);
        virtualThreadsEnabled = virtualThreadProperties.enabled();
        int maxConcurrentPeriodicTasks = Math.max(
                1, virtualThreadProperties.alerter().periodicMaxConcurrentJobs());
        this.periodicExecutor = virtualThreadsEnabled
                ? Executors.newThreadPerTaskExecutor(Thread.ofVirtual()
                .name("periodic-alert-task-", 0)
                .uncaughtExceptionHandler((thread, throwable) ->
                        log.error("Periodic alert task failed", throwable))
                .factory())
                : null;
        this.periodicPermits = virtualThreadsEnabled ? new Semaphore(maxConcurrentPeriodicTasks) : null;
        log.info("Starting periodic alert rule scheduler...");
        List<AlertDefine> metricsPeriodicRules = alertDefineDao.findAlertDefinesByTypeAndEnableTrue(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC);
        List<AlertDefine> logPeriodicRules = alertDefineDao.findAlertDefinesByTypeAndEnableTrue(LOG_ALERT_THRESHOLD_TYPE_PERIODIC);
        List<AlertDefine> tracePeriodicRules = alertDefineDao.findAlertDefinesByTypeAndEnableTrue(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC);
        List<AlertDefine> periodicRules = new ArrayList<>(metricsPeriodicRules.size() + logPeriodicRules.size()
                + tracePeriodicRules.size());
        periodicRules.addAll(metricsPeriodicRules);
        periodicRules.addAll(logPeriodicRules);
        periodicRules.addAll(tracePeriodicRules);
        for (AlertDefine rule : periodicRules) {
            updateSchedule(rule);
        }
    }

    synchronized void stop() {
        scheduledTasks.values().forEach(ScheduledTaskState::cancel);
        scheduledTasks.clear();
        if (scheduledExecutor != null) {
            scheduledExecutor.shutdownNow();
            scheduledExecutor = null;
        }
        if (periodicExecutor != null) {
            periodicExecutor.shutdownNow();
            periodicExecutor = null;
        }
        periodicPermits = null;
    }

    public synchronized void cancelSchedule(Long ruleId) {
        if (ruleId == null || scheduledExecutor == null) {
            return;
        }
        ScheduledTaskState state = scheduledTasks.remove(ruleId);
        if (state != null) {
            state.cancel();
        }
    }

    public synchronized void updateSchedule(AlertDefine rule) {
        if (rule == null || rule.getId() == null) {
            log.error("Alert rule is null or rule id is null.");
            return;
        }
        if (scheduledExecutor == null) {
            return;
        }
        cancelSchedule(rule.getId());
        if (isPeriodicRule(rule.getType())) {
            ScheduledExecutorService currentScheduledExecutor = scheduledExecutor;
            ExecutorService currentPeriodicExecutor = periodicExecutor;
            Semaphore currentPeriodicPermits = periodicPermits;
            ScheduledTaskState state = new ScheduledTaskState(
                    rule, currentPeriodicExecutor, currentPeriodicPermits);
            ScheduledFuture<?> future = currentScheduledExecutor.scheduleAtFixedRate(
                    state::trigger,
                    0, rule.getPeriod(), TimeUnit.SECONDS);
            state.setScheduledFuture(future);
            scheduledTasks.put(rule.getId(), state);
        }
    }

    private void executeRule(AlertDefine rule) {
        if (rule.getType().equals(METRIC_ALERT_THRESHOLD_TYPE_PERIODIC)) {
            metricsCalculator.calculate(rule);
        } else if (rule.getType().equals(LOG_ALERT_THRESHOLD_TYPE_PERIODIC)) {
            logCalculator.calculate(rule);
        } else if (rule.getType().equals(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC)) {
            traceCalculator.calculate(rule);
        }
    }

    public synchronized void pauseAdmission() {
        maintenancePaused = true;
        maintenanceGate.pauseAdmission();
    }

    public void awaitDrained(long timeoutNanos) throws InterruptedException, java.util.concurrent.TimeoutException {
        maintenanceGate.awaitDrained(timeoutNanos);
    }

    public void resumeAdmission() {
        List<ScheduledTaskState> states;
        synchronized (this) {
            if (!maintenancePaused) {
                return;
            }
            maintenanceGate.resumeAdmission();
            maintenancePaused = false;
            states = new ArrayList<>(scheduledTasks.values());
        }
        states.forEach(ScheduledTaskState::resumeMissed);
    }

    private synchronized WorkAdmissionGate.Permit acquireTriggerPermit(ScheduledTaskState state) {
        if (maintenancePaused) {
            state.markMissed();
            return null;
        }
        return maintenanceGate.tryAcquire();
    }

    void beforeRuleTrigger(AlertDefine rule) {
    }

    private void executeRuleWithPermit(AlertDefine rule, WorkAdmissionGate.Permit permit) {
        if (permit == null) {
            return;
        }
        try (permit) {
            executeRule(rule);
        }
    }

    private boolean isPeriodicRule(String type) {
        return METRIC_ALERT_THRESHOLD_TYPE_PERIODIC.equals(type)
                || LOG_ALERT_THRESHOLD_TYPE_PERIODIC.equals(type)
                || TRACE_ALERT_THRESHOLD_TYPE_PERIODIC.equals(type);
    }

    private final class ScheduledTaskState {

        private final AlertDefine rule;
        private final ExecutorService taskExecutor;
        private final Semaphore taskPermits;
        private ScheduledFuture<?> scheduledFuture;
        private Future<?> runningFuture;
        private boolean running;
        private boolean pending;
        private WorkAdmissionGate.Permit pendingPermit;
        private boolean cancelled;
        private boolean missedWhilePaused;

        private ScheduledTaskState(AlertDefine rule, ExecutorService taskExecutor, Semaphore taskPermits) {
            this.rule = rule;
            this.taskExecutor = taskExecutor;
            this.taskPermits = taskPermits;
        }

        private synchronized void setScheduledFuture(ScheduledFuture<?> scheduledFuture) {
            this.scheduledFuture = scheduledFuture;
        }

        private void trigger() {
            beforeRuleTrigger(rule);
            WorkAdmissionGate.Permit permit = acquireTriggerPermit(this);
            if (permit == null) {
                return;
            }
            synchronized (this) {
                if (cancelled) {
                    permit.close();
                    return;
                }
                if (running) {
                    if (!pending) {
                        pending = true;
                        pendingPermit = permit;
                    } else {
                        permit.close();
                    }
                    return;
                }
                running = true;
            }
            submit(permit);
        }

        private synchronized void cancel() {
            cancelled = true;
            pending = false;
            if (pendingPermit != null) {
                pendingPermit.close();
                pendingPermit = null;
            }
            missedWhilePaused = false;
            ScheduledFuture<?> periodicFuture = scheduledFuture;
            Future<?> currentFuture = runningFuture;
            if (periodicFuture != null) {
                periodicFuture.cancel(true);
            }
            if (currentFuture != null) {
                currentFuture.cancel(true);
            }
        }

        private void submit(WorkAdmissionGate.Permit permit) {
            if (taskExecutor == null) {
                runTask(permit);
                return;
            }
            try {
                runningFuture = taskExecutor.submit(() -> runTask(permit));
            } catch (RuntimeException e) {
                running = false;
                permit.close();
                throw e;
            }
        }

        private void runTask(WorkAdmissionGate.Permit permit) {
            boolean concurrencyPermitAcquired = false;
            try {
                if (taskPermits != null) {
                    taskPermits.acquire();
                    concurrencyPermitAcquired = true;
                }
                if (!Thread.currentThread().isInterrupted()) {
                    executeRuleWithPermit(rule, permit);
                    permit = null;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                log.error("Periodic alert rule {} execution error: {}", rule.getName(), e.getMessage(), e);
            } finally {
                if (permit != null) {
                    permit.close();
                }
                if (concurrencyPermitAcquired) {
                    taskPermits.release();
                }
                onComplete();
            }
        }

        private synchronized void onComplete() {
            runningFuture = null;
            if (cancelled) {
                running = false;
                pending = false;
                return;
            }
            if (!pending) {
                running = false;
                return;
            }
            pending = false;
            WorkAdmissionGate.Permit nextPermit = pendingPermit;
            pendingPermit = null;
            submit(nextPermit);
        }

        private synchronized void markMissed() {
            if (!cancelled) {
                missedWhilePaused = true;
            }
        }

        private void resumeMissed() {
            synchronized (this) {
                if (!missedWhilePaused || cancelled) {
                    return;
                }
                missedWhilePaused = false;
            }
            trigger();
        }
    }
}
