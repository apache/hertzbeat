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

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Optional;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Persists the one secret-free operation needed to bridge a setup context restart. */
final class SetupOperationCheckpointStore {
    static final String RELATIVE_PATH = "data/config/setup-operation.properties";
    private static final Logger LOGGER = LoggerFactory.getLogger(SetupOperationCheckpointStore.class);
    private final Path checkpoint;

    SetupOperationCheckpointStore(Path installationRoot) {
        checkpoint = installationRoot.resolve(RELATIVE_PATH);
    }

    Optional<Checkpoint> load() {
        try {
            if (!Files.exists(checkpoint, LinkOption.NOFOLLOW_LINKS)) {
                return Optional.empty();
            }
            if (!Files.isRegularFile(checkpoint, LinkOption.NOFOLLOW_LINKS)) {
                throw new IOException("checkpoint is not a regular file");
            }
            Properties properties = new Properties();
            try (var input = Files.newInputStream(checkpoint)) {
                properties.load(input);
            }
            String operationId = properties.getProperty("operationId");
            if (operationId == null || operationId.isBlank()) {
                throw new IllegalArgumentException("operationId is missing");
            }
            return Optional.of(new Checkpoint(operationId,
                    Instant.parse(properties.getProperty("createdAt"))));
        } catch (IOException | RuntimeException failure) {
            LOGGER.warn("Ignoring unreadable or malformed setup operation checkpoint at {}",
                    checkpoint, failure);
            return Optional.empty();
        }
    }

    void save(String operationId, Instant createdAt) {
        Path temporary = null;
        try {
            Files.createDirectories(checkpoint.getParent());
            temporary = Files.createTempFile(checkpoint.getParent(), ".setup-operation-", ".tmp");
            Properties properties = new Properties();
            properties.setProperty("operationId", operationId);
            properties.setProperty("createdAt", createdAt.toString());
            try (var output = Files.newOutputStream(temporary)) {
                properties.store(output, "Secret-free setup operation checkpoint");
            }
            move(temporary);
        } catch (IOException | RuntimeException failure) {
            // Configuration is already durable; checkpoint failure must not block the context transition.
            LOGGER.warn("Cannot persist setup operation checkpoint at {}; restart polling may require status refresh",
                    checkpoint, failure);
        } finally {
            deleteTemporary(temporary);
        }
    }

    void delete() {
        try {
            Files.deleteIfExists(checkpoint);
        } catch (IOException | RuntimeException failure) {
            LOGGER.warn("Cannot remove consumed setup operation checkpoint at {}", checkpoint, failure);
        }
    }

    private void move(Path temporary) throws IOException {
        try {
            Files.move(temporary, checkpoint, StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException unsupported) {
            Files.move(temporary, checkpoint, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void deleteTemporary(Path temporary) {
        if (temporary == null) {
            return;
        }
        try {
            Files.deleteIfExists(temporary);
        } catch (IOException | RuntimeException failure) {
            LOGGER.warn("Cannot remove temporary setup operation checkpoint at {}", temporary, failure);
        }
    }

    record Checkpoint(String operationId, Instant createdAt) {
    }
}
