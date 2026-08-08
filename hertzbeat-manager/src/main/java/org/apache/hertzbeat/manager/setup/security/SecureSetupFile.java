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

package org.apache.hertzbeat.manager.setup.security;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Set;

/** Creates a new local secret without following links or exposing permissive content. */
public final class SecureSetupFile {
    private static final Set<PosixFilePermission> OWNER_READ_WRITE =
            PosixFilePermissions.fromString("rw-------");

    private SecureSetupFile() {
    }

    public static void ensureSafeParent(Path target) throws IOException {
        Path parent = target.getParent();
        Files.createDirectories(parent);
        if (Files.isSymbolicLink(parent)) {
            throw new IOException("Setup secret parent must not be a symbolic link");
        }
    }

    public static void create(Path target, byte[] content) throws IOException {
        Path resolvedTarget = target.getParent().toRealPath().resolve(target.getFileName());
        if (!Files.getFileStore(resolvedTarget.getParent()).supportsFileAttributeView("posix")) {
            throw new IOException("Owner-only setup secrets require POSIX file permissions");
        }
        try (FileChannel channel = FileChannel.open(resolvedTarget,
                Set.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS),
                PosixFilePermissions.asFileAttribute(OWNER_READ_WRITE))) {
            ByteBuffer buffer = ByteBuffer.wrap(content);
            while (buffer.hasRemaining()) {
                channel.write(buffer);
            }
            channel.force(true);
        }
    }

    public static boolean isOwnerOnlyRegularFile(Path target) throws IOException {
        if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)
                || !Files.getFileStore(target).supportsFileAttributeView("posix")) {
            return false;
        }
        return Files.getPosixFilePermissions(target, LinkOption.NOFOLLOW_LINKS).equals(OWNER_READ_WRITE);
    }
}
