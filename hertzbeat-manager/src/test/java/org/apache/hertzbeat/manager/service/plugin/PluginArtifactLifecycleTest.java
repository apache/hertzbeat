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

package org.apache.hertzbeat.manager.service.plugin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Transaction and canonical-root contracts for plugin artifacts.
 */
class PluginArtifactLifecycleTest {

    private static final String PLUGIN_LIB_DIR_PROPERTY = "hertzbeat.plugin.lib.dir";

    private String previousPluginLib;

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        if (previousPluginLib == null) {
            System.clearProperty(PLUGIN_LIB_DIR_PROPERTY);
        } else {
            System.setProperty(PLUGIN_LIB_DIR_PROPERTY, previousPluginLib);
        }
    }

    @Test
    void rolledBackUploadRemovesJarAndExtractedLibraries(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File jar = lifecycle.createUploadTarget("rollback.jar");
        Files.write(jar.toPath(), new byte[]{1});
        File extracted = companionDirectory(jar);
        Files.createDirectories(extracted.toPath());
        Files.write(new File(extracted, "dependency.jar").toPath(), new byte[]{2});
        TransactionSynchronizationManager.initSynchronization();

        lifecycle.registerUploadRollbackCleanup(jar);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(synchronization -> synchronization.afterCompletion(
                        TransactionSynchronization.STATUS_ROLLED_BACK));

        assertFalse(jar.exists());
        assertFalse(extracted.exists());
    }

    @Test
    void committedUploadRetainsArtifacts(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File jar = lifecycle.createUploadTarget("commit.jar");
        Files.write(jar.toPath(), new byte[]{1});
        TransactionSynchronizationManager.initSynchronization();

        lifecycle.registerUploadRollbackCleanup(jar);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(synchronization -> synchronization.afterCompletion(
                        TransactionSynchronization.STATUS_COMMITTED));

        assertTrue(jar.exists());
    }

    @Test
    void deleteWaitsForCommitAndRollbackPreservesArtifacts(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File jar = managedJar(tempDir, "preserved.jar");
        File extracted = companionDirectory(jar);
        Files.createDirectories(extracted.toPath());
        TransactionSynchronizationManager.initSynchronization();

        PluginArtifactLifecycle.Deletion deletion = lifecycle.prepareDeletion(List.of(jar.getAbsolutePath()));
        assertTrue(jar.exists());
        assertTrue(extracted.exists());
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(synchronization -> synchronization.afterCompletion(
                        TransactionSynchronization.STATUS_ROLLED_BACK));

        assertTrue(jar.exists());
        assertTrue(extracted.exists());
    }

    @Test
    void committedDeleteRemovesJarAndExtractedLibraries(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File jar = managedJar(tempDir, "deleted.jar");
        File extracted = companionDirectory(jar);
        Files.createDirectories(extracted.toPath());
        TransactionSynchronizationManager.initSynchronization();

        PluginArtifactLifecycle.Deletion deletion = lifecycle.prepareDeletion(List.of(jar.getAbsolutePath()));
        lifecycle.deleteCommitted(deletion);

        assertFalse(jar.exists());
        assertFalse(extracted.exists());
    }

    @Test
    void deleteWithoutTransactionIsRejectedAndPreservesArtifacts(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File jar = managedJar(tempDir, "no-transaction.jar");

        CommonException failure = assertThrows(CommonException.class,
                () -> lifecycle.prepareDeletion(List.of(jar.getAbsolutePath())));

        assertEquals("Plugin artifact transaction is unavailable", failure.getMessage());
        assertTrue(jar.exists());
    }

    @Test
    void outsideDeleteIsRejectedWithoutPathEchoOrFileRemoval(@TempDir File tempDir) throws IOException {
        File root = new File(tempDir, "plugin-root");
        PluginArtifactLifecycle lifecycle = lifecycle(root);
        File outside = new File(tempDir, "external-secret.jar");
        Files.write(outside.toPath(), new byte[]{3});

        CommonException failure = assertThrows(CommonException.class,
                () -> lifecycle.prepareDeletion(List.of(outside.getAbsolutePath())));

        assertEquals("Plugin artifact path is invalid", failure.getMessage());
        assertFalse(failure.getMessage().contains(outside.getAbsolutePath()));
        assertTrue(outside.exists());
    }

    @Test
    void oneUnsafeCleanupDoesNotBlockOtherManagedArtifacts(@TempDir File tempDir) throws IOException {
        PluginArtifactLifecycle lifecycle = lifecycle(tempDir);
        File first = managedJar(tempDir, "first.jar");
        File second = managedJar(tempDir, "second.jar");
        TransactionSynchronizationManager.initSynchronization();
        PluginArtifactLifecycle.Deletion deletion = lifecycle.prepareDeletion(
                List.of(first.getAbsolutePath(), second.getAbsolutePath()));
        File externalDirectory = Files.createTempDirectory(
                tempDir.getParentFile().toPath(), "external-artifact-target").toFile();
        Files.createSymbolicLink(companionDirectory(first).toPath(), externalDirectory.toPath());

        assertDoesNotThrow(() -> lifecycle.deleteCommitted(deletion));

        assertFalse(first.exists());
        assertTrue(externalDirectory.exists());
        assertFalse(second.exists());
        Files.deleteIfExists(companionDirectory(first).toPath());
        Files.deleteIfExists(first.toPath());
        Files.deleteIfExists(externalDirectory.toPath());
    }

    private PluginArtifactLifecycle lifecycle(File root) {
        previousPluginLib = System.getProperty(PLUGIN_LIB_DIR_PROPERTY);
        System.setProperty(PLUGIN_LIB_DIR_PROPERTY, root.getAbsolutePath());
        return new PluginArtifactLifecycle();
    }

    private static File managedJar(File root, String name) throws IOException {
        Files.createDirectories(root.toPath());
        File jar = new File(root, name);
        Files.write(jar.toPath(), new byte[]{1});
        return jar;
    }

    private static File companionDirectory(File jar) {
        String path = jar.getAbsolutePath();
        return new File(path.substring(0, path.lastIndexOf('.')));
    }
}
