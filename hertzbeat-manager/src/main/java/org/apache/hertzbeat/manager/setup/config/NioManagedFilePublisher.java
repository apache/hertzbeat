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

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import org.apache.hertzbeat.manager.setup.security.CommittedSetupFileDurabilityException;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Durable temp-write, file-fsync, replace, and directory-fsync publication. */
final class NioManagedFilePublisher implements ManagedFileIo.Publisher {

    private final ManagedFileIo.Operations operations;

    NioManagedFilePublisher() {
        this(new NioOperations());
    }

    NioManagedFilePublisher(ManagedFileIo.Operations operations) {
        this.operations = operations;
    }

    @Override
    public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
        Path directory = target.toAbsolutePath().getParent();
        Files.createDirectories(directory);
        Path temporary = ownerOnly
                ? directory.resolve(".managed-config-" + UUID.randomUUID() + ".tmp")
                : Files.createTempFile(directory, ".managed-config-", ".tmp");
        try {
            if (ownerOnly) {
                SecureSetupFile.create(directory, temporary, content);
            } else {
                writeAndForce(temporary, content);
            }
            replaceAndForce(temporary, target);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    @Override
    public void remove(Path target) throws IOException {
        if (Files.deleteIfExists(target)) {
            forceCommittedDirectory(target);
        }
    }

    @Override
    public void confirmDurability(Path target) throws IOException {
        operations.forceDirectory(target.toAbsolutePath().getParent());
    }

    private void replaceAndForce(Path source, Path target) throws IOException {
        operations.atomicReplace(source, target);
        forceCommittedDirectory(target);
    }

    private void forceCommittedDirectory(Path target) throws IOException {
        try {
            confirmDurability(target);
        } catch (IOException failure) {
            throw new CommittedSetupFileDurabilityException();
        }
    }

    private static void writeAndForce(Path target, byte[] content) throws IOException {
        try (FileChannel channel = FileChannel.open(
                target, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING)) {
            ByteBuffer buffer = ByteBuffer.wrap(content);
            while (buffer.hasRemaining()) {
                channel.write(buffer);
            }
            channel.force(true);
        }
    }

    private static final class NioOperations implements ManagedFileIo.Operations {

        @Override
        public void atomicReplace(Path source, Path target) throws IOException {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        }

        @Override
        public void forceDirectory(Path directory) throws IOException {
            if (!Files.getFileStore(directory).supportsFileAttributeView("posix")) {
                return;
            }
            try (FileChannel channel = FileChannel.open(directory, StandardOpenOption.READ)) {
                channel.force(true);
            }
        }
    }

}
