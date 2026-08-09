/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.stereotype.Component;

/**
 * Coordinates process-local metadata producers without controlling their shared executors.
 *
 * <p>A future migration workflow must quiesce this coordinator before acquiring metadata write
 * admission. On exit it must release write admission before resuming this lease. Keeping those
 * capabilities separate prevents producer lifecycle from becoming a transaction or datasource
 * switch.</p>
 */
@Component
public final class MetadataMaintenanceCoordinator {

    private final ReentrantLock lock = new ReentrantLock();
    private final List<MetadataMaintenanceParticipant> participants;
    private MetadataMaintenancePhase phase = MetadataMaintenancePhase.RUNNING;
    private String operationId;
    private long epoch;
    private Object leaseToken;

    public MetadataMaintenanceCoordinator(List<MetadataMaintenanceParticipant> participants) {
        this.participants = List.copyOf(participants);
        validateParticipants(this.participants);
    }

    /** Pause producers in registration order and drain work admitted before the pause. */
    public MetadataMaintenanceLease quiesce(String requestedOperationId, Duration timeout) {
        MaintenanceDeadline deadline = MaintenanceDeadline.start(timeout);
        requireOperationId(requestedOperationId);
        Acquisition acquisition = beginAcquisition(requestedOperationId);

        List<MetadataMaintenanceParticipant> completed = new ArrayList<>(participants.size());
        try {
            for (MetadataMaintenanceParticipant participant : participants) {
                participant.quiesce(deadline.remaining());
                completed.add(participant);
            }
        } catch (MetadataMaintenanceException exception) {
            rollback(acquisition, completed);
            throw exception;
        } catch (Error error) {
            rollback(acquisition, completed);
            throw error;
        } catch (RuntimeException exception) {
            rollback(acquisition, completed);
            throw MetadataMaintenanceException.participantFailure();
        }
        return completeAcquisition(acquisition);
    }

    public MetadataMaintenanceSnapshot snapshot() {
        lock.lock();
        try {
            return new MetadataMaintenanceSnapshot(phase, operationId, epoch);
        } finally {
            lock.unlock();
        }
    }

    void resume(String resumedOperationId, long resumedEpoch, Object resumedToken) {
        lock.lock();
        try {
            if (!ownsResumeLease(resumedOperationId, resumedEpoch, resumedToken)) {
                throw MetadataMaintenanceException.staleLease();
            }
            phase = MetadataMaintenancePhase.QUIESCING;
            boolean failed = false;
            for (int index = participants.size() - 1; index >= 0; index--) {
                try {
                    participants.get(index).resume();
                } catch (RuntimeException exception) {
                    failed = true;
                }
            }
            if (failed) {
                throw MetadataMaintenanceException.resumeFailure();
            }
            reopen();
        } finally {
            lock.unlock();
        }
    }

    private Acquisition beginAcquisition(String requestedOperationId) {
        lock.lock();
        try {
            if (phase != MetadataMaintenancePhase.RUNNING) {
                throw MetadataMaintenanceException.operationConflict();
            }
            phase = MetadataMaintenancePhase.QUIESCING;
            operationId = requestedOperationId;
            long requestedEpoch = ++epoch;
            Object requestedToken = new Object();
            leaseToken = requestedToken;
            return new Acquisition(requestedOperationId, requestedEpoch, requestedToken);
        } finally {
            lock.unlock();
        }
    }

    private MetadataMaintenanceLease completeAcquisition(Acquisition acquisition) {
        lock.lock();
        try {
            if (!ownsAcquisition(acquisition)) {
                throw MetadataMaintenanceException.operationConflict();
            }
            phase = MetadataMaintenancePhase.QUIESCED;
            return lease(acquisition);
        } finally {
            lock.unlock();
        }
    }

    private void rollback(Acquisition acquisition, List<MetadataMaintenanceParticipant> completed) {
        Collections.reverse(completed);
        for (MetadataMaintenanceParticipant participant : completed) {
            try {
                participant.resume();
            } catch (RuntimeException exception) {
                // Rollback is best effort and must not replace the primary safe failure category.
            }
        }
        lock.lock();
        try {
            if (ownsAcquisition(acquisition)) {
                reopen();
            }
        } finally {
            lock.unlock();
        }
    }

    private boolean ownsAcquisition(Acquisition acquisition) {
        return phase == MetadataMaintenancePhase.QUIESCING
                && epoch == acquisition.epoch()
                && operationId.equals(acquisition.operationId())
                && leaseToken == acquisition.token();
    }

    private boolean ownsResumeLease(String resumedOperationId, long resumedEpoch, Object resumedToken) {
        return (phase == MetadataMaintenancePhase.QUIESCED
                || phase == MetadataMaintenancePhase.QUIESCING)
                && epoch == resumedEpoch
                && operationId.equals(resumedOperationId)
                && leaseToken == resumedToken;
    }

    private MetadataMaintenanceLease lease(Acquisition acquisition) {
        return new MetadataMaintenanceLease(
                this, acquisition.operationId(), acquisition.epoch(), acquisition.token());
    }

    private void reopen() {
        phase = MetadataMaintenancePhase.RUNNING;
        operationId = null;
        leaseToken = null;
    }

    private void requireOperationId(String requestedOperationId) {
        if (requestedOperationId == null || requestedOperationId.isBlank()) {
            throw MetadataMaintenanceException.invalidRequest();
        }
    }

    private void validateParticipants(List<MetadataMaintenanceParticipant> registeredParticipants) {
        Set<String> participantIds = new HashSet<>(registeredParticipants.size());
        for (MetadataMaintenanceParticipant participant : registeredParticipants) {
            String participantId = participant.participantId();
            if (participantId == null || participantId.isBlank() || !participantIds.add(participantId)) {
                throw MetadataMaintenanceException.invalidRequest();
            }
        }
    }

    private record Acquisition(String operationId, long epoch, Object token) {
    }
}
