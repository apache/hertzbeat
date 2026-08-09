/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;

/** Locked public boundary for migration-owned managed-configuration candidates. */
public final class ManagedMigrationConfigurationTransaction {

    private static final Pattern GENERATION = Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{0,63}");
    private static final Pattern IDENTITY_HASH = Pattern.compile("[0-9a-f]{64}");

    private final ManagedConfigurationLock lock;
    private final MigrationCandidateStore store;

    /** Creates the production migration candidate transaction. */
    public ManagedMigrationConfigurationTransaction(Path installationRoot) {
        lock = new ManagedConfigurationLock(installationRoot);
        store = new MigrationCandidateStore(installationRoot);
    }

    /** Stages the exact candidate or fails with a stable, secret-free error. */
    public CandidateRef stage(String operationId, String candidateGeneration, String baseGeneration,
                              String targetIdentityHash, ManagedConfigurationBundle bundle) throws IOException {
        StageOutcome outcome = stageOutcome(
                operationId, candidateGeneration, baseGeneration, targetIdentityHash, bundle);
        if (outcome != StageOutcome.STAGED && outcome != StageOutcome.ALREADY_STAGED) {
            throw new IOException("Managed migration candidate was not staged: " + outcome);
        }
        return new CandidateRef(operationId, candidateGeneration);
    }

    /** Stages without changing active, last-known-good, or setup-owned candidates. */
    public StageOutcome stageOutcome(String operationId, String candidateGeneration, String baseGeneration,
                                     String targetIdentityHash, ManagedConfigurationBundle bundle)
            throws IOException {
        CandidateRef reference = new CandidateRef(operationId, candidateGeneration);
        requireGeneration(baseGeneration, "base generation");
        requireIdentityHash(targetIdentityHash);
        Objects.requireNonNull(bundle, "bundle");
        return lock.execute(() -> store.stage(reference, baseGeneration, targetIdentityHash, bundle));
    }

    /** Returns secret-free exact metadata; corrupt or partial candidates fail closed. */
    public Inspection inspect(CandidateRef reference) throws IOException {
        Objects.requireNonNull(reference, "reference");
        return lock.execute(() -> store.inspect(reference));
    }

    /** Provides synchronous, non-retaining access and clears decoded secrets on every exit. */
    public <T> T readExact(CandidateRef reference, CandidateReader<T> reader) throws IOException {
        Objects.requireNonNull(reference, "reference");
        Objects.requireNonNull(reader, "reader");
        return lock.execute(() -> store.readExact(reference, reader));
    }

    /** Removes only the operation-and-generation scoped candidate named by the reference. */
    public DiscardOutcome discardExact(CandidateRef reference) throws IOException {
        Objects.requireNonNull(reference, "reference");
        return lock.execute(() -> store.discardExact(reference));
    }

    static void requireGeneration(String value, String label) {
        Objects.requireNonNull(value, label);
        if (!GENERATION.matcher(value).matches()) {
            throw new IllegalArgumentException("Invalid managed migration " + label);
        }
    }

    static void requireIdentityHash(String value) {
        Objects.requireNonNull(value, "targetIdentityHash");
        if (!IDENTITY_HASH.matcher(value).matches()) {
            throw new IllegalArgumentException("Invalid managed migration target identity");
        }
    }

    /** Exact public handle; contains neither configuration paths nor target credentials. */
    public record CandidateRef(String operationId, String candidateGeneration) {
        public CandidateRef {
            if (!OperationIdValidator.isSafe(operationId)) {
                throw new IllegalArgumentException("Invalid managed migration operation id");
            }
            requireGeneration(candidateGeneration, "candidate generation");
        }
    }

    /** Secret-free persisted candidate state and exact base/target identity metadata. */
    public record Inspection(CandidateState state, Optional<String> baseGeneration,
                             Optional<String> targetIdentityHash) {
        public Inspection {
            Objects.requireNonNull(state, "state");
            Objects.requireNonNull(baseGeneration, "baseGeneration");
            Objects.requireNonNull(targetIdentityHash, "targetIdentityHash");
            if ((state == CandidateState.READY) != baseGeneration.isPresent()
                    || baseGeneration.isPresent() != targetIdentityHash.isPresent()) {
                throw new IllegalArgumentException("Only a ready candidate exposes exact metadata");
            }
        }

        @Override
        public String toString() {
            return "Inspection[state=" + state + ", exactMetadata=" + baseGeneration.isPresent() + "]";
        }
    }

    /** Persisted completeness state. */
    public enum CandidateState { MISSING, READY, RECOVERY_REQUIRED }

    /** Stable staging result without filesystem or configuration details. */
    public enum StageOutcome { STAGED, ALREADY_STAGED, STALE, RECOVERY_REQUIRED }

    /** Stable exact-discard result. */
    public enum DiscardOutcome { DISCARDED, NOT_FOUND }

    /** Synchronous, non-retaining access to a decoded candidate bundle. */
    @FunctionalInterface
    public interface CandidateReader<T> {
        T read(ManagedConfigurationBundle bundle);
    }
}
