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

package org.apache.hertzbeat.manager.setup.installation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class InstallationConvergenceServiceTest {
    @TempDir
    private Path temporaryDirectory;

    @Test
    void matchingDatabaseAndLocalFingerprintsAreRequiredForFullRuntime() throws Exception {
        Path fingerprintPath = temporaryDirectory.resolve("fingerprint");
        InstallationFingerprint fingerprint = new LocalInstallationFingerprintStore(
                temporaryDirectory, fingerprintPath, new SecureRandom()).create();
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID))
                .thenReturn(Optional.of(new InstallationRecord(fingerprint.value())));

        assertThat(new InstallationConvergenceService(records, temporaryDirectory, fingerprintPath).classify())
                .isEqualTo(InstallationMode.FULL);

        when(records.findById(InstallationRecord.SINGLETON_ID))
                .thenReturn(Optional.of(new InstallationRecord("f".repeat(64))));
        assertThat(new InstallationConvergenceService(records, temporaryDirectory, fingerprintPath).classify())
                .isEqualTo(InstallationMode.RECOVERY);
    }

    @Test
    void fingerprintWrittenBeforeDatabaseRecordRemainsGatedAndCanConverge() throws Exception {
        Path fingerprintPath = temporaryDirectory.resolve("fingerprint");
        new LocalInstallationFingerprintStore(
                temporaryDirectory, fingerprintPath, new SecureRandom()).create();
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID)).thenReturn(Optional.empty());

        assertThat(new InstallationConvergenceService(records, temporaryDirectory, fingerprintPath).classify())
                .isEqualTo(InstallationMode.UPGRADE);
    }

    @Test
    void malformedLocalFingerprintFailsClosed() throws Exception {
        Path fingerprintPath = temporaryDirectory.resolve("fingerprint");
        Files.writeString(fingerprintPath, "not-a-fingerprint");
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);

        assertThat(new InstallationConvergenceService(records, temporaryDirectory, fingerprintPath).classify())
                .isEqualTo(InstallationMode.RECOVERY);
    }
}
