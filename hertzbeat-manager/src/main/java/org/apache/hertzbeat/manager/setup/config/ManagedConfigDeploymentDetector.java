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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Predicate;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;

/** Detects whether setup may safely use managed files or must export them for an operator. */
public final class ManagedConfigDeploymentDetector {

    private static final List<String> MANAGED_ARTIFACTS = List.of(
            "managed-application.yml",
            "managed-application.yml.candidate",
            "managed-application.yml.last-known-good",
            "managed-secrets.properties",
            "managed-secrets.properties.candidate",
            "managed-secrets.properties.last-known-good",
            ManagedConfigurationLock.LOCK_FILE_NAME);

    private final Path installationRoot;
    private final Predicate<Path> writable;
    private final Predicate<Path> readable;

    public ManagedConfigDeploymentDetector(Path installationRoot) {
        this(installationRoot, Files::isWritable, Files::isReadable);
    }

    ManagedConfigDeploymentDetector(Path installationRoot, Predicate<Path> writable) {
        this(installationRoot, writable, Files::isReadable);
    }

    ManagedConfigDeploymentDetector(
            Path installationRoot, Predicate<Path> writable, Predicate<Path> readable) {
        this.installationRoot = installationRoot.toAbsolutePath().normalize();
        this.writable = writable;
        this.readable = readable;
    }

    public ManagedConfigCapability detect() {
        if (!Files.exists(installationRoot)) {
            return ManagedConfigCapability.constrained(DeploymentConstraint.INSTALLATION_ROOT_MISSING);
        }
        if (!Files.isDirectory(installationRoot)) {
            return ManagedConfigCapability.constrained(DeploymentConstraint.INSTALLATION_ROOT_NOT_DIRECTORY);
        }
        Path configDirectory = installationRoot.resolve("data/config");
        if (hasManagedSymlink(configDirectory)) {
            return ManagedConfigCapability.constrained(DeploymentConstraint.UNSAFE_PATH);
        }
        Path existingParent = nearestExisting(configDirectory);
        if (!Files.isDirectory(existingParent)) {
            return ManagedConfigCapability.constrained(DeploymentConstraint.CONFIG_PATH_NOT_DIRECTORY);
        }
        if (!writable.test(existingParent)) {
            return ManagedConfigCapability.constrained(DeploymentConstraint.READ_ONLY);
        }
        for (String fileName : MANAGED_ARTIFACTS) {
            Path managedFile = configDirectory.resolve(fileName);
            if (Files.exists(managedFile) && !Files.isRegularFile(managedFile)) {
                return ManagedConfigCapability.constrained(DeploymentConstraint.UNSAFE_PATH);
            }
            if (fileName.equals(ManagedConfigurationLock.LOCK_FILE_NAME)
                    && Files.exists(managedFile)
                    && !SecureSetupFileLock.isValidExistingLock(
                            installationRoot, "data/config/" + ManagedConfigurationLock.LOCK_FILE_NAME)) {
                return ManagedConfigCapability.constrained(DeploymentConstraint.UNSAFE_PATH);
            }
            if (Files.exists(managedFile)
                    && (!readable.test(managedFile) || !writable.test(managedFile))) {
                return ManagedConfigCapability.constrained(DeploymentConstraint.READ_ONLY);
            }
        }
        return ManagedConfigCapability.writable();
    }

    private Path nearestExisting(Path path) {
        Path current = path;
        while (!Files.exists(current) && !current.equals(installationRoot)) {
            current = current.getParent();
        }
        return current;
    }

    private boolean hasManagedSymlink(Path configDirectory) {
        if (Files.isSymbolicLink(installationRoot)
                || Files.isSymbolicLink(installationRoot.resolve("data"))
                || Files.isSymbolicLink(configDirectory)) {
            return true;
        }
        for (String fileName : MANAGED_ARTIFACTS) {
            if (Files.isSymbolicLink(configDirectory.resolve(fileName))) {
                return true;
            }
        }
        return false;
    }
}
