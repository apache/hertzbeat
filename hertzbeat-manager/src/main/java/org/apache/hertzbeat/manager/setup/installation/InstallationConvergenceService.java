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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Optional;

/** Compares the durable database marker with the owner-only local fingerprint. */
public final class InstallationConvergenceService {
    private final InstallationRecordRepository records;
    private final Path installationRoot;
    private final Path fingerprintPath;

    public InstallationConvergenceService(
            InstallationRecordRepository records, Path installationRoot, Path fingerprintPath) {
        this.records = records;
        this.installationRoot = installationRoot.toAbsolutePath().normalize();
        this.fingerprintPath = fingerprintPath.toAbsolutePath().normalize();
    }

    public InstallationMode classify() {
        try {
            Optional<InstallationFingerprint> fingerprint =
                    new LocalInstallationFingerprintStore(
                            installationRoot, fingerprintPath, new SecureRandom()).read();
            if (fingerprint.isEmpty() && Files.exists(fingerprintPath, LinkOption.NOFOLLOW_LINKS)) {
                return InstallationMode.RECOVERY;
            }
            return new InstallationClassifier().classify(
                    DatabasePresence.HERTZBEAT_SCHEMA,
                    records.findById(InstallationRecord.SINGLETON_ID), fingerprint);
        } catch (IOException | RuntimeException failure) {
            return InstallationMode.RECOVERY;
        }
    }
}
