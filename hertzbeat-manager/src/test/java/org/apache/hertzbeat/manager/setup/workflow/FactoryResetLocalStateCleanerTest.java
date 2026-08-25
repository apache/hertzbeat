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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FactoryResetLocalStateCleanerTest {

    @TempDir
    private Path root;

    @Test
    void deletesOnlyOwnedSetupStateAndStandardLocalDatabaseFiles() throws Exception {
        Path config = Files.createDirectories(root.resolve("data/config"));
        Path managed = ownerOnly(config.resolve("managed-application.yml"));
        Path fingerprint = ownerOnly(config.resolve(".installation-fingerprint"));
        Path migrationCandidate = ownerOnly(config.resolve(
                "migration-candidates/operation-1/candidate-1/managed-secrets.properties"));
        Path unrelated = ownerOnly(config.resolve("operator-notes.txt"));
        Path metadata = ownerOnly(root.resolve("data/hertzbeat.mv.db"));
        Path history = ownerOnly(root.resolve("data/history.duckdb"));

        FactoryResetLocalStateCleaner cleaner = new FactoryResetLocalStateCleaner(root);
        cleaner.clearManagedState();

        assertThat(managed).doesNotExist();
        assertThat(fingerprint).doesNotExist();
        assertThat(migrationCandidate).doesNotExist();
        assertThat(config.resolve("migration-candidates")).doesNotExist();
        assertThat(unrelated).exists();
        assertThat(metadata).exists();

        cleaner.clearClosedDatabaseFiles();
        assertThat(metadata).doesNotExist();
        assertThat(history).doesNotExist();
        assertThat(unrelated).exists();
    }

    @Test
    void refusesAnUnsafeMigrationCandidateBeforeDeletingAnyManagedState() throws Exception {
        Path config = Files.createDirectories(root.resolve("data/config"));
        Path managed = ownerOnly(config.resolve("managed-application.yml"));
        Path external = ownerOnly(root.resolve("outside-secret"));
        Path linked = config.resolve("migration-candidates/operation-1/candidate-1/managed-secrets.properties");
        Files.createDirectories(linked.getParent());
        try {
            Files.createSymbolicLink(linked, external);
        } catch (UnsupportedOperationException unsupported) {
            return;
        }

        assertThrows(IOException.class, () -> new FactoryResetLocalStateCleaner(root).clearManagedState());
        assertThat(managed).exists();
        assertThat(external).exists();
    }

    private static Path ownerOnly(Path path) throws Exception {
        Files.createDirectories(path.getParent());
        Files.writeString(path, "test");
        if (Files.getFileStore(path).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rw-------"));
        }
        return path;
    }
}
