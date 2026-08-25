/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Deletes only the explicit HertzBeat-owned local files covered by a complete reset. */
public final class FactoryResetLocalStateCleaner {

    private static final List<String> MANAGED_STATE = List.of(
            "data/config/managed-application.yml",
            "data/config/managed-application.yml.candidate",
            "data/config/managed-application.yml.last-known-good",
            "data/config/managed-secrets.properties",
            "data/config/managed-secrets.properties.candidate",
            "data/config/managed-secrets.properties.last-known-good",
            "data/config/.installation-fingerprint",
            "data/config/setup-operation.properties",
            "data/config/setup-unlock-code",
            "data/config/setup-transition-configuration",
            "data/config/setup-transition-completion",
            "data/config/setup-transition-closed",
            "data/config/metadata-migration-operations");
    private static final List<String> MANAGED_TREES = List.of(
            "data/config/migration-candidates");
    private static final List<String> CLOSED_DATABASE_FILES = List.of(
            "data/hertzbeat.mv.db",
            "data/hertzbeat.h2.db",
            "data/hertzbeat.trace.db",
            "data/history.duckdb");
    private final Path installationRoot;

    public FactoryResetLocalStateCleaner(Path installationRoot) {
        this.installationRoot = installationRoot.toAbsolutePath().normalize();
    }

    public void clearManagedState() throws IOException {
        validateKnownFiles(MANAGED_STATE);
        List<List<Path>> trees = new ArrayList<>();
        for (String relativePath : MANAGED_TREES) {
            trees.add(inspectOwnedTree(relativePath));
        }
        deleteKnownFiles(MANAGED_STATE);
        for (List<Path> tree : trees) {
            deleteOwnedTree(tree);
        }
    }

    public void clearClosedDatabaseFiles() throws IOException {
        deleteKnownFiles(CLOSED_DATABASE_FILES);
    }

    private void deleteKnownFiles(List<String> relativePaths) throws IOException {
        for (String relativePath : relativePaths) {
            Path target = installationRoot.resolve(relativePath);
            if (!Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
                continue;
            }
            SecureSetupFile.deleteOwnerOnlyInsideRoot(installationRoot, target);
            SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, target);
        }
    }

    private void validateKnownFiles(List<String> relativePaths) throws IOException {
        for (String relativePath : relativePaths) {
            Path target = installationRoot.resolve(relativePath);
            if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)
                    && (!SecureSetupFile.existsInsideRootWithoutLinks(installationRoot, target)
                    || !SecureSetupFile.isOwnerOnlyRegularFile(target))) {
                throw new IOException("Factory reset state is not an owner-only regular file");
            }
        }
    }

    private List<Path> inspectOwnedTree(String relativePath) throws IOException {
        Path root = installationRoot.resolve(relativePath);
        if (!Files.exists(root, LinkOption.NOFOLLOW_LINKS)) {
            return List.of();
        }
        try (var paths = Files.walk(root)) {
            List<Path> entries = paths.sorted(Comparator.comparingInt(Path::getNameCount).reversed()).toList();
            for (Path entry : entries) {
                if (!SecureSetupFile.existsInsideRootWithoutLinks(installationRoot, entry)
                        || (!Files.isDirectory(entry, LinkOption.NOFOLLOW_LINKS)
                        && !SecureSetupFile.isOwnerOnlyRegularFile(entry))) {
                    throw new IOException("Factory reset directory contains an unsafe entry");
                }
            }
            return entries;
        }
    }

    private void deleteOwnedTree(List<Path> entries) throws IOException {
        for (Path entry : entries) {
            if (Files.isDirectory(entry, LinkOption.NOFOLLOW_LINKS)) {
                Files.delete(entry);
            } else {
                SecureSetupFile.deleteOwnerOnlyInsideRoot(installationRoot, entry);
            }
            SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, entry);
        }
    }
}
