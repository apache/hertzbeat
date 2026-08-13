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
import java.nio.file.Path;

/** File adapter owning only the managed secret properties transaction. */
final class FileManagedSecretStore implements ManagedSecretStore {

    private static final String FILE_NAME = "managed-secrets.properties";

    private final FileManagedSnapshotStore<ManagedSecrets> delegate;

    FileManagedSecretStore(Path installationRoot) {
        this(installationRoot, new NioManagedFilePublisher(), Files::readAllBytes);
    }

    FileManagedSecretStore(Path installationRoot, ManagedFileIo.Publisher publisher, ManagedFileIo.Reader reader) {
        delegate = new FileManagedSnapshotStore<>(installationRoot, FILE_NAME, true,
                new SecretConfigDocumentCodec(), publisher, reader);
    }

    FileManagedSecretStore(Path installationRoot, ManagedFileIo.Publisher publisher) {
        this(installationRoot, publisher, Files::readAllBytes);
    }

    @Override
    public CandidateRead<ManagedSecrets> readCandidate() {
        return delegate.readCandidate();
    }

    @Override
    public CandidateRead<ManagedSecrets> readActive() {
        return delegate.readActive();
    }

    @Override
    public CandidateRead<ManagedSecrets> readLastKnownGood() {
        return delegate.readLastKnownGood();
    }

    @Override
    public void stageCandidate(ManagedSecrets candidate, String generation) throws IOException {
        delegate.stageCandidate(candidate, generation);
    }

    @Override
    public void promoteCandidate(ManagedSecrets expected, String generation) throws IOException {
        delegate.promoteCandidate(expected, generation);
    }

    @Override
    public void restoreActive(CandidateRead<ManagedSecrets> previous) throws IOException {
        delegate.restoreActive(previous.value(), previous.generation());
    }

    @Override
    public void discardCandidate() throws IOException {
        delegate.discardCandidate();
    }

    ExactSnapshotOutcome stageCandidateExact(ManagedSecrets candidate, String generation) throws IOException {
        return delegate.stageCandidateExact(candidate, generation);
    }

    ExactSnapshotOutcome promoteCandidateExact(ManagedSecrets candidate, String generation,
                                               String baseGeneration) throws IOException {
        return delegate.promoteCandidateExact(candidate, generation, baseGeneration);
    }

    ExactSnapshotOutcome restoreActiveExact(ManagedSecrets candidate, String generation,
                                            String baseGeneration) throws IOException {
        return delegate.restoreActiveExact(candidate, generation, baseGeneration);
    }

    ExactSnapshotOutcome discardCandidateExact(ManagedSecrets candidate, String generation) throws IOException {
        return delegate.discardCandidateExact(candidate, generation);
    }

    void confirmDurability() throws IOException {
        delegate.confirmDurability();
    }
}
