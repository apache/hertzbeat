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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileFactoryResetStateStoreTest {

    @TempDir
    private Path installationRoot;

    @Test
    void persistsMonotonicOwnerOnlyResetStateAndClearsOnlyAfterCleanup() throws Exception {
        FileFactoryResetStateStore store = new FileFactoryResetStateStore(installationRoot);

        assertThat(store.load()).isEmpty();
        store.request();
        store.request();

        assertThat(new FileFactoryResetStateStore(installationRoot).load())
                .contains(FactoryResetStateStore.State.REQUESTED);
        assertThat(SecureSetupFile.isOwnerOnlyRegularFile(
                installationRoot.resolve(FileFactoryResetStateStore.REQUESTED_RELATIVE_PATH))).isTrue();

        store.clearCompleted();
        assertThat(store.load()).contains(FactoryResetStateStore.State.REQUESTED);

        store.markCleaned();
        store.request();
        assertThat(store.load()).contains(FactoryResetStateStore.State.CLEANED);

        store.clearCompleted();
        assertThat(store.load()).isEmpty();
    }

    @Test
    void rejectsCleanedStateWhenNoRequestExists() {
        FileFactoryResetStateStore store = new FileFactoryResetStateStore(installationRoot);

        assertThrows(IOException.class, store::markCleaned);
    }

    @Test
    void rejectsInvalidOrLinkedMarkers() throws Exception {
        Path requested = installationRoot.resolve(FileFactoryResetStateStore.REQUESTED_RELATIVE_PATH);
        Files.createDirectories(requested.getParent());
        Files.writeString(requested, "NOT_A_RESET_STATE");

        assertThrows(IOException.class, () -> new FileFactoryResetStateStore(installationRoot).load());

        Files.delete(requested);
        Path external = Files.writeString(installationRoot.resolve("outside"), "RESET_REQUESTED");
        try {
            Files.createSymbolicLink(requested, external);
            assertThrows(IOException.class, () -> new FileFactoryResetStateStore(installationRoot).load());
        } catch (UnsupportedOperationException ignored) {
            // Provider does not expose symbolic links; invalid-content coverage still applies.
        }
    }
}
