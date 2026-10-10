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

/** Owner-only, monotonic managed-file adapter for pending setup runtime transitions. */
public final class FileSetupTransitionIntentStore implements SetupTransitionIntentStore {
    static final String RELATIVE_PATH = "data/config/setup-transition-configuration";
    static final String COMPLETION_RELATIVE_PATH =
            "data/config/setup-transition-completion";
    static final String TERMINAL_RELATIVE_PATH =
            "data/config/setup-transition-closed";
    private static final String INSTALLATION_CLOSED = "INSTALLATION_CLOSED";
    private static final String LOCK_PATH = "data/config/.setup-transition-intent.lock";
    private static final int MAXIMUM_BYTES = 64;
    private final Path installationRoot;
    private final Marker configurationMarker;
    private final Marker completionMarker;
    private final Marker terminalMarker;
    private final ParentDirectorySync parentDirectorySync;
    private final SecureSetupFileLock intentLock;
    private final MarkerObservation markerObservation;

    public FileSetupTransitionIntentStore(Path installationRoot) {
        this(installationRoot, target -> SecureSetupFile.forceParentDirectoryIfSupported(
                installationRoot, target));
    }

    FileSetupTransitionIntentStore(Path installationRoot, ParentDirectorySync parentDirectorySync) {
        this(installationRoot, parentDirectorySync,
                new SecureSetupFileLock(installationRoot, LOCK_PATH), MarkerObservation.NONE);
    }

    FileSetupTransitionIntentStore(
            Path installationRoot, ParentDirectorySync parentDirectorySync,
            SecureSetupFileLock intentLock, MarkerObservation markerObservation) {
        this.installationRoot = Objects.requireNonNull(installationRoot, "installationRoot")
                .toAbsolutePath().normalize();
        configurationMarker = marker(RELATIVE_PATH, Intent.CONFIGURATION_APPLIED.name());
        completionMarker = marker(COMPLETION_RELATIVE_PATH, Intent.INSTALLATION_COMPLETED.name());
        terminalMarker = marker(TERMINAL_RELATIVE_PATH, INSTALLATION_CLOSED);
        this.parentDirectorySync = Objects.requireNonNull(parentDirectorySync, "parentDirectorySync");
        this.intentLock = Objects.requireNonNull(intentLock, "intentLock");
        this.markerObservation = Objects.requireNonNull(markerObservation, "markerObservation");
    }

    @Override
    public Optional<Intent> load() throws IOException {
        return intentLock.execute(this::loadLocked);
    }

    private Optional<Intent> loadLocked() throws IOException {
        if (exists(terminalMarker)) {
            return Optional.empty();
        }
        if (exists(completionMarker)) {
            return Optional.of(Intent.INSTALLATION_COMPLETED);
        }
        return exists(configurationMarker)
                ? Optional.of(Intent.CONFIGURATION_APPLIED) : Optional.empty();
    }

    @Override
    public void save(Intent requested) throws IOException {
        Objects.requireNonNull(requested, "requested");
        intentLock.execute(() -> saveLocked(requested));
    }

    private void saveLocked(Intent requested) throws IOException {
        if (exists(terminalMarker)) {
            parentDirectorySync.force(terminalMarker.path());
            return;
        }
        if (requested == Intent.INSTALLATION_COMPLETED) {
            create(completionMarker);
            return;
        }
        if (exists(completionMarker)) {
            parentDirectorySync.force(completionMarker.path());
            return;
        }
        create(configurationMarker);
    }

    @Override
    public void clear(Intent completed) throws IOException {
        Objects.requireNonNull(completed, "completed");
        intentLock.execute(() -> clearLocked(completed));
    }

    private void clearLocked(Intent completed) throws IOException {
        if (completed == Intent.INSTALLATION_COMPLETED) {
            if (exists(terminalMarker)) {
                parentDirectorySync.force(terminalMarker.path());
                return;
            }
            if (exists(completionMarker)) {
                create(terminalMarker);
            }
            return;
        }
        if (exists(configurationMarker)) {
            SecureSetupFile.deleteOwnerOnlyInsideRoot(installationRoot, configurationMarker.path());
            parentDirectorySync.force(configurationMarker.path());
        }
    }

    private void create(Marker marker) throws IOException {
        byte[] encoded = marker.value().getBytes(StandardCharsets.UTF_8);
        try {
            SecureSetupFile.create(installationRoot, marker.path(), encoded);
        } catch (FileAlreadyExistsException concurrent) {
            if (!exists(marker)) {
                throw new IOException("Setup transition marker disappeared during creation");
            }
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
        parentDirectorySync.force(marker.path());
    }

    private boolean exists(Marker marker) throws IOException {
        if (!Files.exists(marker.path(), LinkOption.NOFOLLOW_LINKS)) {
            markerObservation.observed(marker.path(), false);
            return false;
        }
        byte[] encoded = SecureSetupFile.readOwnerOnlyWithoutLinks(
                installationRoot, marker.path(), MAXIMUM_BYTES);
        try {
            String value = new String(encoded, StandardCharsets.UTF_8).strip();
            if (!marker.value().equals(value)) {
                throw new IOException("Setup transition marker is invalid");
            }
            markerObservation.observed(marker.path(), true);
            return true;
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
    }

    private Marker marker(String relativePath, String value) {
        return new Marker(installationRoot.resolve(relativePath), value);
    }

    private record Marker(Path path, String value) { }

    @FunctionalInterface
    interface ParentDirectorySync {
        void force(Path target) throws IOException;
    }

    @FunctionalInterface
    interface MarkerObservation {
        MarkerObservation NONE = (path, present) -> { };

        void observed(Path path, boolean present) throws IOException;
    }
}
