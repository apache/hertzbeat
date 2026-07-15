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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Owns the candidate, active, and last-known-good runtime configuration files.
 */
public class OtelRuntimeConfigTransaction {

    private static final String LAST_KNOWN_GOOD_SUFFIX = ".last-known-good";

    private final OtelRuntimeConfigRenderer renderer;

    public OtelRuntimeConfigTransaction(OtelRuntimeConfigRenderer renderer) {
        this.renderer = renderer;
    }

    /**
     * Render an isolated candidate which may be validated without changing the active configuration.
     *
     * @param properties runtime properties
     * @return prepared file locations
     * @throws IOException when the candidate cannot be written
     */
    public PreparedConfig prepare(OtelRuntimeProperties properties) throws IOException {
        Path active = renderer.activePath(properties);
        Path lastKnownGood = active.resolveSibling(active.getFileName() + LAST_KNOWN_GOOD_SUFFIX);
        return new PreparedConfig(renderer.renderCandidate(properties), active, lastKnownGood);
    }

    /**
     * Preserve the current active file and atomically activate a validated candidate.
     *
     * @param prepared prepared file locations
     * @return active configuration path
     * @throws IOException when the active configuration cannot be replaced safely
     */
    public Path commit(PreparedConfig prepared) throws IOException {
        if (Files.exists(prepared.active())) {
            publishCopy(prepared.active(), prepared.lastKnownGood());
        }
        atomicReplace(prepared.candidate(), prepared.active());
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(prepared.active());
        return prepared.active();
    }

    /**
     * Restore the preserved configuration while keeping it available for later recovery.
     *
     * @param prepared prepared file locations
     * @return {@code true} when a last-known-good configuration was restored
     * @throws IOException when restoration fails
     */
    public boolean rollback(PreparedConfig prepared) throws IOException {
        if (!Files.exists(prepared.lastKnownGood())) {
            return false;
        }
        publishCopy(prepared.lastKnownGood(), prepared.active());
        return true;
    }

    /**
     * Remove a rejected candidate.
     *
     * @param prepared prepared file locations
     * @throws IOException when the candidate cannot be removed
     */
    public void discard(PreparedConfig prepared) throws IOException {
        Files.deleteIfExists(prepared.candidate());
    }

    private static void publishCopy(Path source, Path target) throws IOException {
        Files.createDirectories(target.getParent());
        Path temporary = Files.createTempFile(target.getParent(), "otel-runtime-", ".yaml.tmp");
        try {
            Files.copy(source, temporary, StandardCopyOption.REPLACE_EXISTING);
            OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(temporary);
            atomicReplace(temporary, target);
        } finally {
            Files.deleteIfExists(temporary);
        }
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(target);
    }

    private static void atomicReplace(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /**
     * Files participating in one configuration transaction.
     *
     * @param candidate isolated, not-yet-active configuration
     * @param active active configuration used to start the runtime
     * @param lastKnownGood previously active configuration
     */
    public record PreparedConfig(Path candidate, Path active, Path lastKnownGood) {
    }
}
