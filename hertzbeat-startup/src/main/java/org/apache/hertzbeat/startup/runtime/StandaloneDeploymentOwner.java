/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Process-lifetime OS owner for one canonical standalone installation root. */
public final class StandaloneDeploymentOwner implements AutoCloseable {

    static final String LOCK_PATH = "data/config/.standalone-deployment-owner.lock";
    private static final byte[] LOCK_CONTENT = "standalone-deployment-owner-v1\n"
            .getBytes(StandardCharsets.UTF_8);
    private final Path declaredRoot;
    private final Path canonicalRoot;
    private final Path lockPath;
    private final Object rootFileKey;
    private final Object lockFileKey;
    private final FileChannel channel;
    private final FileLock fileLock;
    private final StandaloneDeploymentOwnerView view = new OwnerView();
    private boolean closed;

    private StandaloneDeploymentOwner(
            ResolvedStartupInstallationRoot root,
            Path lockPath,
            Object rootFileKey,
            Object lockFileKey,
            FileChannel channel,
            FileLock fileLock) {
        declaredRoot = root.declaredRoot();
        canonicalRoot = root.canonicalRoot();
        this.lockPath = lockPath;
        this.rootFileKey = rootFileKey;
        this.lockFileKey = lockFileKey;
        this.channel = channel;
        this.fileLock = fileLock;
    }

    static StandaloneDeploymentOwner acquire(ResolvedStartupInstallationRoot root) {
        Path lockPath = root.canonicalRoot().resolve(LOCK_PATH);
        FileChannel channel = null;
        FileLock fileLock = null;
        try {
            requireLocalFileStore(root.canonicalRoot());
            initializeLockFile(root.canonicalRoot(), lockPath);
            Object rootKey = fileKey(root.canonicalRoot());
            Object lockKey = fileKey(lockPath);
            channel = FileChannel.open(lockPath,
                    Set.of(StandardOpenOption.READ, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS));
            fileLock = channel.tryLock();
            if (fileLock == null) {
                throw StandaloneDeploymentOwnerException.unavailable();
            }
            return new StandaloneDeploymentOwner(root, lockPath, rootKey, lockKey, channel, fileLock);
        } catch (IOException | RuntimeException exception) {
            closeQuietly(fileLock, channel);
            if (exception instanceof StandaloneDeploymentOwnerException ownerFailure) {
                throw ownerFailure;
            }
            throw StandaloneDeploymentOwnerException.unavailable();
        }
    }

    public StandaloneDeploymentOwnerView view() {
        return view;
    }

    public Path installationRoot() {
        return canonicalRoot;
    }

    public synchronized boolean isValid() {
        if (closed || !fileLock.isValid()) {
            return false;
        }
        try {
            return declaredRoot.toRealPath().equals(canonicalRoot)
                    && Objects.equals(rootFileKey, fileKey(canonicalRoot))
                    && !Files.isSymbolicLink(lockPath)
                    && SecureSetupFile.isOwnerOnlyRegularFile(lockPath)
                    && Objects.equals(lockFileKey, fileKey(lockPath));
        } catch (IOException | RuntimeException exception) {
            return false;
        }
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }
        closed = true;
        closeQuietly(fileLock, channel);
    }

    private static void initializeLockFile(Path root, Path lockPath) throws IOException {
        try {
            SecureSetupFile.create(root, lockPath, LOCK_CONTENT);
        } catch (FileAlreadyExistsException existing) {
            // The lock inode is persistent and is never unlinked during normal shutdown.
        }
        if (!SecureSetupFile.existsInsideRootWithoutLinks(root, lockPath)
                || !SecureSetupFile.isOwnerOnlyRegularFile(lockPath)) {
            throw new IOException("Standalone deployment owner lock is invalid");
        }
        SecureSetupFile.forceParentDirectoryIfSupported(root, lockPath);
    }

    private static Object fileKey(Path path) throws IOException {
        Object key = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey();
        if (key == null) {
            throw new IOException("Standalone deployment owner identity is unavailable");
        }
        return key;
    }

    private static void requireLocalFileStore(Path root) throws IOException {
        if (!StandaloneFileStorePolicy.supportsProcessOwnership(Files.getFileStore(root).type())) {
            throw new IOException("Standalone deployment owner requires a local file store");
        }
    }

    private static void closeQuietly(FileLock lock, FileChannel channel) {
        try {
            if (lock != null) {
                lock.close();
            }
        } catch (IOException exception) {
            // The channel close below remains the final OS-lock release attempt.
        }
        try {
            if (channel != null) {
                channel.close();
            }
        } catch (IOException exception) {
            // Startup/shutdown reports only stable ownership state.
        }
    }

    private final class OwnerView implements StandaloneDeploymentOwnerView {

        @Override
        public Path installationRoot() {
            return canonicalRoot;
        }

        @Override
        public boolean isValid() {
            return StandaloneDeploymentOwner.this.isValid();
        }
    }
}
