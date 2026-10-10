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

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ManagedMigrationStartupAdmissionTest {

    @TempDir
    private Path root;

    @Test
    void reportsClearOnlyWhenTheLockedCollectionHasNoNonterminalOperation() {
        assertThat(ManagedMigrationStartupAdmission.inspect(root))
                .isEqualTo(ManagedMigrationStartupAdmission.CLEAR);
        DurableCutoverDraft draft = new DurableCutoverDraft(
                "operation-a", MigrationTarget.POSTGRESQL, ApplyMode.MANAGED_WRITE,
                Instant.parse("2026-08-10T09:00:00Z"), Instant.parse("2026-08-10T09:00:01Z"),
                "candidate-generation");
        new FileMigrationOperationStore(root).create(
                new DurableCutoverSnapshots(draft, "a".repeat(64)).cleanPending());

        assertThat(ManagedMigrationStartupAdmission.inspect(root))
                .isEqualTo(ManagedMigrationStartupAdmission.GATED_RECOVERY);
    }

    @Test
    void corruptCollectionFailsClosedWithoutExposingItsContent() throws Exception {
        Path operationFile = root.resolve(FileMigrationOperationStore.RELATIVE_PATH);
        Files.createDirectories(operationFile.getParent());
        Files.writeString(operationFile, "private-jdbc-password");

        assertThat(ManagedMigrationStartupAdmission.inspect(root))
                .isEqualTo(ManagedMigrationStartupAdmission.GATED_RECOVERY);
        assertThat(ManagedMigrationStartupAdmission.values())
                .extracting(Enum::name)
                .containsExactly("CLEAR", "GATED_RECOVERY");
    }
}
