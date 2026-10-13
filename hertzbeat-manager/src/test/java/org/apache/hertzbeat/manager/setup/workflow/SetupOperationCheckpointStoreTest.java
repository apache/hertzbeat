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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SetupOperationCheckpointStoreTest {
    @TempDir
    private Path root;

    @Test
    void savesAndLoadsSecretFreeCheckpoint() {
        SetupOperationCheckpointStore store = new SetupOperationCheckpointStore(root);
        Instant createdAt = Instant.parse("2026-08-09T00:00:00Z");

        store.save("operation-1", createdAt);

        var checkpoint = store.load().orElseThrow();
        assertEquals("operation-1", checkpoint.operationId());
        assertEquals(createdAt, checkpoint.createdAt());
    }

    @Test
    void malformedCheckpointIsIgnoredWithoutBecomingApiState() throws Exception {
        Path checkpoint = root.resolve(SetupOperationCheckpointStore.RELATIVE_PATH);
        Files.createDirectories(checkpoint.getParent());
        Files.writeString(checkpoint, "operationId=operation-1\ncreatedAt=not-an-instant\n");

        assertTrue(new SetupOperationCheckpointStore(root).load().isEmpty());
    }

    @Test
    void unreadableCheckpointShapeIsIgnoredWithoutBecomingApiState() throws Exception {
        Files.createDirectories(root.resolve(SetupOperationCheckpointStore.RELATIVE_PATH));

        assertTrue(new SetupOperationCheckpointStore(root).load().isEmpty());
    }
}
