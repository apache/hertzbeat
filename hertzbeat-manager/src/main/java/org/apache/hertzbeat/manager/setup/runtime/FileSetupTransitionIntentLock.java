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

package org.apache.hertzbeat.manager.setup.runtime;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Cooperative owner-only serialization for transition intent marker operations. */
final class FileSetupTransitionIntentLock {
    private static final String RELATIVE_PATH = "data/config/.setup-transition-intent.lock";
    private static final ConcurrentMap<Path, ReentrantLock> JVM_LOCKS = new ConcurrentHashMap<>();
    private final Path installationRoot;
    private final Path lockFile;
    private final ReentrantLock jvmLock;
    private boolean initialized;

    FileSetupTransitionIntentLock(Path installationRoot) {
        this(installationRoot, RELATIVE_PATH);
    }

    FileSetupTransitionIntentLock(Path installationRoot, String relativePath) {
        this.installationRoot = installationRoot.toAbsolutePath().normalize();
        lockFile = this.installationRoot.resolve(relativePath).normalize();
        if (!lockFile.startsWith(this.installationRoot)) {
            throw new IllegalArgumentException("Setup transition intent lock must remain inside the installation root");
        }
        // FileChannel.lock throws OverlappingFileLockException instead of waiting inside one JVM.
        jvmLock = JVM_LOCKS.computeIfAbsent(lockFile, ignored -> new ReentrantLock(true));
    }

    <T> T execute(IoOperation<T> operation) throws IOException {
        jvmLock.lock();
        try {
            initialize();
            validate();
            try (FileChannel channel = FileChannel.open(
                    lockFile, Set.of(StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS));
                 FileLock ignored = channel.lock()) {
                return operation.run();
            }
        } finally {
            jvmLock.unlock();
        }
    }

    void execute(IoAction action) throws IOException {
        execute(() -> {
            action.run();
            return null;
        });
    }

    private void initialize() throws IOException {
        if (initialized) {
            return;
        }
        try {
            SecureSetupFile.create(installationRoot, lockFile, new byte[] {'l', 'o', 'c', 'k', '\n'});
        } catch (FileAlreadyExistsException existing) {
            // The monotonic marker protocol remains correct if deployment replaces this lock inode.
        }
        validate();
        SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, lockFile);
        initialized = true;
    }

    private void validate() throws IOException {
        if (!SecureSetupFile.existsInsideRootWithoutLinks(installationRoot, lockFile)
                || !SecureSetupFile.isOwnerOnlyRegularFile(lockFile)) {
            throw new IOException("Setup transition intent lock is invalid");
        }
    }

    @FunctionalInterface
    interface IoOperation<T> {
        T run() throws IOException;
    }

    @FunctionalInterface
    interface IoAction {
        void run() throws IOException;
    }
}
