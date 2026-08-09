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
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileAttribute;
import java.util.Arrays;
import java.util.Set;

/** Secure creation, permission enforcement, and bounded reading of local setup files. */
public final class SecureSetupFile {
    private SecureSetupFile() {
    }

    /**
     * Creates below an operator-controlled root whose descendants cannot be concurrently replaced by untrusted users.
     */
    public static void create(Path trustedRoot, Path target, byte[] content) throws IOException {
        Path absoluteRoot = absolute(trustedRoot);
        Path absoluteTarget = absolute(target);
        if (!absoluteTarget.startsWith(absoluteRoot) || absoluteTarget.equals(absoluteRoot)) {
            throw new IOException("Setup file resolves outside its trusted root");
        }
        createMissingParents(absoluteRoot);
        Path resolvedRoot = absoluteRoot.toRealPath();
        Path resolvedTarget = resolvedRoot.resolve(absoluteRoot.relativize(absoluteTarget));
        createSafeDescendants(resolvedRoot, resolvedTarget.getParent());
        if (Files.exists(resolvedTarget, LinkOption.NOFOLLOW_LINKS)) {
            throw new FileAlreadyExistsException("Setup file already exists");
        }
        FileAttribute<?>[] attributes = OwnerOnlyFilePermissions.creationAttributes(resolvedTarget.getParent());
        boolean created = false;
        try {
            try (FileChannel channel = FileChannel.open(resolvedTarget,
                    Set.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS),
                    attributes)) {
                created = true;
                enforceOwnerOnly(resolvedTarget);
                writeAndForce(channel, content);
            }
        } catch (IOException | RuntimeException failure) {
            if (created) {
                Files.deleteIfExists(resolvedTarget);
            }
            throw failure;
        }
    }

    public static void enforceOwnerOnly(Path target) throws IOException {
        OwnerOnlyFilePermissions.enforce(absolute(target));
    }

    public static boolean isOwnerOnlyRegularFile(Path target) throws IOException {
        Path absoluteTarget = absolute(target);
        if (!Files.isRegularFile(absoluteTarget, LinkOption.NOFOLLOW_LINKS)) {
            return false;
        }
        return OwnerOnlyFilePermissions.isReadableOwnerOnly(absoluteTarget);
    }

    public static byte[] readOwnerOnly(Path trustedRoot, Path target, int maximumBytes) throws IOException {
        return readResolvedOwnerOnly(resolveInsideRoot(trustedRoot, target), maximumBytes);
    }

    public static byte[] readOwnerOnlyWithoutLinks(Path trustedRoot, Path target, int maximumBytes)
            throws IOException {
        return readResolvedOwnerOnly(resolveWithoutLinksInsideRoot(trustedRoot, target), maximumBytes);
    }

    public static boolean existsInsideRootWithoutLinks(Path trustedRoot, Path target) throws IOException {
        if (Files.isSymbolicLink(absolute(target))) {
            return false;
        }
        return Files.exists(resolveWithoutLinksInsideRoot(trustedRoot, target), LinkOption.NOFOLLOW_LINKS);
    }

    public static boolean deleteOwnerOnlyInsideRoot(Path trustedRoot, Path target) throws IOException {
        Path resolvedTarget = resolveWithoutLinksInsideRoot(trustedRoot, target);
        if (!Files.exists(resolvedTarget, LinkOption.NOFOLLOW_LINKS)) {
            return false;
        }
        if (!isOwnerOnlyRegularFile(resolvedTarget)) {
            throw new IOException("Setup file is not an owner-only regular file");
        }
        Files.delete(resolvedTarget);
        return true;
    }

    /**
     * Forces the target's parent directory on POSIX providers after a directory-entry mutation.
     *
     * @return {@code false} when the provider has no POSIX directory-fsync contract; the owner-only forced-file
     *         guarantee remains intact on that provider
     */
    public static boolean forceParentDirectoryIfSupported(Path trustedRoot, Path target) throws IOException {
        Path parent = resolveWithoutLinksInsideRoot(trustedRoot, target).getParent();
        if (!Files.getFileStore(parent).supportsFileAttributeView("posix")) {
            return false;
        }
        try (FileChannel channel = FileChannel.open(
                parent, Set.of(StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS))) {
            channel.force(true);
        }
        return true;
    }

    static Path prepareTrustedRoot(Path trustedRoot) throws IOException {
        Path absoluteRoot = absolute(trustedRoot);
        if (!Files.exists(absoluteRoot, LinkOption.NOFOLLOW_LINKS)) {
            createMissingParents(absoluteRoot);
        }
        return absoluteRoot.toRealPath();
    }

    /**
     * Publishes an already-forced owner-only temporary file without exposing a partial replacement.
     * Providers without atomic-move support fail closed; callers must not downgrade to a non-atomic move.
     */
    public static void atomicReplace(Path trustedRoot, Path source, Path target) throws IOException {
        atomicReplace(trustedRoot, source, target,
                replaced -> forceParentDirectoryIfSupported(trustedRoot, replaced));
    }

    static void atomicReplace(
            Path trustedRoot, Path source, Path target, ParentDirectorySync parentDirectorySync) throws IOException {
        Path resolvedSource = resolveWithoutLinksInsideRoot(trustedRoot, source);
        Path resolvedTarget = resolveWithoutLinksInsideRoot(trustedRoot, target);
        if (!isOwnerOnlyRegularFile(resolvedSource) || !resolvedSource.getParent().equals(resolvedTarget.getParent())) {
            throw new IOException("Setup replacement source is invalid");
        }
        if (Files.exists(resolvedTarget, LinkOption.NOFOLLOW_LINKS)
                && !isOwnerOnlyRegularFile(resolvedTarget)) {
            throw new IOException("Setup replacement target is invalid");
        }
        Files.move(resolvedSource, resolvedTarget, StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING);
        try {
            parentDirectorySync.force(target);
        } catch (IOException failure) {
            throw new CommittedSetupFileDurabilityException();
        }
    }

    private static byte[] readResolvedOwnerOnly(Path resolvedTarget, int maximumBytes) throws IOException {
        if (!isOwnerOnlyRegularFile(resolvedTarget)) {
            throw new IOException("Setup file is not an owner-only regular file");
        }
        byte[] content = null;
        try {
            try (FileChannel channel = FileChannel.open(
                    resolvedTarget, Set.of(StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS))) {
                long size = channel.size();
                if (size <= 0 || size > maximumBytes) {
                    throw new IOException("Setup file size is invalid");
                }
                content = new byte[(int) size];
                SecureFileChannelReader.readAndValidate(channel, content, () -> {
                    if (channel.size() != size || !isOwnerOnlyRegularFile(resolvedTarget)) {
                        throw new IOException("Setup file changed while it was read");
                    }
                });
            }
            byte[] transferred = content;
            content = null;
            return transferred;
        } finally {
            if (content != null) {
                Arrays.fill(content, (byte) 0);
            }
        }
    }

    static Path resolveInsideRoot(Path trustedRoot, Path target) throws IOException {
        Path resolvedRoot = absolute(trustedRoot).toRealPath();
        Path resolvedTarget = absolute(target).toRealPath();
        if (!resolvedTarget.startsWith(resolvedRoot) || resolvedTarget.equals(resolvedRoot)) {
            throw new IOException("Setup file resolves outside its trusted root");
        }
        return resolvedTarget;
    }

    private static Path resolveWithoutLinksInsideRoot(Path trustedRoot, Path target) throws IOException {
        Path absoluteRoot = absolute(trustedRoot);
        Path absoluteTarget = absolute(target);
        if (!absoluteTarget.startsWith(absoluteRoot) || absoluteTarget.equals(absoluteRoot)) {
            throw new IOException("Setup file resolves outside its trusted root");
        }
        Path current = absoluteRoot.toRealPath();
        for (Path segment : absoluteRoot.relativize(absoluteTarget)) {
            current = current.resolve(segment);
            if (Files.isSymbolicLink(current)) {
                throw new IOException("Setup file path contains a symbolic link");
            }
        }
        return current;
    }

    private static void createMissingParents(Path parent) throws IOException {
        Path existing = parent;
        while (existing != null && !Files.exists(existing, LinkOption.NOFOLLOW_LINKS)) {
            existing = existing.getParent();
        }
        if (existing == null || Files.isSymbolicLink(existing)
                || !Files.isDirectory(existing, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("Setup file parent path is unsafe");
        }
        Path current = existing;
        for (Path segment : existing.relativize(parent)) {
            current = current.resolve(segment);
            createDirectoryWithoutFollowingLinks(current);
        }
    }

    private static void createDirectoryWithoutFollowingLinks(Path directory) throws IOException {
        try {
            Files.createDirectory(directory);
        } catch (FileAlreadyExistsException ignored) {
            // A concurrent creator is safe only when the resulting entry is a real directory.
        }
        if (Files.isSymbolicLink(directory) || !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("Setup file parent path is unsafe");
        }
    }

    private static void createSafeDescendants(Path trustedRoot, Path parent) throws IOException {
        Path current = trustedRoot;
        for (Path segment : trustedRoot.relativize(parent)) {
            current = current.resolve(segment);
            createDirectoryWithoutFollowingLinks(current);
        }
    }

    private static void writeAndForce(FileChannel channel, byte[] content) throws IOException {
        ByteBuffer buffer = ByteBuffer.wrap(content);
        while (buffer.hasRemaining()) {
            channel.write(buffer);
        }
        channel.force(true);
    }

    private static Path absolute(Path path) {
        return path.toAbsolutePath().normalize();
    }

    @FunctionalInterface
    interface ParentDirectorySync {
        void force(Path target) throws IOException;
    }
}
