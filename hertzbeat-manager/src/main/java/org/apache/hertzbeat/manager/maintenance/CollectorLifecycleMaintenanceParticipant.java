/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.alert.calculate.CollectorAlertHandler;
import org.apache.hertzbeat.common.concurrent.WorkAdmissionGate;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.apache.hertzbeat.manager.scheduler.CollectorJobScheduler;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Coalesces collector lifecycle intent while draining metadata and paired alert work. */
@Component
@ConditionalOnNormalBusinessRuntime
@Order(300)
public final class CollectorLifecycleMaintenanceParticipant implements MetadataMaintenanceParticipant {

    private final Object lock = new Object();
    private final CollectorJobScheduler scheduler;
    private final CollectorAlertHandler alertHandler;
    private final WorkAdmissionGate maintenanceGate = new WorkAdmissionGate();
    private final Map<String, Transition> pendingTransitions = new HashMap<>();
    private final Set<String> runningIdentities = new HashSet<>();
    private MetadataMaintenancePhase phase = MetadataMaintenancePhase.RUNNING;
    private long generation;

    public CollectorLifecycleMaintenanceParticipant(
            CollectorJobScheduler scheduler, CollectorAlertHandler alertHandler) {
        this.scheduler = scheduler;
        this.alertHandler = alertHandler;
    }

    @Override
    public String participantId() {
        return "collector-control-metadata";
    }

    public void collectorOnline(String identity, CollectorInfo collectorInfo, boolean submitAlert) {
        submit(identity, true, collectorInfo, submitAlert);
    }

    public void collectorOffline(String identity, boolean submitAlert) {
        submit(identity, false, null, submitAlert);
    }

    @Override
    public void quiesce(Duration timeout) {
        MaintenanceDeadline deadline = MaintenanceDeadline.start(timeout);
        synchronized (lock) {
            if (phase == MetadataMaintenancePhase.QUIESCED) {
                return;
            }
            phase = MetadataMaintenancePhase.QUIESCING;
            maintenanceGate.pauseAdmission();
        }
        try {
            maintenanceGate.awaitDrained(deadline.remainingNanos());
            synchronized (lock) {
                phase = MetadataMaintenancePhase.QUIESCED;
            }
        } catch (InterruptedException exception) {
            reopenAfterFailedQuiesce();
            Thread.currentThread().interrupt();
            throw MetadataMaintenanceException.quiesceInterrupted();
        } catch (TimeoutException exception) {
            reopenAfterFailedQuiesce();
            throw MetadataMaintenanceException.quiesceTimeout();
        }
    }

    @Override
    public void resume() {
        while (true) {
            Transition transition;
            synchronized (lock) {
                transition = pendingTransitions.values().stream()
                        .min(Comparator.comparingLong(Transition::generation))
                        .orElse(null);
                if (transition == null) {
                    maintenanceGate.resumeAdmission();
                    phase = MetadataMaintenancePhase.RUNNING;
                    return;
                }
                pendingTransitions.remove(transition.identity(), transition);
                runningIdentities.add(transition.identity());
            }
            try {
                execute(transition);
            } catch (RuntimeException exception) {
                synchronized (lock) {
                    pendingTransitions.putIfAbsent(transition.identity(), transition);
                    runningIdentities.remove(transition.identity());
                }
                throw exception;
            } finally {
                synchronized (lock) {
                    runningIdentities.remove(transition.identity());
                }
            }
        }
    }

    private void submit(String identity, boolean online, CollectorInfo collectorInfo, boolean submitAlert) {
        WorkAdmissionGate.Permit permit;
        Transition transition;
        synchronized (lock) {
            transition = new Transition(identity, online, collectorInfo, submitAlert, ++generation);
            if (runningIdentities.contains(identity)) {
                pendingTransitions.put(identity, transition);
                return;
            }
            // A failed transition is retained only until a newer observed intent supersedes it.
            pendingTransitions.remove(identity);
            permit = maintenanceGate.tryAcquire();
            if (permit == null) {
                pendingTransitions.put(identity, transition);
                return;
            }
            runningIdentities.add(identity);
        }
        executeAdmitted(transition, permit);
    }

    private void executeAdmitted(Transition firstTransition, WorkAdmissionGate.Permit firstPermit) {
        Transition transition = firstTransition;
        WorkAdmissionGate.Permit permit = firstPermit;
        RuntimeException firstFailure = null;
        while (true) {
            boolean transitionFailed = false;
            try {
                execute(transition);
            } catch (RuntimeException exception) {
                transitionFailed = true;
                if (firstFailure == null) {
                    firstFailure = exception;
                } else if (firstFailure.getSuppressed().length == 0) {
                    firstFailure.addSuppressed(exception);
                }
            } finally {
                permit.close();
            }
            synchronized (lock) {
                runningIdentities.remove(transition.identity());
                Transition next = pendingTransitions.remove(transition.identity());
                if (next == null) {
                    if (transitionFailed) {
                        pendingTransitions.put(transition.identity(), transition);
                    }
                    throwIfFailed(firstFailure);
                    return;
                }
                permit = maintenanceGate.tryAcquire();
                if (permit == null) {
                    pendingTransitions.put(next.identity(), next);
                    throwIfFailed(firstFailure);
                    return;
                }
                runningIdentities.add(next.identity());
                transition = next;
            }
        }
    }

    private void throwIfFailed(RuntimeException failure) {
        if (failure != null) {
            throw failure;
        }
    }

    private void execute(Transition transition) {
        if (transition.online()) {
            if (transition.submitAlert()) {
                alertHandler.online(transition.identity());
            }
            scheduler.collectorGoOnline(transition.identity(), transition.collectorInfo());
            return;
        }
        scheduler.collectorGoOffline(transition.identity());
        if (transition.submitAlert()) {
            alertHandler.offline(transition.identity());
        }
    }

    private void reopenAfterFailedQuiesce() {
        synchronized (lock) {
            maintenanceGate.resumeAdmission();
            phase = MetadataMaintenancePhase.RUNNING;
        }
    }

    private record Transition(
            String identity,
            boolean online,
            CollectorInfo collectorInfo,
            boolean submitAlert,
            long generation) {
    }
}
