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

package org.apache.hertzbeat.manager.setup.runtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore.Intent;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileSetupTransitionIntentStoreTest {
    @TempDir
    private Path installationRoot;

    @Test
    void persistsOwnerOnlyIntentAndClearsOnlyTheMatchingCompletion() throws Exception {
        FileSetupTransitionIntentStore store = new FileSetupTransitionIntentStore(installationRoot);

        store.save(Intent.CONFIGURATION_APPLIED);
        store.save(Intent.CONFIGURATION_APPLIED);

        assertThat(new FileSetupTransitionIntentStore(installationRoot).load())
                .contains(Intent.CONFIGURATION_APPLIED);
        Path checkpoint = installationRoot.resolve(FileSetupTransitionIntentStore.RELATIVE_PATH);
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(checkpoint)).isTrue();

        store.clear(Intent.INSTALLATION_COMPLETED);
        assertThat(store.load()).contains(Intent.CONFIGURATION_APPLIED);

        store.clear(Intent.CONFIGURATION_APPLIED);
        assertThat(store.load()).isEmpty();

        store.save(Intent.CONFIGURATION_APPLIED);
        assertThat(store.load()).contains(Intent.CONFIGURATION_APPLIED);
    }

    @Test
    void completionSupersedesConfigurationAndCannotBeDowngraded() throws Exception {
        FileSetupTransitionIntentStore store = new FileSetupTransitionIntentStore(installationRoot);

        store.save(Intent.CONFIGURATION_APPLIED);
        store.save(Intent.INSTALLATION_COMPLETED);
        store.save(Intent.CONFIGURATION_APPLIED);

        assertThat(store.load()).contains(Intent.INSTALLATION_COMPLETED);
    }

    @Test
    void staleConfigurationClearCannotDeleteCompletionAfterLockFileReplacement() throws Exception {
        FileSetupTransitionIntentStore oldContext = new FileSetupTransitionIntentStore(installationRoot);
        FileSetupTransitionIntentStore newContext = new FileSetupTransitionIntentStore(installationRoot);
        Path staleConfigurationMarker = installationRoot.resolve(
                FileSetupTransitionIntentStore.RELATIVE_PATH);

        oldContext.save(Intent.CONFIGURATION_APPLIED);
        newContext.save(Intent.INSTALLATION_COMPLETED);

        // Models an old process finishing a stale clear after a replacement lock inode was acquired.
        SecureSetupFile.deleteOwnerOnlyInsideRoot(installationRoot, staleConfigurationMarker);

        assertThat(newContext.load()).contains(Intent.INSTALLATION_COMPLETED);
    }

    @Test
    void staleConfigurationSaveCannotReopenCompletedInstallation() throws Exception {
        FileSetupTransitionIntentStore completingContext =
                new FileSetupTransitionIntentStore(installationRoot);
        FileSetupTransitionIntentStore staleContext =
                new FileSetupTransitionIntentStore(installationRoot);

        completingContext.save(Intent.INSTALLATION_COMPLETED);
        completingContext.clear(Intent.INSTALLATION_COMPLETED);

        // Models a stale save finishing after the completion clear through a replacement lock inode.
        staleContext.save(Intent.CONFIGURATION_APPLIED);

        assertThat(completingContext.load()).isEmpty();
    }

    @Test
    void synchronizesTheParentDirectoryAfterEachMonotonicMarker() throws Exception {
        List<Path> synchronizedEntries = new ArrayList<>();
        FileSetupTransitionIntentStore store = new FileSetupTransitionIntentStore(
                installationRoot, synchronizedEntries::add);
        Path configuration = installationRoot.resolve(FileSetupTransitionIntentStore.RELATIVE_PATH);
        Path completion = installationRoot.resolve(
                FileSetupTransitionIntentStore.COMPLETION_RELATIVE_PATH);
        Path terminal = installationRoot.resolve(FileSetupTransitionIntentStore.TERMINAL_RELATIVE_PATH);

        store.save(Intent.CONFIGURATION_APPLIED);
        store.save(Intent.INSTALLATION_COMPLETED);
        store.clear(Intent.INSTALLATION_COMPLETED);

        assertThat(synchronizedEntries).containsExactly(configuration, completion, terminal);
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(completion)).isTrue();
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(terminal)).isTrue();
    }

    @Test
    void cooperatingStoreInstancesAreSerializedWithinProcess() throws Exception {
        FileSetupTransitionIntentStore initial = new FileSetupTransitionIntentStore(installationRoot);
        initial.save(Intent.CONFIGURATION_APPLIED);
        CountDownLatch clearReachedDirectorySync = new CountDownLatch(1);
        CountDownLatch allowClearToFinish = new CountDownLatch(1);
        CountDownLatch upgradeStarted = new CountDownLatch(1);
        FileSetupTransitionIntentStore oldContext = new FileSetupTransitionIntentStore(
                installationRoot, ignored -> {
                    clearReachedDirectorySync.countDown();
                    try {
                        allowClearToFinish.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Interrupted while coordinating clear", interrupted);
                    }
                });
        FileSetupTransitionIntentStore newContext = new FileSetupTransitionIntentStore(installationRoot);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Void> clear = executor.submit(() -> {
                oldContext.clear(Intent.CONFIGURATION_APPLIED);
                return null;
            });
            assertThat(clearReachedDirectorySync.await(5, TimeUnit.SECONDS)).isTrue();
            Future<Void> upgrade = executor.submit(() -> {
                upgradeStarted.countDown();
                newContext.save(Intent.INSTALLATION_COMPLETED);
                return null;
            });
            assertThat(upgradeStarted.await(5, TimeUnit.SECONDS)).isTrue();

            try {
                assertThrows(TimeoutException.class, () -> upgrade.get(200, TimeUnit.MILLISECONDS));
            } finally {
                allowClearToFinish.countDown();
            }
            clear.get(5, TimeUnit.SECONDS);
            upgrade.get(5, TimeUnit.SECONDS);
        }

        assertThat(newContext.load()).contains(Intent.INSTALLATION_COMPLETED);
    }
}
