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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedDeploymentCapabilityTest {

    @TempDir
    private Path installationRoot;

    @Test
    void selectsManagedWriteOnlyWhenTheConfigurationLocationIsWritable() {
        ManagedConfigDeploymentDetector writableDetector =
                new ManagedConfigDeploymentDetector(installationRoot, path -> true);
        ManagedConfigDeploymentDetector readOnlyDetector =
                new ManagedConfigDeploymentDetector(installationRoot, path -> false);

        ManagedConfigCapability writable = writableDetector.detect();
        ManagedConfigCapability readOnly = readOnlyDetector.detect();

        assertEquals(ApplyMode.MANAGED_WRITE, writable.applyMode());
        assertTrue(writable.writableManagedConfig());
        assertEquals(DeploymentConstraint.NONE, writable.constraint());
        assertEquals(ApplyMode.EXTERNAL_APPLY, readOnly.applyMode());
        assertFalse(readOnly.writableManagedConfig());
        assertEquals(DeploymentConstraint.READ_ONLY, readOnly.constraint());
    }

    @Test
    void detectsFirstInstallFromWritableParent() {
        ManagedConfigCapability capability = new ManagedConfigDeploymentDetector(installationRoot).detect();

        assertEquals(ApplyMode.MANAGED_WRITE, capability.applyMode());
        assertTrue(capability.writableManagedConfig());
    }

    @Test
    void distinguishesMissingAndNonDirectoryInstallationRoots() throws Exception {
        Path missing = installationRoot.resolve("missing");
        Path regularFile = installationRoot.resolve("regular-file");
        java.nio.file.Files.writeString(regularFile, "not a directory");

        assertEquals(DeploymentConstraint.INSTALLATION_ROOT_MISSING,
                new ManagedConfigDeploymentDetector(missing).detect().constraint());
        assertEquals(DeploymentConstraint.INSTALLATION_ROOT_NOT_DIRECTORY,
                new ManagedConfigDeploymentDetector(regularFile).detect().constraint());
    }

    @Test
    void rejectsManagedConfigSymlinkEscapeInDetectorAndStore() throws Exception {
        Path outside = installationRoot.resolveSibling(installationRoot.getFileName() + "-outside");
        Files.createDirectories(outside);
        Path dataLink = installationRoot.resolve("data");
        try {
            Files.createSymbolicLink(dataLink, outside);
        } catch (UnsupportedOperationException | IOException exception) {
            Assumptions.abort("Symbolic links are unavailable");
        }

        assertEquals(DeploymentConstraint.UNSAFE_PATH,
                new ManagedConfigDeploymentDetector(installationRoot).detect().constraint());
        org.junit.jupiter.api.Assertions.assertThrows(IOException.class,
                () -> new FileManagedApplicationConfigStore(installationRoot).stageCandidate(
                        new ManagedApplicationConfig(
                                new MetadataDatabaseSettings(
                                        org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind.H2,
                                        "jdbc:h2:./data/test", "sa"),
                                GreptimeSettings.anonymous(
                                        new GreptimeEndpoints("localhost:4001", "http://localhost:4000"), "public")),
                        "symlink-test-generation"));
    }

    @Test
    void rejectsSymlinkedInstallationRootInDetectorAndStore() throws Exception {
        Path rootLink = installationRoot.resolveSibling(installationRoot.getFileName() + "-link");
        try {
            Files.createSymbolicLink(rootLink, installationRoot);
        } catch (UnsupportedOperationException | IOException exception) {
            Assumptions.abort("Symbolic links are unavailable");
        }
        try {
            assertEquals(DeploymentConstraint.UNSAFE_PATH,
                    new ManagedConfigDeploymentDetector(rootLink).detect().constraint());
            org.junit.jupiter.api.Assertions.assertThrows(IOException.class,
                    () -> new FileManagedApplicationConfigStore(rootLink).stageCandidate(
                            new ManagedApplicationConfig(
                                    new MetadataDatabaseSettings(
                                            org.apache.hertzbeat.manager.setup.api.SetupApiContract
                                                    .MetadataDatabaseKind.H2,
                                            "jdbc:h2:./data/test", "sa"),
                                    GreptimeSettings.anonymous(
                                            new GreptimeEndpoints(
                                                    "localhost:4001", "http://localhost:4000"), "public")),
                            "root-symlink-generation"));
        } finally {
            Files.deleteIfExists(rootLink);
        }
    }

    @Test
    void rejectsSymlinkedLockAndNonRegularSnapshotArtifacts() throws Exception {
        Path config = Files.createDirectories(installationRoot.resolve("data/config"));
        Path outside = Files.writeString(installationRoot.resolve("outside-lock"), "lock");
        Path lock = config.resolve(".managed-config.lock");
        try {
            Files.createSymbolicLink(lock, outside);
        } catch (UnsupportedOperationException | IOException exception) {
            Assumptions.abort("Symbolic links are unavailable");
        }
        assertEquals(DeploymentConstraint.UNSAFE_PATH,
                new ManagedConfigDeploymentDetector(installationRoot).detect().constraint());

        Files.delete(lock);
        Files.createDirectory(config.resolve("managed-application.yml.candidate"));
        assertEquals(DeploymentConstraint.UNSAFE_PATH,
                new ManagedConfigDeploymentDetector(installationRoot).detect().constraint());
    }

    @Test
    void checksLockCandidateAndLastKnownGoodReadWriteAccess() throws Exception {
        Path config = Files.createDirectories(installationRoot.resolve("data/config"));
        Path lock = Files.writeString(config.resolve(".managed-config.lock"), "lock");
        Path candidate = Files.writeString(
                config.resolve("managed-application.yml.candidate"), "candidate");
        Path lastKnownGood = Files.writeString(
                config.resolve("managed-secrets.properties.last-known-good"), "last-known-good");

        assertEquals(DeploymentConstraint.READ_ONLY,
                new ManagedConfigDeploymentDetector(
                        installationRoot, path -> !path.equals(lock), path -> true).detect().constraint());
        assertEquals(DeploymentConstraint.READ_ONLY,
                new ManagedConfigDeploymentDetector(
                        installationRoot, path -> !path.equals(candidate), path -> true).detect().constraint());
        assertEquals(DeploymentConstraint.READ_ONLY,
                new ManagedConfigDeploymentDetector(
                        installationRoot, path -> true, path -> !path.equals(lastKnownGood)).detect().constraint());
    }
}
