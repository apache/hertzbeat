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

import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/** Commits the permanent close of setup writes, with idempotence only for the same installation. */
@Service
public class InstallationCompletionService {
    private final InstallationRecordRepository records;

    public InstallationCompletionService(InstallationRecordRepository records) {
        this.records = records;
    }

    public void complete(InstallationFingerprint fingerprint) {
        Optional<InstallationRecord> existing = records.findById(InstallationRecord.SINGLETON_ID);
        if (existing.isPresent()) {
            requireSameInstallation(existing.orElseThrow(), fingerprint);
            return;
        }
        try {
            records.saveAndFlush(new InstallationRecord(fingerprint.value()));
        } catch (DataIntegrityViolationException conflict) {
            Optional<InstallationRecord> concurrent = records.findById(InstallationRecord.SINGLETON_ID);
            if (concurrent.isEmpty()) {
                throw conflict;
            }
            requireSameInstallation(concurrent.orElseThrow(), fingerprint);
        }
    }

    public boolean writesClosed() {
        return records.existsById(InstallationRecord.SINGLETON_ID);
    }

    private static void requireSameInstallation(InstallationRecord existing, InstallationFingerprint expected) {
        if (!existing.complete() || !existing.fingerprint().equals(expected.value())) {
            throw new IllegalStateException("Installation identity does not match");
        }
    }
}
