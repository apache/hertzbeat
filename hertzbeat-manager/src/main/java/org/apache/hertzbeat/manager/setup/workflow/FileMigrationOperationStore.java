/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;

/** Root-bound owner-only file adapter for the single active migration operation. */
public final class FileMigrationOperationStore implements MigrationOperationStore {

    static final String RELATIVE_PATH = "data/config/metadata-migration-operations";
    static final int HISTORY_LIMIT = 8;
    private static final String LOCK_PATH = "data/config/.metadata-migration-operations.lock";
    private static final int MAXIMUM_BYTES = 64 * 1024;
    private final Path installationRoot;
    private final Path operationFile;
    private final Publisher publisher;
    private final SecureSetupFileLock lock;
    private final MigrationOperationFileCodec codec = new MigrationOperationFileCodec();
    private final MigrationOperationCollectionPolicy collectionPolicy = new MigrationOperationCollectionPolicy();
    private final MigrationOperationTransitionPolicy transitionPolicy = new MigrationOperationTransitionPolicy();

    public FileMigrationOperationStore(Path installationRoot) {
        this(installationRoot, new MigrationOperationFilePublisher(normalize(installationRoot)));
    }

    FileMigrationOperationStore(Path installationRoot, Publisher publisher) {
        this.installationRoot = normalize(installationRoot);
        operationFile = this.installationRoot.resolve(RELATIVE_PATH);
        this.publisher = Objects.requireNonNull(publisher, "publisher");
        lock = new SecureSetupFileLock(this.installationRoot, LOCK_PATH);
    }

    @Override
    public MigrationOperationSnapshot create(MigrationOperationSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        if (snapshot.state() != MigrationOperationState.PENDING) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
        return locked(() -> {
            List<MigrationOperationSnapshot> snapshots = read();
            if (snapshots.stream().anyMatch(value -> !value.terminal())
                    || snapshots.stream().anyMatch(value -> value.operationId().equals(snapshot.operationId()))) {
                throw failure(SetupErrorCode.OPERATION_CONFLICT);
            }
            snapshots.add(snapshot);
            write(snapshots);
            return snapshot;
        });
    }

    /** Creates or confirms one fully equal PENDING snapshot under the store lock. */
    MigrationOperationSnapshot createOrConfirm(MigrationOperationSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        if (snapshot.state() != MigrationOperationState.PENDING) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
        return locked(() -> {
            List<MigrationOperationSnapshot> snapshots = read();
            for (MigrationOperationSnapshot current : snapshots) {
                if (current.operationId().equals(snapshot.operationId())) {
                    if (current.equals(snapshot)) {
                        writeAndConfirm(snapshots);
                        return snapshot;
                    }
                    throw failure(SetupErrorCode.OPERATION_CONFLICT);
                }
                if (!current.terminal()) {
                    throw failure(SetupErrorCode.OPERATION_CONFLICT);
                }
            }
            snapshots.add(snapshot);
            writeAndConfirm(snapshots);
            return snapshot;
        });
    }

    @Override
    public Optional<MigrationOperationSnapshot> find(String operationId) {
        requireSafeId(operationId);
        return locked(() -> read().stream()
                .filter(snapshot -> snapshot.operationId().equals(operationId)).findFirst());
    }

    /** Selects one startup record only when no other operation still owns migration progress. */
    Optional<MigrationOperationSnapshot> selectForStartup(String operationId) {
        requireSafeId(operationId);
        return locked(() -> {
            List<MigrationOperationSnapshot> snapshots = read();
            if (snapshots.stream().anyMatch(snapshot -> !snapshot.terminal()
                    && !snapshot.operationId().equals(operationId))) {
                throw failure(SetupErrorCode.OPERATION_CONFLICT);
            }
            return snapshots.stream()
                    .filter(snapshot -> snapshot.operationId().equals(operationId))
                    .findFirst();
        });
    }

    @Override
    public List<MigrationOperationSnapshot> history() {
        return locked(() -> List.copyOf(read()));
    }

    @Override
    public MigrationOperationSnapshot compareAndTransition(
            String operationId, MigrationOperationState expectedState, MigrationOperationSnapshot replacement) {
        requireSafeId(operationId);
        Objects.requireNonNull(expectedState, "expectedState");
        Objects.requireNonNull(replacement, "replacement");
        return locked(() -> transition(read(), operationId, expectedState, replacement));
    }

    /** Transitions or confirms one fully equal replacement under the store lock. */
    MigrationOperationSnapshot compareAndTransitionOrConfirm(
            String operationId, MigrationOperationState expectedState, MigrationOperationSnapshot replacement) {
        compareAndTransitionOrConfirmDisposition(operationId, expectedState, replacement);
        return replacement;
    }

    /** Transitions or confirms exact state while reporting which action won under the store lock. */
    ExactTransitionDisposition compareAndTransitionOrConfirmDisposition(
            String operationId, MigrationOperationState expectedState, MigrationOperationSnapshot replacement) {
        requireSafeId(operationId);
        Objects.requireNonNull(expectedState, "expectedState");
        Objects.requireNonNull(replacement, "replacement");
        return locked(() -> transitionOrConfirm(read(), operationId, expectedState, replacement));
    }

    private MigrationOperationSnapshot transition(
            List<MigrationOperationSnapshot> snapshots, String operationId,
            MigrationOperationState expectedState, MigrationOperationSnapshot replacement) {
        for (int index = 0; index < snapshots.size(); index++) {
            MigrationOperationSnapshot current = snapshots.get(index);
            if (current.operationId().equals(operationId)) {
                if (current.state() != expectedState) {
                    throw failure(SetupErrorCode.OPERATION_CONFLICT);
                }
                transitionPolicy.requireAllowed(current, replacement);
                snapshots.set(index, replacement);
                trim(snapshots);
                write(snapshots);
                return replacement;
            }
        }
        throw failure(SetupErrorCode.OPERATION_NOT_FOUND);
    }

    private ExactTransitionDisposition transitionOrConfirm(
            List<MigrationOperationSnapshot> snapshots, String operationId,
            MigrationOperationState expectedState, MigrationOperationSnapshot replacement) {
        for (int index = 0; index < snapshots.size(); index++) {
            MigrationOperationSnapshot current = snapshots.get(index);
            if (current.operationId().equals(operationId)) {
                if (current.equals(replacement)) {
                    writeAndConfirm(snapshots);
                    return ExactTransitionDisposition.ALREADY_CONFIRMED;
                }
                if (current.state() != expectedState) {
                    throw failure(SetupErrorCode.OPERATION_CONFLICT);
                }
                transitionPolicy.requireAllowed(current, replacement);
                snapshots.set(index, replacement);
                trim(snapshots);
                writeAndConfirm(snapshots);
                return ExactTransitionDisposition.TRANSITIONED;
            }
        }
        throw failure(SetupErrorCode.OPERATION_NOT_FOUND);
    }

    private List<MigrationOperationSnapshot> read() {
        if (!Files.exists(operationFile, LinkOption.NOFOLLOW_LINKS)) {
            return new ArrayList<>();
        }
        byte[] encoded = null;
        try {
            encoded = SecureSetupFile.readOwnerOnlyWithoutLinks(
                    installationRoot, operationFile, MAXIMUM_BYTES);
            return new ArrayList<>(codec.decode(encoded));
        } catch (IOException | RuntimeException invalid) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        } finally {
            if (encoded != null) {
                Arrays.fill(encoded, (byte) 0);
            }
        }
    }

    private void write(List<MigrationOperationSnapshot> snapshots) {
        collectionPolicy.validate(snapshots);
        byte[] encoded = codec.encode(snapshots);
        try {
            publisher.publish(operationFile, encoded);
        } catch (CommittedSetupFileDurabilityException uncertain) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        } catch (IOException failure) {
            throw failure(SetupErrorCode.CONFIG_WRITE_FAILED);
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
    }

    private void writeAndConfirm(List<MigrationOperationSnapshot> snapshots) {
        collectionPolicy.validate(snapshots);
        byte[] encoded = codec.encode(snapshots);
        try {
            publisher.publish(operationFile, encoded);
        } catch (CommittedSetupFileDurabilityException uncertain) {
            confirmAndRepublish(snapshots, encoded);
        } catch (IOException failure) {
            throw failure(SetupErrorCode.CONFIG_WRITE_FAILED);
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
    }

    private void confirmAndRepublish(List<MigrationOperationSnapshot> intended, byte[] encoded) {
        List<MigrationOperationSnapshot> persisted = read();
        if (!persisted.equals(intended)) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        try {
            publisher.publish(operationFile, encoded);
        } catch (IOException failure) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private void trim(List<MigrationOperationSnapshot> snapshots) {
        while (snapshots.stream().filter(MigrationOperationSnapshot::terminal).count() > HISTORY_LIMIT) {
            int oldestTerminal = -1;
            for (int index = 0; index < snapshots.size() && oldestTerminal < 0; index++) {
                if (snapshots.get(index).terminal()) {
                    oldestTerminal = index;
                }
            }
            snapshots.remove(oldestTerminal);
        }
    }

    private <T> T locked(SecureSetupFileLock.IoOperation<T> operation) {
        try {
            return lock.execute(operation);
        } catch (MigrationOperationStoreException failure) {
            throw failure;
        } catch (IOException failure) {
            throw failure(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private void requireSafeId(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw failure(SetupErrorCode.INVALID_REQUEST);
        }
    }

    private MigrationOperationStoreException failure(SetupErrorCode errorCode) {
        return new MigrationOperationStoreException(errorCode);
    }

    private static Path normalize(Path root) {
        return Objects.requireNonNull(root, "installationRoot").toAbsolutePath().normalize();
    }

    @FunctionalInterface
    interface Publisher {
        void publish(Path target, byte[] content) throws IOException;
    }

    enum ExactTransitionDisposition { TRANSITIONED, ALREADY_CONFIRMED }
}
