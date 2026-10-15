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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Atomic publication seam kept separate from operation lifecycle and encoding. */
final class MigrationOperationFilePublisher implements FileMigrationOperationStore.Publisher {

    private final Path installationRoot;

    MigrationOperationFilePublisher(Path installationRoot) {
        this.installationRoot = installationRoot;
    }

    @Override
    public void publish(Path target, byte[] content) throws IOException {
        Path temporary = target.getParent().resolve(".migration-operations-" + UUID.randomUUID() + ".tmp");
        try {
            SecureSetupFile.create(installationRoot, temporary, content);
            SecureSetupFile.atomicReplace(installationRoot, temporary, target);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
