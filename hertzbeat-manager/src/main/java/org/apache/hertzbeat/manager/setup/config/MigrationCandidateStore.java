/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Root-bound file store for generation-scoped, owner-only migration candidates. */
final class MigrationCandidateStore {

    private static final int MAXIMUM_APPLICATION_BYTES = 1024 * 1024;
    private static final int MAXIMUM_SECRET_BYTES = 256 * 1024;
    private static final int MAXIMUM_MANIFEST_BYTES = 1024;

    private final Path root;
    private final Path candidateRoot;
    private final ManagedApplicationConfigStore applicationStore;
    private final ManagedSecretStore secretStore;
    private final MigrationCandidateFileIo fileIo;
    private final ApplicationConfigDocumentCodec applicationCodec = new ApplicationConfigDocumentCodec();
    private final SecretConfigDocumentCodec secretCodec = new SecretConfigDocumentCodec();
    private final MigrationCandidateManifestCodec manifestCodec = new MigrationCandidateManifestCodec();

    MigrationCandidateStore(Path installationRoot) {
        this(installationRoot, null);
    }

    MigrationCandidateStore(Path installationRoot, MigrationCandidateFileIo fileIo) {
        root = prepareRoot(installationRoot);
        candidateRoot = root.resolve("data/config/migration-candidates");
        applicationStore = new FileManagedApplicationConfigStore(root);
        secretStore = new FileManagedSecretStore(root);
        this.fileIo = fileIo == null ? new SecureMigrationCandidateFileIo(root) : fileIo;
    }

    ManagedMigrationConfigurationTransaction.StageOutcome stage(
            ManagedMigrationConfigurationTransaction.CandidateRef reference, String baseGeneration,
            String targetIdentityHash, ManagedConfigurationBundle bundle) throws IOException {
        boolean confirmExisting = false;
        try (MigrationCandidateMaterial existing = read(reference)) {
            if (existing.inspection().state() == ManagedMigrationConfigurationTransaction.CandidateState.READY) {
                boolean same = existing.manifest().filter(manifest -> manifest.baseGeneration().equals(baseGeneration)
                                && manifest.targetIdentityHash().equals(targetIdentityHash)).isPresent()
                        && existing.application().filter(bundle.application()::equals).isPresent()
                        && existing.secrets().filter(bundle.secrets()::equals).isPresent();
                if (!same) {
                    return ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
                }
                confirmExisting = true;
            }
            if (!confirmExisting && existing.inspection().state()
                    != ManagedMigrationConfigurationTransaction.CandidateState.MISSING) {
                return ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
            }
        }
        if (confirmExisting) {
            return confirmReady(reference);
        }
        ActivePairState activePair = activePairState(baseGeneration);
        if (activePair != ActivePairState.MATCH) {
            return activePair == ActivePairState.STALE
                    ? ManagedMigrationConfigurationTransaction.StageOutcome.STALE
                    : ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
        }
        CandidatePaths paths = paths(reference);
        byte[] application = applicationCodec.encode(bundle.application(), reference.candidateGeneration());
        byte[] secrets = secretCodec.encode(bundle.secrets(), reference.candidateGeneration());
        byte[] manifest = manifestCodec.encode(new MigrationCandidateManifest(
                reference.operationId(), reference.candidateGeneration(), baseGeneration, targetIdentityHash));
        try {
            fileIo.publish(paths.application(), application);
            fileIo.publish(paths.secrets(), secrets);
            fileIo.publish(paths.manifest(), manifest);
            boolean ready;
            try (MigrationCandidateMaterial staged = read(reference)) {
                ready = staged.inspection().state()
                        == ManagedMigrationConfigurationTransaction.CandidateState.READY;
            }
            return ready ? confirmReady(reference, ManagedMigrationConfigurationTransaction.StageOutcome.STAGED)
                    : ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
        } catch (CommittedSetupFileDurabilityException uncertain) {
            return ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
        } finally {
            clear(application);
            clear(secrets);
            clear(manifest);
        }
    }

    private ManagedMigrationConfigurationTransaction.StageOutcome confirmReady(
            ManagedMigrationConfigurationTransaction.CandidateRef reference) {
        return confirmReady(reference, ManagedMigrationConfigurationTransaction.StageOutcome.ALREADY_STAGED);
    }

    private ManagedMigrationConfigurationTransaction.StageOutcome confirmReady(
            ManagedMigrationConfigurationTransaction.CandidateRef reference,
            ManagedMigrationConfigurationTransaction.StageOutcome confirmedOutcome) {
        try {
            fileIo.confirmDurability(paths(reference).manifest());
            return confirmedOutcome;
        } catch (IOException failure) {
            return ManagedMigrationConfigurationTransaction.StageOutcome.RECOVERY_REQUIRED;
        }
    }

    ManagedMigrationConfigurationTransaction.Inspection inspect(
            ManagedMigrationConfigurationTransaction.CandidateRef reference) {
        try (MigrationCandidateMaterial material = read(reference)) {
            return material.inspection();
        }
    }

    <T> T readExact(ManagedMigrationConfigurationTransaction.CandidateRef reference,
                    ManagedMigrationConfigurationTransaction.CandidateReader<T> reader) throws IOException {
        try (MigrationCandidateMaterial material = read(reference)) {
            if (material.inspection().state() != ManagedMigrationConfigurationTransaction.CandidateState.READY) {
                throw new IOException("Managed migration candidate is not ready");
            }
            ManagedConfigurationBundle bundle = new ManagedConfigurationBundle(
                    material.application().orElseThrow(), material.secrets().orElseThrow());
            return reader.read(bundle);
        }
    }

    <T> T readExact(
            ManagedMigrationConfigurationTransaction.CandidateRef reference,
            String expectedTargetIdentityHash,
            ManagedMigrationConfigurationTransaction.CandidateReader<T> reader) throws IOException {
        try (MigrationCandidateMaterial material = read(reference)) {
            ManagedMigrationConfigurationTransaction.Inspection inspection = material.inspection();
            if (inspection.state() != ManagedMigrationConfigurationTransaction.CandidateState.READY
                    || !inspection.targetIdentityHash().orElseThrow()
                            .equals(expectedTargetIdentityHash)) {
                throw new IOException("Managed migration candidate identity does not match");
            }
            ManagedConfigurationBundle bundle = new ManagedConfigurationBundle(
                    material.application().orElseThrow(), material.secrets().orElseThrow());
            return reader.read(bundle);
        }
    }

    <T> T withMaterial(ManagedMigrationConfigurationTransaction.CandidateRef reference,
                       MaterialReader<T> reader) {
        try (MigrationCandidateMaterial material = read(reference)) {
            return reader.read(material);
        }
    }

    ManagedMigrationConfigurationTransaction.DiscardOutcome discardExact(
            ManagedMigrationConfigurationTransaction.CandidateRef reference) throws IOException {
        CandidatePaths paths = paths(reference);
        EntryState application = entryState(paths.application());
        EntryState secrets = entryState(paths.secrets());
        EntryState manifest = entryState(paths.manifest());
        if (application == EntryState.UNSAFE || secrets == EntryState.UNSAFE || manifest == EntryState.UNSAFE) {
            throw new IOException("Managed migration candidate is unsafe");
        }
        if (application == EntryState.MISSING && secrets == EntryState.MISSING && manifest == EntryState.MISSING) {
            return ManagedMigrationConfigurationTransaction.DiscardOutcome.NOT_FOUND;
        }
        delete(paths.manifest());
        delete(paths.secrets());
        delete(paths.application());
        return ManagedMigrationConfigurationTransaction.DiscardOutcome.DISCARDED;
    }

    private ActivePairState activePairState(String baseGeneration) {
        CandidateRead<ManagedApplicationConfig> application = applicationStore.readActive();
        CandidateRead<ManagedSecrets> secrets = secretStore.readActive();
        try {
            if (!ManagedConfigurationTransaction.validPair(application, secrets)) {
                return ActivePairState.RECOVERY_REQUIRED;
            }
            try {
                new ManagedConfigurationBundle(
                        application.value().orElseThrow(), secrets.value().orElseThrow());
            } catch (IllegalArgumentException failure) {
                return ActivePairState.RECOVERY_REQUIRED;
            }
            return application.generation().filter(baseGeneration::equals).isPresent()
                    ? ActivePairState.MATCH : ActivePairState.STALE;
        } finally {
            ManagedConfigurationTransaction.close(secrets);
        }
    }

    private MigrationCandidateMaterial read(ManagedMigrationConfigurationTransaction.CandidateRef reference) {
        CandidatePaths paths = paths(reference);
        EntryState application = entryState(paths.application());
        EntryState secrets = entryState(paths.secrets());
        EntryState manifest = entryState(paths.manifest());
        if (application == EntryState.UNSAFE || secrets == EntryState.UNSAFE || manifest == EntryState.UNSAFE) {
            return MigrationCandidateMaterial.recoveryRequired();
        }
        if (application == EntryState.MISSING && secrets == EntryState.MISSING && manifest == EntryState.MISSING) {
            return MigrationCandidateMaterial.missing();
        }
        if (application != EntryState.PRESENT || secrets != EntryState.PRESENT || manifest != EntryState.PRESENT) {
            return MigrationCandidateMaterial.recoveryRequired();
        }
        return decode(reference, paths);
    }

    private MigrationCandidateMaterial decode(ManagedMigrationConfigurationTransaction.CandidateRef reference,
                                              CandidatePaths paths) {
        byte[] applicationBytes = null;
        byte[] secretBytes = null;
        byte[] manifestBytes = null;
        ManagedDocumentCodec.Decoded<ManagedSecrets> decodedSecrets = null;
        try {
            applicationBytes = SecureSetupFile.readOwnerOnlyWithoutLinks(
                    root, paths.application(), MAXIMUM_APPLICATION_BYTES);
            secretBytes = SecureSetupFile.readOwnerOnlyWithoutLinks(root, paths.secrets(), MAXIMUM_SECRET_BYTES);
            manifestBytes = SecureSetupFile.readOwnerOnlyWithoutLinks(root, paths.manifest(), MAXIMUM_MANIFEST_BYTES);
            ManagedDocumentCodec.Decoded<ManagedApplicationConfig> decodedApplication =
                    applicationCodec.decode(applicationBytes);
            decodedSecrets = secretCodec.decode(secretBytes);
            MigrationCandidateManifest manifest = manifestCodec.decode(manifestBytes);
            if (!manifest.operationId().equals(reference.operationId())
                    || !manifest.candidateGeneration().equals(reference.candidateGeneration())
                    || !decodedApplication.generation().equals(reference.candidateGeneration())
                    || !decodedSecrets.generation().equals(reference.candidateGeneration())) {
                return MigrationCandidateMaterial.recoveryRequired();
            }
            ManagedSecrets transferred = decodedSecrets.value();
            new ManagedConfigurationBundle(decodedApplication.value(), transferred);
            decodedSecrets = null;
            return MigrationCandidateMaterial.ready(manifest, decodedApplication.value(), transferred);
        } catch (IOException | ManagedDocumentCodec.DocumentException | IllegalArgumentException failure) {
            return MigrationCandidateMaterial.recoveryRequired();
        } finally {
            clear(applicationBytes);
            clear(secretBytes);
            clear(manifestBytes);
            close(decodedSecrets == null ? null : decodedSecrets.value());
        }
    }

    private CandidatePaths paths(ManagedMigrationConfigurationTransaction.CandidateRef reference) {
        Path directory = candidateRoot.resolve(reference.operationId())
                .resolve(reference.candidateGeneration()).normalize();
        if (!directory.startsWith(candidateRoot)) {
            throw new IllegalArgumentException("Managed migration candidate is invalid");
        }
        return new CandidatePaths(directory.resolve("application"), directory.resolve("secrets"),
                directory.resolve("manifest"));
    }

    private void delete(Path target) throws IOException {
        if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
            SecureSetupFile.deleteOwnerOnlyInsideRoot(root, target);
            SecureSetupFile.forceParentDirectoryIfSupported(root, target);
        }
    }

    private EntryState entryState(Path path) {
        boolean entryExists = Files.exists(path, LinkOption.NOFOLLOW_LINKS);
        try {
            boolean secureEntry = SecureSetupFile.existsInsideRootWithoutLinks(root, path);
            if (entryExists && !secureEntry) {
                return EntryState.UNSAFE;
            }
            return secureEntry ? EntryState.PRESENT : EntryState.MISSING;
        } catch (IOException failure) {
            return EntryState.UNSAFE;
        }
    }

    private static Path prepareRoot(Path installationRoot) {
        try {
            return SecureSetupFile.prepareTrustedRoot(Objects.requireNonNull(installationRoot, "installationRoot"));
        } catch (IOException failure) {
            throw new IllegalArgumentException("Managed migration root is unsafe");
        }
    }

    private static void close(Object value) {
        if (value instanceof AutoCloseable closeable) {
            try {
                closeable.close();
            } catch (Exception ignored) {
                // Secret cleanup must not replace the persistence result.
            }
        }
    }

    private static void clear(byte[] content) {
        if (content != null) {
            Arrays.fill(content, (byte) 0);
        }
    }

    private record CandidatePaths(Path application, Path secrets, Path manifest) { }

    private enum ActivePairState { MATCH, STALE, RECOVERY_REQUIRED }

    private enum EntryState { MISSING, PRESENT, UNSAFE }

    @FunctionalInterface
    interface MaterialReader<T> {
        T read(MigrationCandidateMaterial material);
    }

}
