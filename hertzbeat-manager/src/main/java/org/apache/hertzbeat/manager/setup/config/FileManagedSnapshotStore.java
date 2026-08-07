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
        publisher.publish(candidate, codec.encode(value, generation), ownerOnly);
    }

    void promoteCandidate(T expected, String generation) throws IOException {
        ensureSafePaths();
        byte[] candidateDocument;
        ManagedDocumentCodec.Decoded<T> decoded;
        try {
            candidateDocument = reader.read(candidate);
            decoded = codec.decode(candidateDocument);
        } catch (ManagedDocumentCodec.DocumentException | IOException failure) {
            throw new IOException("A valid managed configuration candidate is required");
        }
        if (!expected.equals(decoded.value()) || !generation.equals(decoded.generation())) {
            throw new IOException("Managed configuration candidate does not match the transaction");
        }
        CandidateRead<T> activeRead = readActive();
        if (activeRead.state() == CandidateState.VALID) {
            publisher.publish(lastKnownGood, codec.encode(
                    activeRead.value().orElseThrow(), activeRead.generation().orElseThrow()), ownerOnly);
        } else if (activeRead.state() != CandidateState.MISSING) {
            throw new IOException("Active managed configuration requires recovery");
        }
        publisher.publish(active, candidateDocument, ownerOnly);
        publisher.remove(candidate);
    }

    void restoreActive(Optional<T> previous, Optional<String> generation) throws IOException {
        ensureSafePaths();
        if (previous.isPresent()) {
            byte[] document = codec.encode(previous.orElseThrow(), generation.orElseThrow());
            publisher.publish(active, document, ownerOnly);
            publisher.publish(lastKnownGood, document, ownerOnly);
        } else {
            publisher.remove(active);
            publisher.remove(lastKnownGood);
        }
    }

    void discardCandidate() throws IOException {
        ensureSafePaths();
        publisher.remove(candidate);
    }

    private CandidateRead<T> read(Path path) {
        if (isUnsafePath(path)) {
            return CandidateRead.unreadable();
        }
        try {
            ManagedDocumentCodec.Decoded<T> decoded = codec.decode(reader.read(path));
            return CandidateRead.valid(decoded.value(), decoded.generation());
        } catch (ManagedDocumentCodec.DocumentException exception) {
            return exception.state() == CandidateState.INVALID ? CandidateRead.invalid() : CandidateRead.corrupt();
        } catch (NoSuchFileException exception) {
            return CandidateRead.missing();
        } catch (IOException exception) {
            return CandidateRead.unreadable();
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
}
