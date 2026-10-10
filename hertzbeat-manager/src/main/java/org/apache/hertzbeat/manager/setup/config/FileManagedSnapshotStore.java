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
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;

final class FileManagedSnapshotStore<T> {

    private static final String CANDIDATE_SUFFIX = ".candidate";
    private static final String LAST_KNOWN_GOOD_SUFFIX = ".last-known-good";

    private final Path active;
    private final Path candidate;
    private final Path lastKnownGood;
    private final boolean ownerOnly;
    private final ManagedDocumentCodec<T> codec;
    private final ManagedFileIo.Publisher publisher;
    private final ManagedFileIo.Reader reader;
    private final Path installationRoot;

    FileManagedSnapshotStore(
            Path installationRoot,
            String fileName,
            boolean ownerOnly,
            ManagedDocumentCodec<T> codec,
            ManagedFileIo.Publisher publisher,
            ManagedFileIo.Reader reader) {
        this.installationRoot = installationRoot.toAbsolutePath().normalize();
        Path configDirectory = this.installationRoot.resolve("data/config");
        this.active = configDirectory.resolve(fileName);
        this.candidate = active.resolveSibling(fileName + CANDIDATE_SUFFIX);
        this.lastKnownGood = active.resolveSibling(fileName + LAST_KNOWN_GOOD_SUFFIX);
        this.ownerOnly = ownerOnly;
        this.codec = codec;
        this.publisher = publisher;
        this.reader = reader;
    }

    CandidateRead<T> readCandidate() {
        return read(candidate);
    }

    CandidateRead<T> readActive() {
        return read(active);
    }

    CandidateRead<T> readLastKnownGood() {
        return read(lastKnownGood);
    }

    void stageCandidate(T value, String generation) throws IOException {
        ensureSafePaths();
        publishEncoded(candidate, value, generation);
    }

    void promoteCandidate(T expected, String generation) throws IOException {
        ensureSafePaths();
        byte[] candidateDocument = null;
        ManagedDocumentCodec.Decoded<T> decoded = null;
        CandidateRead<T> activeRead = null;
        try {
            candidateDocument = reader.read(candidate);
            decoded = codec.decode(candidateDocument);
            if (!expected.equals(decoded.value()) || !generation.equals(decoded.generation())) {
                throw new IOException("Managed configuration candidate does not match the transaction");
            }
            activeRead = readActive();
            if (activeRead.state() == CandidateState.VALID) {
                publishEncoded(lastKnownGood,
                        activeRead.value().orElseThrow(), activeRead.generation().orElseThrow());
            } else if (activeRead.state() != CandidateState.MISSING) {
                throw new IOException("Active managed configuration requires recovery");
            }
            publisher.publish(active, candidateDocument, ownerOnly);
            clear(candidateDocument);
            candidateDocument = null;
            publisher.remove(candidate);
        } catch (ManagedDocumentCodec.DocumentException failure) {
            throw new IOException("A valid managed configuration candidate is required");
        } finally {
            clear(candidateDocument);
            close(decoded == null ? null : decoded.value());
            if (activeRead != null) {
                activeRead.value().ifPresent(FileManagedSnapshotStore::close);
            }
        }
    }

    void restoreActive(Optional<T> previous, Optional<String> generation) throws IOException {
        ensureSafePaths();
        if (previous.isPresent()) {
            byte[] document = codec.encode(previous.orElseThrow(), generation.orElseThrow());
            try {
                publisher.publish(active, document, ownerOnly);
                publisher.publish(lastKnownGood, document, ownerOnly);
            } finally {
                clear(document);
            }
        } else {
            publisher.remove(active);
            publisher.remove(lastKnownGood);
        }
    }

    void discardCandidate() throws IOException {
        ensureSafePaths();
        publisher.remove(candidate);
    }

    ExactSnapshotOutcome stageCandidateExact(T expected, String generation) throws IOException {
        ensureSafePaths();
        CandidateRead<T> current = readCandidate();
        try {
            if (current.state() == CandidateState.MISSING) {
                publishEncoded(candidate, expected, generation);
                return ExactSnapshotOutcome.APPLIED;
            }
            return matches(current, expected, generation)
                    ? ExactSnapshotOutcome.ALREADY_APPLIED : ExactSnapshotOutcome.RECOVERY_REQUIRED;
        } finally {
            closeRead(current);
        }
    }

    ExactSnapshotOutcome promoteCandidateExact(T expected, String generation,
                                                String baseGeneration) throws IOException {
        ensureSafePaths();
        CandidateRead<T> activeRead = readActive();
        CandidateRead<T> candidateRead = readCandidate();
        CandidateRead<T> lastKnownGoodRead = readLastKnownGood();
        try {
            if (matches(activeRead, expected, generation)) {
                if (!hasGeneration(lastKnownGoodRead, baseGeneration)
                        || !(candidateRead.state() == CandidateState.MISSING
                        || matches(candidateRead, expected, generation))) {
                    return ExactSnapshotOutcome.RECOVERY_REQUIRED;
                }
                if (candidateRead.state() == CandidateState.VALID) {
                    publisher.remove(candidate);
                }
                return ExactSnapshotOutcome.ALREADY_APPLIED;
            }
            if (activeRead.state() == CandidateState.VALID
                    && !hasGeneration(activeRead, baseGeneration)) {
                return ExactSnapshotOutcome.STALE;
            }
            if (!hasGeneration(activeRead, baseGeneration)
                    || !matches(candidateRead, expected, generation)) {
                return ExactSnapshotOutcome.RECOVERY_REQUIRED;
            }
            if (!sameSnapshot(activeRead, lastKnownGoodRead)) {
                publishEncoded(lastKnownGood, activeRead.value().orElseThrow(), baseGeneration);
            }
            publishEncoded(active, expected, generation);
            publisher.remove(candidate);
            return ExactSnapshotOutcome.APPLIED;
        } finally {
            closeRead(activeRead);
            closeRead(candidateRead);
            closeRead(lastKnownGoodRead);
        }
    }

    ExactSnapshotOutcome restoreActiveExact(T expectedTarget, String targetGeneration,
                                            String baseGeneration) throws IOException {
        ensureSafePaths();
        CandidateRead<T> activeRead = readActive();
        CandidateRead<T> lastKnownGoodRead = readLastKnownGood();
        try {
            if (!hasGeneration(lastKnownGoodRead, baseGeneration)) {
                return ExactSnapshotOutcome.RECOVERY_REQUIRED;
            }
            if (sameSnapshot(activeRead, lastKnownGoodRead)) {
                return ExactSnapshotOutcome.ALREADY_APPLIED;
            }
            if (activeRead.state() == CandidateState.VALID
                    && !matches(activeRead, expectedTarget, targetGeneration)) {
                return ExactSnapshotOutcome.STALE;
            }
            if (!matches(activeRead, expectedTarget, targetGeneration)) {
                return ExactSnapshotOutcome.RECOVERY_REQUIRED;
            }
            publishEncoded(active, lastKnownGoodRead.value().orElseThrow(), baseGeneration);
            return ExactSnapshotOutcome.APPLIED;
        } finally {
            closeRead(activeRead);
            closeRead(lastKnownGoodRead);
        }
    }

    ExactSnapshotOutcome discardCandidateExact(T expected, String generation) throws IOException {
        ensureSafePaths();
        CandidateRead<T> current = readCandidate();
        try {
            if (current.state() == CandidateState.MISSING) {
                return ExactSnapshotOutcome.ALREADY_APPLIED;
            }
            if (!matches(current, expected, generation)) {
                return ExactSnapshotOutcome.RECOVERY_REQUIRED;
            }
            publisher.remove(candidate);
            return ExactSnapshotOutcome.APPLIED;
        } finally {
            closeRead(current);
        }
    }

    void confirmDurability() throws IOException {
        ensureSafePaths();
        publisher.confirmDurability(active);
    }

    private CandidateRead<T> read(Path path) {
        if (isUnsafePath(path)) {
            return CandidateRead.unreadable();
        }
        byte[] document = null;
        try {
            document = reader.read(path);
            ManagedDocumentCodec.Decoded<T> decoded = codec.decode(document);
            return CandidateRead.valid(decoded.value(), decoded.generation());
        } catch (ManagedDocumentCodec.DocumentException exception) {
            return exception.state() == CandidateState.INVALID ? CandidateRead.invalid() : CandidateRead.corrupt();
        } catch (NoSuchFileException exception) {
            return CandidateRead.missing();
        } catch (IOException exception) {
            return CandidateRead.unreadable();
        } finally {
            clear(document);
        }
    }

    private void publishEncoded(Path target, T value, String generation) throws IOException {
        byte[] document = codec.encode(value, generation);
        try {
            publisher.publish(target, document, ownerOnly);
        } finally {
            clear(document);
        }
    }

    private void ensureSafePaths() throws IOException {
        Path data = installationRoot.resolve("data");
        Path config = data.resolve("config");
        if (isUnsafePath(installationRoot) || isUnsafePath(data) || isUnsafePath(config) || isUnsafePath(active)
                || isUnsafePath(candidate) || isUnsafePath(lastKnownGood)
                || (Files.exists(data) && !Files.isDirectory(data))
                || (Files.exists(config) && !Files.isDirectory(config))) {
            throw new IOException("Managed configuration path is unsafe");
        }
    }

    private static boolean isUnsafePath(Path path) {
        return Files.isSymbolicLink(path);
    }

    private static void close(Object value) {
        if (value instanceof AutoCloseable closeable) {
            try {
                closeable.close();
            } catch (Exception ignored) {
                // Secret cleanup is best-effort and must not mask the persistence outcome.
            }
        }
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

    private static void closeRead(CandidateRead<?> read) {
        read.value().ifPresent(FileManagedSnapshotStore::close);
    }

    private static void clear(byte[] content) {
        if (content != null) {
            Arrays.fill(content, (byte) 0);
        }
    }
}
