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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ManagedConfigurationTransactionTest {

    @TempDir
    private Path installationRoot;

    @Test
    void applyPublishesOnlyTheValidatedAggregate() throws Exception {
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(installationRoot);

        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                transaction.apply(bundle("first")));

        assertActivePair("first");
    }

    @Test
    void rollsBackBothFilesWhenTheSecondPromotionFails() throws Exception {
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                new ManagedConfigurationTransaction(installationRoot).apply(bundle("previous")));
        FileManagedApplicationConfigStore applicationStore = new FileManagedApplicationConfigStore(installationRoot);
        FileManagedSecretStore failingSecrets = new FileManagedSecretStore(
                installationRoot, new FailingOnceActivePublicationPublisher(new NioManagedFilePublisher()));
        RecoveryFailureReporter diagnostics = mock(RecoveryFailureReporter.class);
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(
                applicationStore, failingSecrets, installationRoot, diagnostics);

        assertEquals(ManagedConfigurationTransaction.Outcome.ROLLED_BACK,
                transaction.apply(bundle("next")));
        assertActivePair("previous");
        verify(diagnostics).report(eq(RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE),
                eq(RecoveryFailureReporter.Store.SECRET), any(IOException.class));
    }

    @Test
    void filesystemWithoutAtomicMoveFailsBeforeStagingAndPreservesTheActivePair() throws Exception {
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                new ManagedConfigurationTransaction(installationRoot).apply(bundle("previous")));
        AtomicUnsupportedPublisher unsupported = new AtomicUnsupportedPublisher();
        FileManagedApplicationConfigStore applications =
                new FileManagedApplicationConfigStore(installationRoot, unsupported);
        FileManagedSecretStore secrets = new FileManagedSecretStore(installationRoot, unsupported);

        assertThrows(AtomicMoveNotSupportedException.class,
                () -> new ManagedConfigurationTransaction(applications, secrets, installationRoot)
                        .apply(bundle("next")));

        assertActivePair("previous");
        assertEquals(CandidateState.MISSING, applications.readCandidate().state());
        assertEquals(CandidateState.MISSING, secrets.readCandidate().state());
    }

    @ParameterizedTest
    @MethodSource("interruptedPublicationStates")
    void recoverConvergesEveryExplicitInterruptedPair(
            CrashState crashState, ManagedConfigurationTransaction.Outcome expected, String activeSuffix)
            throws Exception {
        FileManagedApplicationConfigStore applications = new FileManagedApplicationConfigStore(installationRoot);
        FileManagedSecretStore secrets = new FileManagedSecretStore(installationRoot);
        new ManagedConfigurationTransaction(installationRoot).apply(bundle("previous"));
        crashState.create(applications, secrets);

        assertEquals(expected, new ManagedConfigurationTransaction(installationRoot).recover());
        assertActivePair(activeSuffix);
        if (crashState != CrashState.BEFORE_FIRST_ACTIVE_REPLACE) {
            assertLastKnownGoodPair("previous");
        }
    }

    @Test
    void recoverFailsClosedWhenNoCompleteGenerationPairExists() throws Exception {
        FileManagedApplicationConfigStore applications = new FileManagedApplicationConfigStore(installationRoot);
        FileManagedSecretStore secrets = new FileManagedSecretStore(installationRoot);
        applications.stageCandidate(configuration("application"), "application-generation");
        secrets.stageCandidate(secrets("secret"), "secret-generation");
        applications.promoteCandidate(configuration("application"), "application-generation");
        secrets.promoteCandidate(secrets("secret"), "secret-generation");

        assertEquals(ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED,
                new ManagedConfigurationTransaction(installationRoot).recover());
    }

    @Test
    void recoverDoesNotPromoteCandidatePairOverMismatchedActiveFiles() throws Exception {
        FileManagedApplicationConfigStore applications = new FileManagedApplicationConfigStore(installationRoot);
        FileManagedSecretStore secrets = new FileManagedSecretStore(installationRoot);
        applications.stageCandidate(configuration("application"), "application-generation");
        applications.promoteCandidate(configuration("application"), "application-generation");
        secrets.stageCandidate(secrets("secret"), "secret-generation");
        secrets.promoteCandidate(secrets("secret"), "secret-generation");
        applications.stageCandidate(configuration("candidate"), "candidate-generation");
        secrets.stageCandidate(secrets("candidate"), "candidate-generation");

        assertEquals(ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED,
                new ManagedConfigurationTransaction(installationRoot).recover());
    }

    @Test
    void secondTransactionCannotEnterWhileSameProcessHoldsTheOsLock() throws Exception {
        Path config = Files.createDirectories(installationRoot.resolve("data/config"));
        Path lockPath = config.resolve(".managed-config.lock");
        try (FileChannel channel = FileChannel.open(lockPath,
                StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                FileLock ignored = channel.lock()) {
            assertThrows(IOException.class,
                    () -> new ManagedConfigurationTransaction(installationRoot).apply(bundle("blocked")));
        }
    }

    @Test
    void transactionCannotEnterWhileAnotherProcessHoldsTheOsLock() throws Exception {
        Path config = Files.createDirectories(installationRoot.resolve("data/config"));
        Path lockPath = config.resolve(".managed-config.lock");
        Path ready = installationRoot.resolve("lock-ready");
        Path release = installationRoot.resolve("lock-release");
        Process holder = new ProcessBuilder(
                Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", System.getProperty("java.class.path"), LockHolder.class.getName(),
                lockPath.toString(), ready.toString(), release.toString())
                .redirectErrorStream(true)
                .start();
        try {
            waitForFile(ready);
            assertThrows(IOException.class,
                    () -> new ManagedConfigurationTransaction(installationRoot).apply(bundle("blocked")));
        } finally {
            Files.writeString(release, "release");
            if (!holder.waitFor(5, TimeUnit.SECONDS)) {
                holder.destroyForcibly();
                holder.waitFor(5, TimeUnit.SECONDS);
            }
        }
        assertEquals(0, holder.exitValue());
    }

    @Test
    void recoveryClosesEveryDecodedSecretSnapshotItOwns() throws Exception {
        ManagedApplicationConfigStore applications = mock(ManagedApplicationConfigStore.class);
        ManagedSecretStore secretStore = mock(ManagedSecretStore.class);
        ManagedSecrets decoded = secrets("owned");
        when(applications.readActive()).thenReturn(CandidateRead.valid(configuration("owned"), "generation"));
        when(applications.readCandidate()).thenReturn(CandidateRead.missing());
        when(applications.readLastKnownGood()).thenReturn(CandidateRead.missing());
        when(secretStore.readActive()).thenReturn(CandidateRead.valid(decoded, "generation"));
        when(secretStore.readCandidate()).thenReturn(CandidateRead.missing());
        when(secretStore.readLastKnownGood()).thenReturn(CandidateRead.missing());

        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                new ManagedConfigurationTransaction(applications, secretStore, installationRoot).recover());

        assertThat(decoded.metadataDatabasePassword().copy()).containsOnly('\0');
    }

    @Test
    void recoveryReportsSecretFreeStructuredDiagnosticsWithoutChangingTheWireOutcome() throws Exception {
        ManagedApplicationConfigStore applications = mock(ManagedApplicationConfigStore.class);
        ManagedSecretStore secretStore = mock(ManagedSecretStore.class);
        when(applications.readActive()).thenReturn(CandidateRead.valid(configuration("owned"), "generation"));
        when(applications.readCandidate()).thenReturn(CandidateRead.missing());
        when(applications.readLastKnownGood()).thenReturn(CandidateRead.missing());
        when(secretStore.readActive()).thenReturn(CandidateRead.valid(secrets("owned"), "generation"));
        when(secretStore.readCandidate()).thenReturn(CandidateRead.missing());
        when(secretStore.readLastKnownGood()).thenReturn(CandidateRead.missing());
        IOException failure = new IOException("must-not-be-reported");
        doThrow(failure).when(applications).discardCandidate();
        RecoveryFailureReporter diagnostics = mock(RecoveryFailureReporter.class);

        assertEquals(ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED,
                new ManagedConfigurationTransaction(
                        applications, secretStore, installationRoot, diagnostics).recover());

        verify(diagnostics).report(eq(RecoveryFailureReporter.Stage.DISCARD_CANDIDATE),
                eq(RecoveryFailureReporter.Store.APPLICATION), same(failure));
    }

    private static void waitForFile(Path ready) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (!Files.exists(ready) && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        if (!Files.exists(ready)) {
            throw new AssertionError("Lock holder did not start");
        }
    }

    private static Stream<Arguments> interruptedPublicationStates() {
        return Stream.of(
                Arguments.of(CrashState.BEFORE_FIRST_ACTIVE_REPLACE,
                        ManagedConfigurationTransaction.Outcome.ROLLED_BACK, "previous"),
                Arguments.of(CrashState.BETWEEN_ACTIVE_REPLACES,
                        ManagedConfigurationTransaction.Outcome.APPLIED, "next"),
                Arguments.of(CrashState.AFTER_BOTH_ACTIVE_REPLACES,
                        ManagedConfigurationTransaction.Outcome.APPLIED, "next"));
    }

    private void assertActivePair(String suffix) {
        assertEquals(configuration(suffix), new FileManagedApplicationConfigStore(installationRoot)
                .readActive().value().orElseThrow());
        assertEquals(secrets(suffix), new FileManagedSecretStore(installationRoot)
                .readActive().value().orElseThrow());
    }

    private void assertLastKnownGoodPair(String suffix) {
        assertEquals(configuration(suffix), new FileManagedApplicationConfigStore(installationRoot)
                .readLastKnownGood().value().orElseThrow());
        assertEquals(secrets(suffix), new FileManagedSecretStore(installationRoot)
                .readLastKnownGood().value().orElseThrow());
    }

    private enum CrashState {
        BEFORE_FIRST_ACTIVE_REPLACE {
            @Override
            void create(FileManagedApplicationConfigStore applications, FileManagedSecretStore secrets)
                    throws Exception {
                stageNext(applications, secrets);
            }
        },
        BETWEEN_ACTIVE_REPLACES {
            @Override
            void create(FileManagedApplicationConfigStore applications, FileManagedSecretStore secrets)
                    throws Exception {
                stageNext(applications, secrets);
                applications.promoteCandidate(configuration("next"), "next-generation");
            }
        },
        AFTER_BOTH_ACTIVE_REPLACES {
            @Override
            void create(FileManagedApplicationConfigStore applications, FileManagedSecretStore secrets)
                    throws Exception {
                stageNext(applications, secrets);
                applications.promoteCandidate(configuration("next"), "next-generation");
                secrets.promoteCandidate(
                        ManagedConfigurationTransactionTest.secrets("next"), "next-generation");
            }
        };

        abstract void create(FileManagedApplicationConfigStore applications, FileManagedSecretStore secrets)
                throws Exception;

        static void stageNext(FileManagedApplicationConfigStore applications, FileManagedSecretStore secrets)
                throws Exception {
            applications.stageCandidate(configuration("next"), "next-generation");
            secrets.stageCandidate(ManagedConfigurationTransactionTest.secrets("next"), "next-generation");
        }
    }

    private static ManagedConfigurationBundle bundle(String suffix) {
        return new ManagedConfigurationBundle(configuration(suffix), secrets(suffix));
    }

    private static ManagedApplicationConfig configuration(String name) {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/" + name, "hertzbeat"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public"));
    }

    private static ManagedSecrets secrets(String suffix) {
        return ManagedSecrets.withoutTelemetryPassword(SecretValue.of("database-" + suffix));
    }

    private static final class FailingOnceActivePublicationPublisher implements ManagedFileIo.Publisher {

        private final ManagedFileIo.Publisher delegate;
        private boolean failNextActivePublication = true;

        private FailingOnceActivePublicationPublisher(ManagedFileIo.Publisher delegate) {
            this.delegate = delegate;
        }

        @Override
        public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
            if (failNextActivePublication
                    && target.getFileName().toString().equals("managed-secrets.properties")) {
                failNextActivePublication = false;
                throw new IOException("injected second-file promotion failure");
            }
            delegate.publish(target, content, ownerOnly);
        }

        @Override
        public void remove(Path target) throws IOException {
            delegate.remove(target);
        }
    }

    private static final class AtomicUnsupportedPublisher implements ManagedFileIo.Publisher {

        @Override
        public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
            throw new AtomicMoveNotSupportedException(
                    target.toString(), target.toString(), "injected unsupported atomic move");
        }

        @Override
        public void remove(Path target) throws IOException {
            Files.deleteIfExists(target);
        }
    }

    /** Separate JVM entry point proving that the lock coordinates processes, not only instances. */
    public static final class LockHolder {

        private LockHolder() {
        }

        public static void main(String[] arguments) throws Exception {
            Path lockPath = Path.of(arguments[0]);
            Path ready = Path.of(arguments[1]);
            Path release = Path.of(arguments[2]);
            try (FileChannel channel = FileChannel.open(lockPath,
                    StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                    FileLock ignored = channel.lock()) {
                Files.writeString(ready, "ready");
                while (!Files.exists(release)) {
                    Thread.sleep(10);
                }
            }
        }
    }
}
