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
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFileLock;

/** Owner-only, monotonic file state for a complete installation reset. */
public final class FileFactoryResetStateStore implements FactoryResetStateStore {

    public static final String REQUESTED_RELATIVE_PATH = "data/config/factory-reset-requested";
    public static final String CLEANED_RELATIVE_PATH = "data/config/factory-reset-cleaned";
    private static final String LOCK_RELATIVE_PATH = "data/config/.factory-reset.lock";
    private static final String REQUESTED_VALUE = "RESET_REQUESTED";
    private static final String CLEANED_VALUE = "RESET_CLEANED";
    private static final int MAXIMUM_BYTES = 64;
    private final Path installationRoot;
    private final Marker requested;
    private final Marker cleaned;
    private final SecureSetupFileLock resetLock;

    public FileFactoryResetStateStore(Path installationRoot) {
        this.installationRoot = Objects.requireNonNull(installationRoot, "installationRoot")
                .toAbsolutePath().normalize();
        requested = marker(REQUESTED_RELATIVE_PATH, REQUESTED_VALUE);
        cleaned = marker(CLEANED_RELATIVE_PATH, CLEANED_VALUE);
        resetLock = new SecureSetupFileLock(this.installationRoot, LOCK_RELATIVE_PATH);
    }

    @Override
    public Optional<State> load() throws IOException {
        return resetLock.execute(this::loadLocked);
    }

    @Override
    public void request() throws IOException {
        resetLock.execute(() -> {
            if (!exists(cleaned)) {
                create(requested);
            }
        });
    }

    @Override
    public void markCleaned() throws IOException {
        resetLock.execute(() -> {
            if (!exists(requested)) {
                throw new IOException("Factory reset cannot complete without a durable request");
            }
            create(cleaned);
        });
    }

    @Override
    public void clearCompleted() throws IOException {
        resetLock.execute(() -> {
            if (!exists(cleaned)) {
                return;
            }
            delete(cleaned);
            delete(requested);
        });
    }

    private Optional<State> loadLocked() throws IOException {
        boolean requestedPresent = exists(requested);
        boolean cleanedPresent = exists(cleaned);
        if (cleanedPresent && !requestedPresent) {
            throw new IOException("Factory reset state is incomplete");
        }
        if (cleanedPresent) {
            return Optional.of(State.CLEANED);
        }
        return requestedPresent ? Optional.of(State.REQUESTED) : Optional.empty();
    }

    private void create(Marker marker) throws IOException {
        byte[] encoded = marker.value().getBytes(StandardCharsets.UTF_8);
        try {
            SecureSetupFile.create(installationRoot, marker.path(), encoded);
        } catch (FileAlreadyExistsException existing) {
            if (!exists(marker)) {
                throw new IOException("Factory reset marker disappeared during creation");
            }
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
        SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, marker.path());
    }

    private void delete(Marker marker) throws IOException {
        SecureSetupFile.deleteOwnerOnlyInsideRoot(installationRoot, marker.path());
        SecureSetupFile.forceParentDirectoryIfSupported(installationRoot, marker.path());
    }

    private boolean exists(Marker marker) throws IOException {
        if (!Files.exists(marker.path(), LinkOption.NOFOLLOW_LINKS)) {
            return false;
        }
        byte[] encoded = SecureSetupFile.readOwnerOnlyWithoutLinks(
                installationRoot, marker.path(), MAXIMUM_BYTES);
        try {
            if (!marker.value().equals(new String(encoded, StandardCharsets.UTF_8).strip())) {
                throw new IOException("Factory reset marker is invalid");
            }
            return true;
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
    }

    private Marker marker(String relativePath, String value) {
        return new Marker(installationRoot.resolve(relativePath), value);
    }

    private record Marker(Path path, String value) {
    }
}
