/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Objects;
import java.util.UUID;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** SecureSetupFile-backed candidate publication bound to one trusted installation root. */
final class SecureMigrationCandidateFileIo implements MigrationCandidateFileIo {

    private final Path root;
    private final ParentDirectorySync parentDirectorySync;

    SecureMigrationCandidateFileIo(Path trustedRoot) {
        this(trustedRoot, (root, target) -> SecureSetupFile.forceParentDirectoryIfSupported(root, target));
    }

    SecureMigrationCandidateFileIo(Path trustedRoot, ParentDirectorySync parentDirectorySync) {
        root = Objects.requireNonNull(trustedRoot, "trustedRoot");
        this.parentDirectorySync = Objects.requireNonNull(parentDirectorySync, "parentDirectorySync");
    }

    @Override
    public void publish(Path target, byte[] content) throws IOException {
        Path temporary = target.resolveSibling("." + target.getFileName() + "-" + UUID.randomUUID() + ".tmp");
        try {
            SecureSetupFile.create(root, temporary, content);
            SecureSetupFile.atomicReplace(root, temporary, target);
        } finally {
            if (Files.exists(temporary, LinkOption.NOFOLLOW_LINKS)) {
                SecureSetupFile.deleteOwnerOnlyInsideRoot(root, temporary);
            }
        }
    }

    @Override
    public void confirmDurability(Path target) throws IOException {
        Path manifest = target.toAbsolutePath().normalize();
        Path generation = manifest.getParent();
        Path operation = generation == null ? null : generation.getParent();
        Path candidateRoot = root.resolve("data/config/migration-candidates").normalize();
        if (!"manifest".equals(String.valueOf(manifest.getFileName()))
                || operation == null || !candidateRoot.equals(operation.getParent())) {
            throw new IOException("Managed migration candidate hierarchy is invalid");
        }
        parentDirectorySync.force(root, manifest);
        parentDirectorySync.force(root, generation);
        parentDirectorySync.force(root, operation);
        parentDirectorySync.force(root, candidateRoot);
    }

    @FunctionalInterface
    interface ParentDirectorySync {
        void force(Path trustedRoot, Path target) throws IOException;
    }
}
