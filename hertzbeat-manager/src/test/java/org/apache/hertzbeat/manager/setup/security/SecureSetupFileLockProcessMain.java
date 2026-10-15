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

import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/** Child-JVM fixture proving the cooperative lock's operating-system boundary. */
public final class SecureSetupFileLockProcessMain {

    private static final String LOCK_PATH = "data/config/.cooperative-test.lock";

    private SecureSetupFileLockProcessMain() {
    }

    public static void main(String[] arguments) throws Exception {
        Path root = Path.of(arguments[0]);
        Path ready = Path.of(arguments[1]);
        Path entered = Path.of(arguments[2]);
        Path release = Path.of(arguments[3]);
        SecureSetupFileLock lock = new SecureSetupFileLock(root, LOCK_PATH);
        Path canonicalRoot = root.toRealPath();
        Path lockFile = canonicalRoot.resolve(LOCK_PATH);
        if (!SecureSetupFile.existsInsideRootWithoutLinks(canonicalRoot, lockFile)
                || !SecureSetupFile.isOwnerOnlyRegularFile(lockFile)) {
            throw new IllegalStateException("Child lock probe path is invalid");
        }
        requireOperatingSystemConflict(lockFile);
        Files.writeString(ready, "blocked-by-os-lock");
        lock.execute(() -> {
            Files.createFile(entered);
            awaitRelease(release);
        });
    }

    private static void requireOperatingSystemConflict(Path lockFile) throws Exception {
        try (FileChannel channel = FileChannel.open(lockFile,
                Set.of(StandardOpenOption.READ, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS))) {
            try (FileLock acquired = channel.tryLock()) {
                if (acquired != null) {
                    throw new IllegalStateException("Child unexpectedly acquired the parent OS lock");
                }
            }
        }
    }

    private static void awaitRelease(Path release) {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(10));
        while (!Files.exists(release) && Instant.now().isBefore(deadline)) {
            Thread.onSpinWait();
        }
        if (!Files.exists(release)) {
            throw new IllegalStateException("Parent did not release child lock fixture");
        }
    }

}
