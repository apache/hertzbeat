/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.security;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Cooperative cross-context and cross-process lock for secure setup-file transactions.
 * A missing trusted root is created through the secure setup-file path boundary. Non-cooperating
 * same-owner code must not unlink lock entries during a transaction; Java/NIO cannot exclude that
 * actor portably. Identity checks detect replacement, while cooperating writers use the stable inode.
 */
public final class SecureSetupFileLock {

    private static final ConcurrentMap<Path, ReentrantLock> JVM_LOCKS = new ConcurrentHashMap<>();
    private static final ConcurrentMap<Path, String> JVM_IDENTITIES = new ConcurrentHashMap<>();
    private static final String IDENTITY_PREFIX = "secure-setup-lock-v1:";
    private static final int MAXIMUM_IDENTITY_BYTES = 80;
    private final Path installationRoot;
    private final Path lockFile;
    private final ReentrantLock jvmLock;

    public SecureSetupFileLock(Path installationRoot, String relativePath) {
        this.installationRoot = canonicalRoot(installationRoot);
        lockFile = this.installationRoot.resolve(relativePath).normalize();
        if (!lockFile.startsWith(this.installationRoot)) {
            throw new IllegalArgumentException("Secure setup-file lock must remain inside the installation root");
        }
        // FileChannel.lock throws OverlappingFileLockException instead of waiting inside one JVM.
        jvmLock = JVM_LOCKS.computeIfAbsent(lockFile, ignored -> new ReentrantLock(true));
    }

    public <T> T execute(IoOperation<T> operation) throws IOException {
        jvmLock.lock();
        try {
            LockIdentity identity = initializeAndValidate();
            try (FileChannel channel = FileChannel.open(
                    lockFile, Set.of(StandardOpenOption.READ, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS));
                 FileLock ignored = channel.lock()) {
                validateLockedIdentity(channel, identity);
                T result = operation.run();
                validateLockedIdentity(channel, identity);
                return result;
            }
        } finally {
            jvmLock.unlock();
        }
    }

    public void execute(IoAction action) throws IOException {
        execute(() -> {
            action.run();
            return null;
        });
    }

    /** Validates an existing lock without creating, replacing, or otherwise mutating it. */
    public static boolean isValidExistingLock(Path installationRoot, String relativePath) {
        Objects.requireNonNull(installationRoot, "installationRoot");
        Objects.requireNonNull(relativePath, "relativePath");
        byte[] encoded = null;
        try {
            Path root = installationRoot.toAbsolutePath().normalize().toRealPath();
            Path lock = root.resolve(relativePath).normalize();
            if (!lock.startsWith(root) || lock.equals(root)
                    || !SecureSetupFile.isOwnerOnlyRegularFile(lock)) {
                return false;
            }
            encoded = SecureSetupFile.readOwnerOnlyWithoutLinks(root, lock, MAXIMUM_IDENTITY_BYTES);
            validateIdentity(new String(encoded, StandardCharsets.UTF_8));
            return true;
        } catch (IOException | RuntimeException failure) {
            return false;
        } finally {
            if (encoded != null) {
                Arrays.fill(encoded, (byte) 0);
            }
        }
    }

    private LockIdentity initializeAndValidate() throws IOException {
        try {
            String created = IDENTITY_PREFIX + UUID.randomUUID() + '\n';
            SecureSetupFile.create(installationRoot, lockFile, created.getBytes(StandardCharsets.UTF_8));
        } catch (FileAlreadyExistsException existing) {
            // Cooperating contexts converge on the existing owner-only inode.
        }
        validate();
        SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, lockFile);
        String observed = readPathIdentity();
        String expected = JVM_IDENTITIES.putIfAbsent(lockFile, observed);
        if (expected != null && !expected.equals(observed)) {
            throw new IOException("Secure setup-file lock identity changed");
        }
        return new LockIdentity(observed, readPathFileKey());
    }

    private void validate() throws IOException {
        if (!SecureSetupFile.existsInsideRootWithoutLinks(installationRoot, lockFile)
                || !SecureSetupFile.isOwnerOnlyRegularFile(lockFile)) {
            throw new IOException("Secure setup-file lock is invalid");
        }
    }

    private void validateLockedIdentity(FileChannel channel, LockIdentity expected) throws IOException {
        validate();
        if (!expected.token().equals(readChannelIdentity(channel))
                || !Objects.equals(expected.fileKey(), readPathFileKey())) {
            throw new IOException("Secure setup-file lock identity changed");
        }
    }

    private Object readPathFileKey() throws IOException {
        BasicFileAttributes attributes = Files.readAttributes(
                lockFile, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        if (attributes.fileKey() == null) {
            throw new IOException("Secure setup-file lock identity is unavailable");
        }
        return attributes.fileKey();
    }

    private String readPathIdentity() throws IOException {
        byte[] encoded = SecureSetupFile.readOwnerOnlyWithoutLinks(
                installationRoot, lockFile, MAXIMUM_IDENTITY_BYTES);
        return validateIdentity(new String(encoded, StandardCharsets.UTF_8));
    }

    private String readChannelIdentity(FileChannel channel) throws IOException {
        long size = channel.size();
        if (size <= 0 || size > MAXIMUM_IDENTITY_BYTES) {
            throw new IOException("Secure setup-file lock identity is invalid");
        }
        ByteBuffer encoded = ByteBuffer.allocate((int) size);
        channel.position(0);
        while (encoded.hasRemaining() && channel.read(encoded) >= 0) {
            // Continue until the bounded identity is complete.
        }
        return validateIdentity(new String(encoded.array(), StandardCharsets.UTF_8));
    }

    private static String validateIdentity(String encoded) throws IOException {
        String identity = encoded.strip();
        if (!identity.startsWith(IDENTITY_PREFIX)) {
            throw new IOException("Secure setup-file lock identity is invalid");
        }
        try {
            UUID.fromString(identity.substring(IDENTITY_PREFIX.length()));
            return identity;
        } catch (IllegalArgumentException invalid) {
            throw new IOException("Secure setup-file lock identity is invalid");
        }
    }

    private static Path canonicalRoot(Path root) {
        try {
            return SecureSetupFile.prepareTrustedRoot(root);
        } catch (IOException failure) {
            throw new IllegalArgumentException("Secure setup-file root is unsafe");
        }
    }

    private record LockIdentity(String token, Object fileKey) {
    }

    /** I/O operation serialized by the cooperative lock. */
    @FunctionalInterface
    public interface IoOperation<T> {
        T run() throws IOException;
    }

    /** I/O action serialized by the cooperative lock. */
    @FunctionalInterface
    public interface IoAction {
        void run() throws IOException;
    }
}
