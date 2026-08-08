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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;

/** Owner-only local installation identity store. */
public final class LocalInstallationFingerprintStore {
    private final Path path;
    private final SecureRandom random;

    public LocalInstallationFingerprintStore(Path path, SecureRandom random) {
        this.path = path.toAbsolutePath().normalize();
        this.random = random;
    }

    public Optional<InstallationFingerprint> read() throws IOException {
        if (!SecureSetupFile.isOwnerOnlyRegularFile(path)) {
            return Optional.empty();
        }
        return Optional.of(new InstallationFingerprint(Files.readString(path, StandardCharsets.US_ASCII).trim()));
    }

    public InstallationFingerprint create() throws IOException {
        byte[] value = new byte[32];
        random.nextBytes(value);
        InstallationFingerprint fingerprint = new InstallationFingerprint(HexFormat.of().formatHex(value));
        try {
            SecureSetupFile.ensureSafeParent(path);
            SecureSetupFile.create(path, fingerprint.value().getBytes(StandardCharsets.US_ASCII));
            return fingerprint;
        } finally {
            Arrays.fill(value, (byte) 0);
        }
    }
}
