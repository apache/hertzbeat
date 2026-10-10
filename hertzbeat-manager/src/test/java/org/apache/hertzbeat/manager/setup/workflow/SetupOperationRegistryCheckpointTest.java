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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SetupOperationRegistryCheckpointTest {
    private static final Instant NOW = Instant.parse("2026-08-09T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @TempDir
    private Path root;

    @Test
    void successfulRestoreProjectsTerminalStateAndConsumesCheckpoint() {
        String operationId = awaitingRestart(root);
        Path checkpoint = checkpoint(root);

        SetupOperationRegistry restored = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.ADMINISTRATOR_REQUIRED);

        assertTrue(Files.exists(checkpoint));
        var response = restored.get(operationId);
        assertNotNull(response);
        assertEquals(SetupOperationState.SUCCEEDED, response.state());
        assertEquals(SetupPhase.ADMINISTRATOR_REQUIRED, response.phase());
        assertFalse(Files.exists(checkpoint));
    }

    @Test
    void recoveryRestoreProjectsFailedAndConsumesCheckpoint() {
        String operationId = awaitingRestart(root);

        SetupOperationRegistry restored = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.RECOVERY_REQUIRED);

        assertTrue(Files.exists(checkpoint(root)));
        var response = restored.get(operationId);
        assertNotNull(response);
        assertEquals(SetupOperationState.FAILED, response.state());
        assertEquals(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, response.errorCode());
        assertFalse(Files.exists(checkpoint(root)));
    }

    @Test
    void checkpointWriteFailureDoesNotAbortAwaitingRestartResponse() throws Exception {
        Files.writeString(root.resolve("data"), "parent-is-not-a-directory");
        SetupOperationRegistry registry = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.CONFIGURATION_REQUIRED);
        String operationId = registry.begin(SetupPhase.CONFIGURATION_REQUIRED);

        var response = assertDoesNotThrow(() -> registry.finish(operationId,
                SetupOperationState.AWAITING_RESTART, SetupPhase.APPLICATION_STARTING, null, false));

        assertEquals(SetupOperationState.AWAITING_RESTART, response.state());
        assertEquals(response, registry.get(operationId));
    }

    @Test
    void configurationRequiredRestoreRollsBackConsumesCheckpointAndAllowsRepair() {
        String operationId = awaitingRestart(root);
        SetupOperationRegistry restored = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.CONFIGURATION_REQUIRED);

        assertTrue(Files.exists(checkpoint(root)));
        var response = restored.get(operationId);

        assertNotNull(response);
        assertEquals(SetupOperationState.ROLLED_BACK, response.state());
        assertEquals(SetupErrorCode.CONFIG_WRITE_FAILED, response.errorCode());
        assertFalse(Files.exists(checkpoint(root)));
        assertNotNull(restored.begin(SetupPhase.CONFIGURATION_REQUIRED));
    }

    @Test
    void applicationStartingRestoreRemainsAwaitingAndActive() {
        String operationId = awaitingRestart(root);
        SetupOperationRegistry restored = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.APPLICATION_STARTING);

        assertEquals(SetupOperationState.AWAITING_RESTART, restored.get(operationId).state());
        assertThrows(SetupWorkflowConflict.class,
                () -> restored.begin(SetupPhase.CONFIGURATION_REQUIRED));
        assertTrue(Files.exists(checkpoint(root)));
    }

    @Test
    void unobservedSuccessCanBeReprojectedAsFailedByRecoveryContext() {
        String operationId = awaitingRestart(root);
        new SetupOperationRegistry(CLOCK, root, SetupPhase.ADMINISTRATOR_REQUIRED);
        assertTrue(Files.exists(checkpoint(root)));

        SetupOperationRegistry recovery = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.RECOVERY_REQUIRED);

        assertTrue(Files.exists(checkpoint(root)));
        var response = recovery.get(operationId);
        assertEquals(SetupOperationState.FAILED, response.state());
        assertEquals(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, response.errorCode());
        assertFalse(Files.exists(checkpoint(root)));
    }

    private static String awaitingRestart(Path root) {
        SetupOperationRegistry registry = new SetupOperationRegistry(
                CLOCK, root, SetupPhase.CONFIGURATION_REQUIRED);
        String operationId = registry.begin(SetupPhase.CONFIGURATION_REQUIRED);
        registry.finish(operationId, SetupOperationState.AWAITING_RESTART,
                SetupPhase.APPLICATION_STARTING, null, false);
        return operationId;
    }

    private static Path checkpoint(Path root) {
        return root.resolve(SetupOperationCheckpointStore.RELATIVE_PATH);
    }
}
