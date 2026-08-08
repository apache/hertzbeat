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
import java.util.Optional;
import java.util.UUID;

/** Coordinates the application and secret snapshots as one locked, recoverable operation. */
public final class ManagedConfigurationTransaction {

    private static final String LOCK_FILE = ".managed-config.lock";

    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;
    private final Path lockFile;
    private final ManagedConfigurationRecovery recovery;
    private final RecoveryFailureReporter reporter;

    /** Creates the production file transaction rooted at the HertzBeat installation. */
    public ManagedConfigurationTransaction(Path installationRoot) {
        this(new FileManagedApplicationConfigStore(installationRoot),
                new FileManagedSecretStore(installationRoot), installationRoot,
                new LoggingRecoveryFailureReporter());
    }

    ManagedConfigurationTransaction(
            ManagedApplicationConfigStore applicationStore,
            ManagedSecretStore secretStore,
            Path installationRoot) {
        this(applicationStore, secretStore, installationRoot, new LoggingRecoveryFailureReporter());
    }

    ManagedConfigurationTransaction(
            ManagedApplicationConfigStore applicationStore,
            ManagedSecretStore secretStore,
            Path installationRoot,
            RecoveryFailureReporter reporter) {
        this.applicationStore = Objects.requireNonNull(applicationStore, "applicationStore");
        this.secretStore = Objects.requireNonNull(secretStore, "secretStore");
        this.reporter = Objects.requireNonNull(reporter, "reporter");
        this.recovery = new ManagedConfigurationRecovery(applicationStore, secretStore, reporter);
        Path root = Objects.requireNonNull(installationRoot, "installationRoot")
                .toAbsolutePath().normalize();
        this.lockFile = root.resolve("data/config").resolve(LOCK_FILE);
    }

    /** Stages and publishes one validated configuration generation under the process lock. */
    public Outcome apply(ManagedConfigurationBundle bundle) throws IOException {
        Objects.requireNonNull(bundle, "bundle");
        return withLock(() -> applyLocked(bundle));
    }

    /** Rewrites the same two-file aggregate while preserving required settings and secrets. */
    public Outcome applyOptions(ManagedOptionalConfiguration options,
                                Optional<SecretValue> mailPassword) throws IOException {
        Objects.requireNonNull(options, "options");
        Objects.requireNonNull(mailPassword, "mailPassword");
        return withLock(() -> new ManagedOptionsUpdate(applicationStore, secretStore)
                .apply(options, mailPassword, this::applyLocked));
    }

    /** Converges interrupted publication only when an explicit complete generation pair exists. */
    public Outcome recover() throws IOException {
        return withLock(recovery::recover);
    }

    private Outcome applyLocked(ManagedConfigurationBundle bundle) throws IOException {
        CandidateRead<ManagedApplicationConfig> previousApplication = applicationStore.readActive();
        CandidateRead<ManagedSecrets> previousSecrets = secretStore.readActive();
        try {
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
            try {
                if (!sameGeneration(applicationCandidate, secretCandidate, generation)) {
                    return recovery.discardCandidates() ? Outcome.NOT_APPLIED : Outcome.RECOVERY_REQUIRED;
                }
            } finally {
                close(secretCandidate);
            }
            try {
                applicationStore.promoteCandidate(bundle.application(), generation);
            } catch (IOException failure) {
                RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                        RecoveryFailureReporter.Store.APPLICATION, failure);
                return recovery.rollback(previousApplication, previousSecrets);
            }
            try {
                secretStore.promoteCandidate(bundle.secrets(), generation);
            } catch (IOException failure) {
                RecoveryFailureReporter.reportSafely(reporter, RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                        RecoveryFailureReporter.Store.SECRET, failure);
                return recovery.rollback(previousApplication, previousSecrets);
            }
            if (!matchesExpectedActive(bundle, generation)) {
                return recovery.rollback(previousApplication, previousSecrets);
            }
            return Outcome.APPLIED;
        } finally {
            close(previousSecrets);
        }
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
        try {
            return sameGeneration(application, secrets, generation)
                    && application.value().filter(bundle.application()::equals).isPresent()
                    && secrets.value().filter(bundle.secrets()::equals).isPresent();
        } finally {
            close(secrets);
        }
    }

    static boolean formsPair(CandidateRead<?> left, CandidateRead<?> right) {
        if (left.state() == CandidateState.MISSING && right.state() == CandidateState.MISSING) {
            return true;
        }
        return validPair(left, right);
    }

    static boolean validPair(CandidateRead<?> left, CandidateRead<?> right) {
        return left.state() == CandidateState.VALID
                && right.state() == CandidateState.VALID
                && left.generation().equals(right.generation());
    }

    static void close(CandidateRead<ManagedSecrets> secrets) {
        secrets.value().ifPresent(ManagedSecrets::close);
    }

    @FunctionalInterface
    private interface LockedOperation {
        Outcome run() throws IOException;
    }

    @FunctionalInterface
    interface Publisher {
        Outcome publish(ManagedConfigurationBundle bundle) throws IOException;
    }

    /** Stable outcome without exception details or secret content. */
    public enum Outcome {
        APPLIED,
        NOT_APPLIED,
        ROLLED_BACK,
        RECOVERY_REQUIRED
    }
}
