/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

/** Pure classifier for the exact activation and rollback snapshot state graph. */
final class MigrationActivationClassifier {

    Decision activation(MigrationActivationCandidate candidate, MigrationActivationSnapshots snapshots) {
        MemberState application = memberState(snapshots.activeApplication(), candidate.application(), candidate);
        MemberState secret = memberState(snapshots.activeSecrets(), candidate.secrets(), candidate);
        SetupCandidateState applicationCandidate = candidateState(
                snapshots.candidateApplication(), candidate.application(), candidate.generation());
        SetupCandidateState secretCandidate = candidateState(
                snapshots.candidateSecrets(), candidate.secrets(), candidate.generation());
        Decision invalid = invalidDecision(
                snapshots, application, secret, applicationCandidate, secretCandidate);
        if (invalid != null) {
            return invalid;
        }
        if (!validBasePair(candidate, snapshots, application, secret)) {
            return Decision.RECOVERY_REQUIRED;
        }
        if (application == MemberState.BASE && secret == MemberState.BASE) {
            return bothBaseActivation(applicationCandidate, secretCandidate);
        }
        if (application == MemberState.TARGET && secret == MemberState.BASE) {
            if (applicationCandidate == SetupCandidateState.TARGET) {
                return Decision.DISCARD_APPLICATION;
            }
            return secretCandidate == SetupCandidateState.TARGET
                    ? Decision.PROMOTE_SECRET : Decision.RECOVERY_REQUIRED;
        }
        if (application == MemberState.BASE && secret == MemberState.TARGET) {
            return Decision.RECOVERY_REQUIRED;
        }
        if (applicationCandidate == SetupCandidateState.TARGET) {
            return Decision.DISCARD_APPLICATION;
        }
        if (secretCandidate == SetupCandidateState.TARGET) {
            return Decision.DISCARD_SECRET;
        }
        return Decision.COMPLETE;
    }

    Decision rollback(MigrationActivationCandidate candidate, MigrationActivationSnapshots snapshots) {
        MemberState application = memberState(snapshots.activeApplication(), candidate.application(), candidate);
        MemberState secret = memberState(snapshots.activeSecrets(), candidate.secrets(), candidate);
        SetupCandidateState applicationCandidate = candidateState(
                snapshots.candidateApplication(), candidate.application(), candidate.generation());
        SetupCandidateState secretCandidate = candidateState(
                snapshots.candidateSecrets(), candidate.secrets(), candidate.generation());
        Decision invalid = invalidDecision(
                snapshots, application, secret, applicationCandidate, secretCandidate);
        if (invalid != null) {
            return invalid;
        }
        if (!validLastKnownGood(candidate, snapshots)) {
            return Decision.RECOVERY_REQUIRED;
        }
        if (application == MemberState.TARGET && secret == MemberState.TARGET) {
            return Decision.RESTORE_SECRET;
        }
        if (application == MemberState.TARGET && secret == MemberState.BASE) {
            return sameSnapshot(snapshots.activeSecrets(), snapshots.lastKnownGoodSecrets())
                    ? Decision.RESTORE_APPLICATION : Decision.RECOVERY_REQUIRED;
        }
        if (application == MemberState.BASE && secret == MemberState.TARGET) {
            return Decision.RECOVERY_REQUIRED;
        }
        if (!sameSnapshot(snapshots.activeApplication(), snapshots.lastKnownGoodApplication())
                || !sameSnapshot(snapshots.activeSecrets(), snapshots.lastKnownGoodSecrets())) {
            return Decision.RECOVERY_REQUIRED;
        }
        if (applicationCandidate == SetupCandidateState.TARGET) {
            return Decision.DISCARD_APPLICATION;
        }
        if (secretCandidate == SetupCandidateState.TARGET) {
            return Decision.DISCARD_SECRET;
        }
        return Decision.COMPLETE;
    }

    private static Decision bothBaseActivation(SetupCandidateState application,
                                               SetupCandidateState secrets) {
        if (application == SetupCandidateState.MISSING && secrets == SetupCandidateState.MISSING) {
            return Decision.STAGE_APPLICATION;
        }
        if (application == SetupCandidateState.TARGET && secrets == SetupCandidateState.MISSING) {
            return Decision.STAGE_SECRET;
        }
        if (application == SetupCandidateState.TARGET && secrets == SetupCandidateState.TARGET) {
            return Decision.PROMOTE_APPLICATION;
        }
        return Decision.RECOVERY_REQUIRED;
    }

    private static Decision invalidDecision(MigrationActivationSnapshots snapshots,
                                            MemberState application, MemberState secrets,
                                            SetupCandidateState applicationCandidate,
                                            SetupCandidateState secretCandidate) {
        if (application == MemberState.STALE || secrets == MemberState.STALE) {
            return application == MemberState.STALE && secrets == MemberState.STALE
                    && validPair(snapshots.activeApplication(), snapshots.activeSecrets(),
                    snapshots.activeApplication().generation().orElseThrow())
                    ? Decision.STALE : Decision.RECOVERY_REQUIRED;
        }
        if (application == MemberState.INVALID || secrets == MemberState.INVALID
                || applicationCandidate == SetupCandidateState.INVALID
                || secretCandidate == SetupCandidateState.INVALID) {
            return Decision.RECOVERY_REQUIRED;
        }
        return null;
    }

    private static boolean validBasePair(MigrationActivationCandidate candidate,
                                         MigrationActivationSnapshots snapshots,
                                         MemberState application, MemberState secrets) {
        if (application == MemberState.BASE && secrets == MemberState.BASE) {
            return validPair(snapshots.activeApplication(), snapshots.activeSecrets(), candidate.baseGeneration());
        }
        if (application == MemberState.TARGET && secrets == MemberState.BASE) {
            return validPair(snapshots.lastKnownGoodApplication(), snapshots.activeSecrets(),
                    candidate.baseGeneration());
        }
        if (application == MemberState.BASE && secrets == MemberState.TARGET) {
            return validPair(snapshots.activeApplication(), snapshots.lastKnownGoodSecrets(),
                    candidate.baseGeneration());
        }
        return validLastKnownGood(candidate, snapshots);
    }

    private static boolean validLastKnownGood(MigrationActivationCandidate candidate,
                                              MigrationActivationSnapshots snapshots) {
        return validPair(snapshots.lastKnownGoodApplication(), snapshots.lastKnownGoodSecrets(),
                candidate.baseGeneration());
    }

    private static boolean validPair(CandidateRead<ManagedApplicationConfig> application,
                                     CandidateRead<ManagedSecrets> secrets, String generation) {
        if (!hasGeneration(application, generation) || !hasGeneration(secrets, generation)) {
            return false;
        }
        try {
            new ManagedConfigurationBundle(application.value().orElseThrow(), secrets.value().orElseThrow());
            return true;
        } catch (IllegalArgumentException failure) {
            return false;
        }
    }

    private static <T> MemberState memberState(CandidateRead<T> active, T target,
                                               MigrationActivationCandidate candidate) {
        if (matches(active, target, candidate.generation())) {
            return MemberState.TARGET;
        }
        if (hasGeneration(active, candidate.baseGeneration())) {
            return MemberState.BASE;
        }
        return active.state() == CandidateState.VALID ? MemberState.STALE : MemberState.INVALID;
    }

    private static <T> SetupCandidateState candidateState(CandidateRead<T> read, T target, String generation) {
        if (read.state() == CandidateState.MISSING) {
            return SetupCandidateState.MISSING;
        }
        return matches(read, target, generation) ? SetupCandidateState.TARGET : SetupCandidateState.INVALID;
    }

    private static boolean hasGeneration(CandidateRead<?> read, String generation) {
        return read.state() == CandidateState.VALID && read.generation().filter(generation::equals).isPresent();
    }

    private static <T> boolean matches(CandidateRead<T> read, T expected, String generation) {
        return hasGeneration(read, generation) && read.value().filter(expected::equals).isPresent();
    }

    private static boolean sameSnapshot(CandidateRead<?> left, CandidateRead<?> right) {
        return left.state() == CandidateState.VALID && right.state() == CandidateState.VALID
                && left.generation().equals(right.generation()) && left.value().equals(right.value());
    }

    enum Decision {
        STAGE_APPLICATION, STAGE_SECRET, PROMOTE_APPLICATION, PROMOTE_SECRET,
        RESTORE_APPLICATION, RESTORE_SECRET, DISCARD_APPLICATION, DISCARD_SECRET,
        COMPLETE, STALE, RECOVERY_REQUIRED
    }

    private enum MemberState { BASE, TARGET, STALE, INVALID }

    private enum SetupCandidateState { MISSING, TARGET, INVALID }
}
