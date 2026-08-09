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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileManagedConfigurationStoreTest {

    private static final String DATABASE_PASSWORD = "database-secret-value";
    private static final String TELEMETRY_PASSWORD = "telemetry-secret-value";
    private static final String GENERATION = "test-generation";

    @TempDir
    private Path installationRoot;

    @Test
    void stagesIsolatedTypedCandidatesAndKeepsSecretsSeparate() throws Exception {
        FileManagedApplicationConfigStore applicationStore = new FileManagedApplicationConfigStore(installationRoot);
        FileManagedSecretStore secretStore = new FileManagedSecretStore(installationRoot);

        applicationStore.stageCandidate(configuration("candidate"), GENERATION);
        secretStore.stageCandidate(secrets(), GENERATION);

        Path configDirectory = installationRoot.resolve("data/config");
        try (Stream<Path> files = Files.list(configDirectory)) {
            assertEquals(List.of("managed-application.yml.candidate", "managed-secrets.properties.candidate"),
                    files.map(path -> path.getFileName().toString()).sorted().toList());
        }
        String applicationDocument = Files.readString(
                configDirectory.resolve("managed-application.yml.candidate"), StandardCharsets.UTF_8);
        assertFalse(applicationDocument.contains(DATABASE_PASSWORD));
        assertFalse(applicationDocument.contains(TELEMETRY_PASSWORD));
        assertEquals(configuration("candidate"), applicationStore.readCandidate().value().orElseThrow());
        assertEquals(secrets(), secretStore.readCandidate().value().orElseThrow());
        assertEquals(CandidateState.MISSING, applicationStore.readActive().state());
        assertEquals(CandidateState.MISSING, secretStore.readActive().state());
    }

    @Test
    void promotesAndRetainsTheLastKnownGoodSnapshotForTransactionRecovery() throws Exception {
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(installationRoot);
        ManagedApplicationConfig knownGood = configuration("known-good");
        ManagedApplicationConfig second = configuration("second");

        store.stageCandidate(knownGood, "known-good-generation");
        store.promoteCandidate(knownGood, "known-good-generation");
        assertEquals(knownGood, store.readActive().value().orElseThrow());
        assertEquals(CandidateState.MISSING, store.readLastKnownGood().state());
        store.stageCandidate(second, "second-generation");
        store.promoteCandidate(second, "second-generation");

        assertEquals(second, store.readActive().value().orElseThrow());
        assertEquals(knownGood, store.readLastKnownGood().value().orElseThrow());
    }

    @Test
    void publishesTheVerifiedCandidateBytesWhenThePathIsReplacedAfterReading() throws Exception {
        ManagedApplicationConfig expected = configuration("expected");
        ManagedApplicationConfig replacement = configuration("replacement");
        FileManagedApplicationConfigStore initial = new FileManagedApplicationConfigStore(installationRoot);
        initial.stageCandidate(expected, GENERATION);
        Path candidate = installationRoot.resolve("data/config/managed-application.yml.candidate");
        AtomicInteger candidateReads = new AtomicInteger();
        ManagedFileIo.Reader replacingReader = path -> {
            byte[] verifiedBytes = Files.readAllBytes(path);
            if (path.equals(candidate) && candidateReads.incrementAndGet() == 1) {
                Files.write(path, new ApplicationConfigDocumentCodec().encode(
                        replacement, "replacement-generation"));
            }
            return verifiedBytes;
        };
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(
                installationRoot, new NioManagedFilePublisher(), replacingReader);

        store.promoteCandidate(expected, GENERATION);

        assertEquals(1, candidateReads.get());
        assertEquals(expected, store.readActive().value().orElseThrow());
        assertEquals(CandidateState.MISSING, store.readCandidate().state());
    }

    @Test
    void rejectsCandidateWithUnexpectedValueOrGenerationBeforeChangingActive() throws Exception {
        ManagedApplicationConfig candidate = configuration("candidate");
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(installationRoot);
        store.stageCandidate(candidate, GENERATION);

        assertThrows(IOException.class,
                () -> store.promoteCandidate(configuration("unexpected"), GENERATION));
        assertEquals(CandidateState.MISSING, store.readActive().state());
        assertEquals(candidate, store.readCandidate().value().orElseThrow());

        assertThrows(IOException.class,
                () -> store.promoteCandidate(candidate, "unexpected-generation"));
        assertEquals(CandidateState.MISSING, store.readActive().state());
        assertEquals(candidate, store.readCandidate().value().orElseThrow());
    }

    @Test
    void classifiesMissingInvalidCorruptAndUnreadableCandidates() throws Exception {
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(installationRoot);
        Path managedFile = installationRoot.resolve("data/config/managed-application.yml.candidate");
        assertEquals(CandidateState.MISSING, store.readCandidate().state());

        store.stageCandidate(configuration("valid"), GENERATION);
        ManagedDocumentCodec.Integrity.VerifiedBody validBody = ManagedDocumentCodec.Integrity.extract(
                Files.readAllBytes(managedFile));
        Files.write(managedFile, ManagedDocumentCodec.Integrity.envelope(
                validBody.content().replace("database: 'public'", "database: ' '"), validBody.generation()));
        assertEquals(CandidateState.INVALID, store.readCandidate().state());

        Files.writeString(managedFile, "formatVersion: [broken", StandardCharsets.UTF_8);
        assertEquals(CandidateState.CORRUPT, store.readCandidate().state());

        ManagedFileIo.Reader unreadable = path -> {
            throw new IOException("injected unreadable file");
        };
        FileManagedApplicationConfigStore unreadableStore = new FileManagedApplicationConfigStore(
                installationRoot, new NioManagedFilePublisher(), unreadable);
        assertEquals(CandidateState.UNREADABLE, unreadableStore.readCandidate().state());
    }

    @Test
    void rejectsManagedWarehouseFlagsThatContradictTheSupportedStoragePolicy() throws Exception {
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(installationRoot);
        Path candidate = installationRoot.resolve("data/config/managed-application.yml.candidate");
        store.stageCandidate(configuration("valid"), GENERATION);
        ManagedDocumentCodec.Integrity.VerifiedBody document = ManagedDocumentCodec.Integrity.extract(
                Files.readAllBytes(candidate));
        String unsupported = document.content()
                .replace("warehouse.store.duckdb.enabled: 'false'",
                        "warehouse.store.duckdb.enabled: 'true'");
        Files.write(candidate, ManagedDocumentCodec.Integrity.envelope(unsupported, document.generation()));

        assertEquals(CandidateState.CORRUPT, store.readCandidate().state());
    }

    @Test
    void failedPublicationLeavesTheExistingSnapshotUntouched() throws Exception {
        FileManagedApplicationConfigStore initial = new FileManagedApplicationConfigStore(installationRoot);
        ManagedApplicationConfig knownGood = configuration("known-good");
        initial.stageCandidate(knownGood, GENERATION);
        Path candidatePath = installationRoot.resolve("data/config/managed-application.yml.candidate");
        byte[] before = Files.readAllBytes(candidatePath);
        ManagedFileIo.Publisher failingPublisher = new ManagedFileIo.Publisher() {
            @Override
            public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
                throw new IOException("injected publication failure");
            }

            @Override
            public void remove(Path target) throws IOException {
                throw new IOException("injected removal failure");
            }

            @Override
            public void confirmDurability(Path target) throws IOException {
                throw new IOException("injected durability failure");
            }
        };
        FileManagedApplicationConfigStore failing =
                new FileManagedApplicationConfigStore(installationRoot, failingPublisher);

        IOException failure = assertThrows(IOException.class,
                () -> failing.stageCandidate(configuration("replacement"), "replacement-generation"));

        assertEquals("injected publication failure", failure.getMessage());
        assertArrayEquals(before, Files.readAllBytes(candidatePath));
    }

    @Test
    void secretFileIsOwnerOnlyOnPosixFileSystems() throws Exception {
        FileManagedSecretStore store = new FileManagedSecretStore(installationRoot);
        store.stageCandidate(secrets(), GENERATION);
        Path configDirectory = installationRoot.resolve("data/config");
        Path candidate = configDirectory.resolve("managed-secrets.properties.candidate");

        if (Files.getFileStore(candidate).supportsFileAttributeView("posix")) {
            assertOwnerOnly(candidate);
            store.promoteCandidate(secrets(), GENERATION);
            Path active = configDirectory.resolve("managed-secrets.properties");
            assertOwnerOnly(active);
            store.stageCandidate(secrets(), "second-generation");
            store.promoteCandidate(secrets(), "second-generation");
            Path lastKnownGood = configDirectory.resolve("managed-secrets.properties.last-known-good");
            assertOwnerOnly(active);
            assertOwnerOnly(lastKnownGood);
            assertOwnerOnly(active);
        }
    }

    @Test
    void derivesManagedPathsFromTheNormalizedAbsoluteInstallationRoot() throws Exception {
        Path relativeRoot = Path.of("").toAbsolutePath().relativize(installationRoot.toAbsolutePath());
        FileManagedApplicationConfigStore store = new FileManagedApplicationConfigStore(relativeRoot);

        store.stageCandidate(configuration("relative-root"), GENERATION);

        assertTrue(Files.isRegularFile(installationRoot.resolve(
                "data/config/managed-application.yml.candidate")));
        assertEquals(configuration("relative-root"), store.readCandidate().value().orElseThrow());
    }

    private static void assertOwnerOnly(Path path) throws IOException {
        assertEquals(Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE),
                Files.getPosixFilePermissions(path));
    }

    private static ManagedApplicationConfig configuration(String name) {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/" + name, "hertzbeat"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public"));
    }

    private static ManagedSecrets secrets() {
        return ManagedSecrets.withTelemetryPassword(
                SecretValue.of(DATABASE_PASSWORD), SecretValue.of(TELEMETRY_PASSWORD));
    }
}
