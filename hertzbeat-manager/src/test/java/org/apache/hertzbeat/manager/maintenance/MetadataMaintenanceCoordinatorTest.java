/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class MetadataMaintenanceCoordinatorTest {

    @Test
    void rejectsDuplicateParticipantIds() {
        List<String> events = new ArrayList<>();

        assertThatThrownBy(() -> new MetadataMaintenanceCoordinator(List.of(
                participant("duplicate", events), participant("duplicate", events))))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.INVALID_REQUEST));
    }

    @Test
    void quiescesInOrderAndResumesInReverseOrder() {
        List<String> events = new ArrayList<>();
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(
                participant("discovery", events), participant("status", events)));

        MetadataMaintenanceLease lease = coordinator.quiesce("operation-a", Duration.ofSeconds(1));

        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.QUIESCED);
        assertThat(events).containsExactly("pause-discovery", "pause-status");

        lease.resume();

        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
        assertThat(events).containsExactly(
                "pause-discovery", "pause-status", "resume-status", "resume-discovery");
    }

    @Test
    void duplicateOperationCannotResumeTheOwnerLease() {
        List<String> events = new ArrayList<>();
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(
                List.of(participant("discovery", events)));

        MetadataMaintenanceLease owner = coordinator.quiesce("operation-a", Duration.ofSeconds(1));

        assertThat(events).containsExactly("pause-discovery");
        assertThatThrownBy(() -> coordinator.quiesce("operation-a", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.OPERATION_CONFLICT));
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.QUIESCED);

        owner.resume();
        owner.resume();
        assertThat(events).containsExactly("pause-discovery", "resume-discovery");
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void duplicateOperationWhileQuiescingCannotLaterObtainAnAliasLease() throws Exception {
        CountDownLatch pauseEntered = new CountDownLatch(1);
        CountDownLatch releasePause = new CountDownLatch(1);
        MetadataMaintenanceParticipant participant = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "blocked-pause";
            }

            @Override
            public void quiesce(Duration timeout) {
                pauseEntered.countDown();
                await(releasePause);
            }

            @Override
            public void resume() {
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(participant));
        AtomicReference<MetadataMaintenanceLease> ownerLease = new AtomicReference<>();
        Thread ownerThread = Thread.ofPlatform().unstarted(() ->
                ownerLease.set(coordinator.quiesce("operation-a", Duration.ofSeconds(30))));
        ownerThread.start();
        assertThat(pauseEntered.await(1, TimeUnit.SECONDS)).isTrue();

        AtomicReference<MetadataMaintenanceLease> duplicateLease = new AtomicReference<>();
        AtomicReference<MetadataMaintenanceException> duplicateFailure = new AtomicReference<>();
        Thread duplicateThread = Thread.ofPlatform().unstarted(() -> {
            try {
                duplicateLease.set(coordinator.quiesce("operation-a", Duration.ofSeconds(30)));
            } catch (MetadataMaintenanceException exception) {
                duplicateFailure.set(exception);
            }
        });
        duplicateThread.start();
        releasePause.countDown();
        ownerThread.join(1_000);
        duplicateThread.join(1_000);

        assertThat(ownerThread.isAlive()).isFalse();
        assertThat(duplicateThread.isAlive()).isFalse();
        assertThat(duplicateLease.get()).isNull();
        assertThat(duplicateFailure.get().code()).isEqualTo(MetadataMaintenanceErrorCode.OPERATION_CONFLICT);
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.QUIESCED);

        ownerLease.get().resume();
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void conflictingOperationFailsWithoutDisclosingItsIdentifier() {
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of());
        coordinator.quiesce("private-operation", Duration.ZERO);

        assertThatThrownBy(() -> coordinator.quiesce("other-private-operation", Duration.ZERO))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.OPERATION_CONFLICT);
                    assertThat(exception.safeMessage()).doesNotContain("private");
                    assertThat(exception.getCause()).isNull();
                });
    }

    @Test
    void participantFailureResumesCompletedParticipantsInReverseOrder() {
        List<String> events = new ArrayList<>();
        MetadataMaintenanceParticipant first = participant("first", events);
        MetadataMaintenanceParticipant failing = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "failing";
            }

            @Override
            public void quiesce(Duration timeout) {
                events.add("pause-failing");
                throw new IllegalStateException("private-task-body");
            }

            @Override
            public void resume() {
                events.add("resume-failing");
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(first, failing));

        assertThatThrownBy(() -> coordinator.quiesce("operation-a", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.PARTICIPANT_FAILURE);
                    assertThat(exception.safeMessage()).doesNotContain("private-task-body");
                    assertThat(exception.getCause()).isNull();
                });

        assertThat(events).containsExactly(
                "pause-first", "pause-failing", "resume-failing", "resume-first");
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void timeoutRollsBackAndUsesStableSafeFailure() {
        List<String> events = new ArrayList<>();
        MetadataMaintenanceParticipant timeout = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "timeout";
            }

            @Override
            public void quiesce(Duration ignored) {
                throw MetadataMaintenanceException.quiesceTimeout();
            }

            @Override
            public void resume() {
                events.add("resume-timeout");
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(timeout));

        assertThatThrownBy(() -> coordinator.quiesce("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT);
                    assertThat(exception.getCause()).isNull();
                });
        assertThat(events).containsExactly("resume-timeout");
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void failedParticipantRecoveryRequiresSameOperationAndCanBeRetriedExplicitly() {
        AtomicBoolean resumeFails = new AtomicBoolean(true);
        MetadataMaintenanceParticipant participant = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "recovery-failure";
            }

            @Override
            public void quiesce(Duration ignored) {
                throw MetadataMaintenanceException.quiesceTimeout();
            }

            @Override
            public void resume() {
                if (resumeFails.get()) {
                    throw MetadataMaintenanceException.resumeFailure();
                }
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(participant));

        assertThatThrownBy(() -> coordinator.quiesce("operation-a", Duration.ZERO))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_TIMEOUT));

        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RECOVERY_REQUIRED);
        assertThatThrownBy(() -> coordinator.recover("operation-b"))
                .isInstanceOfSatisfying(MetadataMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MetadataMaintenanceErrorCode.OPERATION_CONFLICT));
        resumeFails.set(false);
        coordinator.recover("operation-a");
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void interruptedQuiesceRestoresInterruptAndRollsBack() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        MetadataMaintenanceParticipant interruptible = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "interruptible";
            }

            @Override
            public void quiesce(Duration ignored) {
                entered.countDown();
                try {
                    new CountDownLatch(1).await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw MetadataMaintenanceException.quiesceInterrupted();
                }
            }

            @Override
            public void resume() {
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(interruptible));
        AtomicReference<MetadataMaintenanceException> failure = new AtomicReference<>();
        AtomicReference<Boolean> interrupted = new AtomicReference<>(false);
        Thread thread = Thread.ofPlatform().unstarted(() -> {
            try {
                coordinator.quiesce("operation-a", Duration.ofSeconds(30));
            } catch (MetadataMaintenanceException exception) {
                failure.set(exception);
                interrupted.set(Thread.currentThread().isInterrupted());
            }
        });

        thread.start();
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        thread.interrupt();
        thread.join(1_000);

        assertThat(thread.isAlive()).isFalse();
        assertThat(failure.get().code()).isEqualTo(MetadataMaintenanceErrorCode.QUIESCE_INTERRUPTED);
        assertThat(interrupted.get()).isTrue();
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    @Test
    void resumeInvokesEachParticipantExactlyOnce() {
        AtomicInteger resumes = new AtomicInteger();
        MetadataMaintenanceParticipant participant = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "counted";
            }

            @Override
            public void quiesce(Duration timeout) {
            }

            @Override
            public void resume() {
                resumes.incrementAndGet();
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(participant));

        MetadataMaintenanceLease lease = coordinator.quiesce("operation-a", Duration.ZERO);
        lease.resume();
        lease.resume();

        assertThat(resumes).hasValue(1);
    }

    @Test
    void resumeDoesNotExposePartiallyRunningParticipantsOrIssueAnotherLease() throws Exception {
        CountDownLatch resumeEntered = new CountDownLatch(1);
        CountDownLatch releaseResume = new CountDownLatch(1);
        MetadataMaintenanceParticipant participant = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "blocked-resume";
            }

            @Override
            public void quiesce(Duration timeout) {
            }

            @Override
            public void resume() {
                resumeEntered.countDown();
                try {
                    releaseResume.await();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw MetadataMaintenanceException.quiesceInterrupted();
                }
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(List.of(participant));
        MetadataMaintenanceLease lease = coordinator.quiesce("operation-a", Duration.ofSeconds(1));
        Thread resumeThread = Thread.ofPlatform().unstarted(lease::resume);
        resumeThread.start();
        assertThat(resumeEntered.await(1, TimeUnit.SECONDS)).isTrue();

        CountDownLatch acquisitionAttempted = new CountDownLatch(1);
        CountDownLatch acquisitionReturned = new CountDownLatch(1);
        AtomicReference<MetadataMaintenanceLease> laterLease = new AtomicReference<>();
        Thread acquisitionThread = Thread.ofPlatform().unstarted(() -> {
            acquisitionAttempted.countDown();
            laterLease.set(coordinator.quiesce("operation-a", Duration.ofSeconds(1)));
            acquisitionReturned.countDown();
        });
        acquisitionThread.start();
        assertThat(acquisitionAttempted.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(acquisitionReturned.getCount()).isOne();

        releaseResume.countDown();
        resumeThread.join(1_000);
        assertThat(acquisitionReturned.await(1, TimeUnit.SECONDS)).isTrue();
        laterLease.get().resume();
    }

    @Test
    void virtualMachineErrorsAreNotMappedOrHidden() {
        List<String> events = new ArrayList<>();
        AssertionError fatal = new AssertionError("fatal");
        MetadataMaintenanceParticipant participant = new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return "fatal";
            }

            @Override
            public void quiesce(Duration timeout) {
                throw fatal;
            }

            @Override
            public void resume() {
            }
        };
        MetadataMaintenanceCoordinator coordinator = new MetadataMaintenanceCoordinator(
                List.of(participant("first", events), participant));

        assertThatThrownBy(() -> coordinator.quiesce("operation-a", Duration.ofSeconds(1)))
                .isSameAs(fatal);
        assertThat(events).containsExactly("pause-first", "resume-first");
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataMaintenancePhase.RUNNING);
    }

    private MetadataMaintenanceParticipant participant(String name, List<String> events) {
        return new MetadataMaintenanceParticipant() {
            @Override
            public String participantId() {
                return name;
            }

            @Override
            public void quiesce(Duration timeout) {
                events.add("pause-" + name);
            }

            @Override
            public void resume() {
                events.add("resume-" + name);
            }
        };
    }

    private void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw MetadataMaintenanceException.quiesceInterrupted();
        }
    }
}
