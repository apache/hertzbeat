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

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Objects;
import java.util.UUID;

/** Coordinates the application and secret snapshots as one locked, recoverable operation. */
public final class ManagedConfigurationTransaction {

    private static final String LOCK_FILE = ".managed-config.lock";

    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;
    private final Path lockFile;

    /** Creates the production file transaction rooted at the HertzBeat installation. */
    public ManagedConfigurationTransaction(Path installationRoot) {
        this(new FileManagedApplicationConfigStore(installationRoot),
                new FileManagedSecretStore(installationRoot), installationRoot);
    }

    ManagedConfigurationTransaction(
            ManagedApplicationConfigStore applicationStore,
            ManagedSecretStore secretStore,
            Path installationRoot) {
        this.applicationStore = Objects.requireNonNull(applicationStore, "applicationStore");
        this.secretStore = Objects.requireNonNull(secretStore, "secretStore");
        Path root = Objects.requireNonNull(installationRoot, "installationRoot")
                .toAbsolutePath().normalize();
        this.lockFile = root.resolve("data/config").resolve(LOCK_FILE);
    }

    /** Stages and publishes one validated configuration generation under the process lock. */
    public Outcome apply(ManagedConfigurationBundle bundle) throws IOException {
        Objects.requireNonNull(bundle, "bundle");
        return withLock(() -> applyLocked(bundle));
    }

    /** Converges interrupted publication only when an explicit complete generation pair exists. */
    public Outcome recover() throws IOException {
        return withLock(this::recoverLocked);
    }

    private Outcome applyLocked(ManagedConfigurationBundle bundle) throws IOException {
        CandidateRead<ManagedApplicationConfig> previousApplication = applicationStore.readActive();
        CandidateRead<ManagedSecrets> previousSecrets = secretStore.readActive();
        if (!formsPair(previousApplication, previousSecrets)) {
            return Outcome.RECOVERY_REQUIRED;
        }
        String generation = UUID.randomUUID().toString();
        try {
            applicationStore.stageCandidate(bundle.application(), generation);
            secretStore.stageCandidate(bundle.secrets(), generation);
        } catch (IOException failure) {
            discardCandidate(applicationStore, failure);
            discardCandidate(secretStore, failure);
            throw failure;
        }
        CandidateRead<ManagedApplicationConfig> applicationCandidate = applicationStore.readCandidate();
        CandidateRead<ManagedSecrets> secretCandidate = secretStore.readCandidate();
        if (!sameGeneration(applicationCandidate, secretCandidate, generation)) {
            return discardCandidates() ? Outcome.NOT_APPLIED : Outcome.RECOVERY_REQUIRED;
        }
        try {
            applicationStore.promoteCandidate(bundle.application(), generation);
            secretStore.promoteCandidate(bundle.secrets(), generation);
            if (!matchesExpectedActive(bundle, generation)) {
                return rollbackAfterPromotionFailure(previousApplication, previousSecrets);
            }
            return Outcome.APPLIED;
        } catch (IOException ignored) {
            return rollbackAfterPromotionFailure(previousApplication, previousSecrets);
        }
    }

    private Outcome rollbackAfterPromotionFailure(
            CandidateRead<ManagedApplicationConfig> previousApplication,
            CandidateRead<ManagedSecrets> previousSecrets) {
        boolean applicationRestored = restoreApplication(previousApplication);
        boolean secretsRestored = restoreSecrets(previousSecrets);
        if (!applicationRestored || !secretsRestored) {
            return Outcome.RECOVERY_REQUIRED;
        }
        return discardCandidates() ? Outcome.ROLLED_BACK : Outcome.RECOVERY_REQUIRED;
    }

    private Outcome recoverLocked() {
        Snapshots<ManagedApplicationConfig> applications = new Snapshots<>(
                applicationStore.readActive(), applicationStore.readCandidate(),
                applicationStore.readLastKnownGood());
        Snapshots<ManagedSecrets> secrets = new Snapshots<>(
                secretStore.readActive(), secretStore.readCandidate(), secretStore.readLastKnownGood());

        if (formsPair(applications.active(), secrets.active())) {
            boolean interrupted = applications.candidate().state() != CandidateState.MISSING
                    || secrets.candidate().state() != CandidateState.MISSING;
            return discardCandidates()
                    ? (interrupted ? Outcome.ROLLED_BACK : Outcome.APPLIED)
                    : Outcome.RECOVERY_REQUIRED;
        }

        return recoverExplicitPair(applications, secrets);
    }

    private Outcome recoverExplicitPair(
            Snapshots<ManagedApplicationConfig> applications, Snapshots<ManagedSecrets> secrets) {
        // Crash-state invariant (no generation ordering is inferred): active+candidate and
        // candidate+active are the only split-promotion roll-forwards; LKG participates only
        // in a complete same-generation rollback pair. Any other shape remains recovery-required.
        if (validPair(applications.active(), secrets.candidate())) {
            return finishRecovery(promoteSecrets(secrets.candidate()), Outcome.APPLIED);
        }
        if (validPair(applications.candidate(), secrets.active())) {
            return finishRecovery(promoteApplication(applications.candidate()), Outcome.APPLIED);
        }
        if (validPair(applications.lastKnownGood(), secrets.active())) {
            return finishRecovery(
                    restoreApplication(applications.lastKnownGood()), Outcome.ROLLED_BACK);
        }
        if (validPair(applications.active(), secrets.lastKnownGood())) {
            return finishRecovery(
                    restoreSecrets(secrets.lastKnownGood()), Outcome.ROLLED_BACK);
        }
        if (validPair(applications.lastKnownGood(), secrets.lastKnownGood())) {
            return finishRecovery(restoreBoth(
                    applications.lastKnownGood(), secrets.lastKnownGood()), Outcome.ROLLED_BACK);
        }
        return Outcome.RECOVERY_REQUIRED;
    }

    private Outcome finishRecovery(boolean recovered, Outcome outcome) {
        boolean candidatesDiscarded = discardCandidates();
        return recovered && candidatesDiscarded ? outcome : Outcome.RECOVERY_REQUIRED;
    }

    private boolean restoreBoth(
            CandidateRead<ManagedApplicationConfig> application,
            CandidateRead<ManagedSecrets> secrets) {
        boolean applicationRestored = restoreApplication(application);
        boolean secretsRestored = restoreSecrets(secrets);
        return applicationRestored && secretsRestored;
    }

    private boolean promoteApplication(CandidateRead<ManagedApplicationConfig> candidate) {
        try {
            applicationStore.promoteCandidate(
                    candidate.value().orElseThrow(), candidate.generation().orElseThrow());
            return true;
        } catch (IOException failure) {
            return false;
        }
    }

    private boolean promoteSecrets(CandidateRead<ManagedSecrets> candidate) {
        try {
            secretStore.promoteCandidate(
                    candidate.value().orElseThrow(), candidate.generation().orElseThrow());
            return true;
        } catch (IOException failure) {
            return false;
        }
    }

    private boolean restoreApplication(CandidateRead<ManagedApplicationConfig> previous) {
        try {
            applicationStore.restoreActive(previous);
            return true;
        } catch (IOException failure) {
            return false;
        }
    }

    private boolean restoreSecrets(CandidateRead<ManagedSecrets> previous) {
        try {
            secretStore.restoreActive(previous);
            return true;
        } catch (IOException failure) {
            return false;
        }
    }

    private boolean discardCandidates() {
        boolean discarded = true;
        try {
            applicationStore.discardCandidate();
        } catch (IOException failure) {
            discarded = false;
        }
        try {
            secretStore.discardCandidate();
        } catch (IOException failure) {
            discarded = false;
        }
        return discarded;
    }

    private Outcome withLock(LockedOperation operation) throws IOException {
        Path directory = lockFile.getParent();
        if (Files.isSymbolicLink(lockFile) || Files.isSymbolicLink(directory)
                || Files.isSymbolicLink(directory.getParent())
                || Files.isSymbolicLink(directory.getParent().getParent())) {
            throw new IOException("Managed configuration lock is unavailable");
        }
        Files.createDirectories(directory);
        try (FileChannel channel = FileChannel.open(lockFile,
                StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                FileLock lock = tryLock(channel)) {
            if (lock == null) {
                throw new IOException("Managed configuration operation is already in progress");
            }
            return operation.run();
        }
    }

    private static FileLock tryLock(FileChannel channel) throws IOException {
        try {
            return channel.tryLock();
        } catch (OverlappingFileLockException failure) {
            return null;
        }
    }

    private static void discardCandidate(ManagedApplicationConfigStore store, IOException failure) {
        try {
            store.discardCandidate();
        } catch (IOException cleanupFailure) {
            failure.addSuppressed(cleanupFailure);
        }
    }

    private static void discardCandidate(ManagedSecretStore store, IOException failure) {
        try {
            store.discardCandidate();
        } catch (IOException cleanupFailure) {
            failure.addSuppressed(cleanupFailure);
        }
    }

    private static boolean sameGeneration(
            CandidateRead<?> left, CandidateRead<?> right, String generation) {
        return validPair(left, right) && left.generation().filter(generation::equals).isPresent();
    }

    private boolean matchesExpectedActive(ManagedConfigurationBundle bundle, String generation) {
        CandidateRead<ManagedApplicationConfig> application = applicationStore.readActive();
        CandidateRead<ManagedSecrets> secrets = secretStore.readActive();
        return sameGeneration(application, secrets, generation)
                && application.value().filter(bundle.application()::equals).isPresent()
                && secrets.value().filter(bundle.secrets()::equals).isPresent();
    }

    private static boolean formsPair(CandidateRead<?> left, CandidateRead<?> right) {
        if (left.state() == CandidateState.MISSING && right.state() == CandidateState.MISSING) {
            return true;
        }
        return validPair(left, right);
    }

    private static boolean validPair(CandidateRead<?> left, CandidateRead<?> right) {
        return left.state() == CandidateState.VALID
                && right.state() == CandidateState.VALID
                && left.generation().equals(right.generation());
    }

    private record Snapshots<T>(CandidateRead<T> active, CandidateRead<T> candidate,
                                CandidateRead<T> lastKnownGood) {
    }

    @FunctionalInterface
    private interface LockedOperation {
        Outcome run() throws IOException;
    }

    /** Stable outcome without exception details or secret content. */
    public enum Outcome {
        APPLIED,
        NOT_APPLIED,
        ROLLED_BACK,
        RECOVERY_REQUIRED
    }
}
