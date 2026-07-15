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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeConfigTransactionTest {

    @TempDir
    private Path tempDir;

    private OtelRuntimeProperties properties;
    private Path activeConfig;
    private OtelRuntimeConfigTransaction transaction;

    @BeforeEach
    void setUp() throws Exception {
        properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(Path.of("config", "otel-runtime.yaml"));
        properties.setToken("secret-must-stay-in-environment");
        activeConfig = tempDir.resolve("config/otel-runtime.yaml");
        Files.createDirectories(activeConfig.getParent());
        transaction = new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer());
    }

    @Test
    void preparingCandidateDoesNotReplaceActiveConfiguration() throws Exception {
        Files.writeString(activeConfig, "current-config");

        OtelRuntimeConfigTransaction.PreparedConfig prepared = transaction.prepare(properties);

        assertEquals("current-config", Files.readString(activeConfig));
        assertTrue(Files.exists(prepared.candidate()));
        assertFalse(Files.readString(prepared.candidate()).contains(properties.getToken()));
    }

    @Test
    void commitAtomicallyActivatesCandidateAndPreservesLastKnownGood() throws Exception {
        Files.writeString(activeConfig, "current-config");
        OtelRuntimeConfigTransaction.PreparedConfig prepared = transaction.prepare(properties);
        String candidate = Files.readString(prepared.candidate());

        Path activated = transaction.commit(prepared);

        assertEquals(activeConfig, activated);
        assertEquals(candidate, Files.readString(activeConfig));
        assertEquals("current-config", Files.readString(prepared.lastKnownGood()));
        assertFalse(Files.exists(prepared.candidate()));
    }

    @Test
    void rollbackRestoresLastKnownGoodWithoutConsumingIt() throws Exception {
        Files.writeString(activeConfig, "current-config");
        OtelRuntimeConfigTransaction.PreparedConfig prepared = transaction.prepare(properties);
        transaction.commit(prepared);

        assertTrue(transaction.rollback(prepared));

        assertEquals("current-config", Files.readString(activeConfig));
        assertEquals("current-config", Files.readString(prepared.lastKnownGood()));
    }

    @Test
    void discardRemovesRejectedCandidateWithoutChangingActiveConfiguration() throws Exception {
        Files.writeString(activeConfig, "current-config");
        OtelRuntimeConfigTransaction.PreparedConfig prepared = transaction.prepare(properties);

        transaction.discard(prepared);

        assertFalse(Files.exists(prepared.candidate()));
        assertEquals("current-config", Files.readString(activeConfig));
    }
}
