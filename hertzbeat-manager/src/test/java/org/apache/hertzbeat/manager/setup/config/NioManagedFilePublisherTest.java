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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class NioManagedFilePublisherTest {

    @TempDir
    private Path temporaryDirectory;

    @Test
    void failsClosedWhenAtomicMoveIsUnsupportedAndPreservesTheActiveFile() throws Exception {
        AtomicInteger atomicMoves = new AtomicInteger();
        AtomicInteger directoryForces = new AtomicInteger();
        ManagedFileIo.Operations operations = new ManagedFileIo.Operations() {
            @Override
            public void atomicReplace(Path source, Path target) throws IOException {
                atomicMoves.incrementAndGet();
                throw new AtomicMoveNotSupportedException(source.toString(), target.toString(), "injected");
            }

            @Override
            public void forceDirectory(Path directory) {
                directoryForces.incrementAndGet();
            }
        };
        NioManagedFilePublisher publisher = new NioManagedFilePublisher(operations);
        Path target = temporaryDirectory.resolve("managed.yml");
        Files.writeString(target, "active", StandardCharsets.UTF_8);

        assertThrows(AtomicMoveNotSupportedException.class,
                () -> publisher.publish(target, "candidate".getBytes(StandardCharsets.UTF_8), false));

        assertEquals(1, atomicMoves.get());
        assertEquals(0, directoryForces.get());
        assertEquals("active", Files.readString(target, StandardCharsets.UTF_8));
    }

    @Test
    void doesNotHideRealAtomicMoveFailuresOrForceDirectoryAfterFailure() {
        AtomicInteger directoryForces = new AtomicInteger();
        ManagedFileIo.Operations operations = new ManagedFileIo.Operations() {
            @Override
            public void atomicReplace(Path source, Path target) throws IOException {
                throw new IOException("permission denied");
            }

            @Override
            public void forceDirectory(Path directory) {
                directoryForces.incrementAndGet();
            }
        };
        NioManagedFilePublisher publisher = new NioManagedFilePublisher(operations);

        IOException failure = assertThrows(IOException.class, () -> publisher.publish(
                temporaryDirectory.resolve("managed.yml"), "content".getBytes(StandardCharsets.UTF_8), false));

        assertEquals("permission denied", failure.getMessage());
        assertEquals(0, directoryForces.get());
    }

    @Test
    void ownerOnlyPublicationFailsWhenFileSystemHasNoPosixOrAclBoundary() throws Exception {
        Path archive = temporaryDirectory.resolve("basic-only.zip");
        URI uri = URI.create("jar:" + archive.toUri());
        try (FileSystem fileSystem = FileSystems.newFileSystem(uri, Map.of("create", "true"))) {
            Path target = fileSystem.getPath("/managed-secrets.properties");
            NioManagedFilePublisher publisher = new NioManagedFilePublisher();

            IOException failure = assertThrows(IOException.class, () -> publisher.publish(
                    target, "secret-content".getBytes(StandardCharsets.UTF_8), true));

            assertEquals("Owner-only file permissions are unavailable", failure.getMessage());
            assertFalse(Files.exists(target));
        }
    }

    @Test
    void ownerOnlyPublicationSetsAndVerifiesPosixPermissions() throws Exception {
        assumeTrue(Files.getFileStore(temporaryDirectory).supportsFileAttributeView("posix"));
        Path target = temporaryDirectory.resolve("managed-secrets.properties");

        new NioManagedFilePublisher().publish(
                target, "secret-content".getBytes(StandardCharsets.UTF_8), true);

        assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(target));
    }
}
