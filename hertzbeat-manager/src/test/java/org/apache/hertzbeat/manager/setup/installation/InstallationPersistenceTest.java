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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.dao.DataIntegrityViolationException;

class InstallationPersistenceTest {
    private static final InstallationFingerprint FIRST = new InstallationFingerprint("a".repeat(64));

    @TempDir
    Path temporaryDirectory;

    @Test
    void completionIsIdempotentOnlyForSameFingerprint() {
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID)).thenReturn(Optional.empty());
        InstallationCompletionService service = new InstallationCompletionService(records);
        service.complete(FIRST);
        verify(records).saveAndFlush(any(InstallationRecord.class));

        when(records.findById(InstallationRecord.SINGLETON_ID)).thenReturn(Optional.of(new InstallationRecord(FIRST.value())));
        service.complete(FIRST);
        assertThrows(IllegalStateException.class,
                () -> service.complete(new InstallationFingerprint("b".repeat(64))));
    }

    @Test
    void failedCompletionNeverReportsWritesClosed() {
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID)).thenReturn(Optional.empty());
        when(records.saveAndFlush(any())).thenThrow(new IllegalStateException("storage unavailable"));
        InstallationCompletionService service = new InstallationCompletionService(records);
        assertThrows(IllegalStateException.class, () -> service.complete(FIRST));
        when(records.existsById(InstallationRecord.SINGLETON_ID)).thenReturn(false);
        assertFalse(service.writesClosed());
    }

    @Test
    void concurrentCompletionIsIdempotentForTheSameFingerprint() {
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID))
                .thenReturn(Optional.empty(), Optional.of(new InstallationRecord(FIRST.value())));
        when(records.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("concurrent insert"));

        new InstallationCompletionService(records).complete(FIRST);

        verify(records, times(2)).findById(InstallationRecord.SINGLETON_ID);
    }

    @Test
    void concurrentCompletionRejectsDifferentFingerprint() {
        InstallationRecordRepository records = mock(InstallationRecordRepository.class);
        when(records.findById(InstallationRecord.SINGLETON_ID))
                .thenReturn(Optional.empty(), Optional.of(new InstallationRecord("b".repeat(64))));
        when(records.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("concurrent insert"));

        InstallationCompletionService service = new InstallationCompletionService(records);

        assertThrows(IllegalStateException.class, () -> service.complete(FIRST));
    }

    @Test
    void localFingerprintIsOwnerOnlyReadableAndCollisionSafe() throws Exception {
        Path path = temporaryDirectory.resolve("installation-id");
        LocalInstallationFingerprintStore store = new LocalInstallationFingerprintStore(
                temporaryDirectory, path, new SecureRandom());
        InstallationFingerprint created = store.create();
        assertEquals(Optional.of(created), store.read());
        assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(path));
        assertThrows(java.nio.file.FileAlreadyExistsException.class, store::create);
    }

    @Test
    void localFingerprintDoesNotFollowTargetSymlink() throws Exception {
        Path target = temporaryDirectory.resolve("target");
        Files.writeString(target, FIRST.value());
        Path link = temporaryDirectory.resolve("installation-id");
        Files.createSymbolicLink(link, target);
        LocalInstallationFingerprintStore store = new LocalInstallationFingerprintStore(
                temporaryDirectory, link, new SecureRandom());
        assertEquals(Optional.empty(), store.read());
        assertThrows(java.nio.file.FileAlreadyExistsException.class, store::create);
    }

    @Test
    void localFingerprintRejectsPermissionsThatExposeItToOtherUsers() throws Exception {
        Path path = temporaryDirectory.resolve("installation-id");
        LocalInstallationFingerprintStore store = new LocalInstallationFingerprintStore(
                temporaryDirectory, path, new SecureRandom());
        store.create();
        Files.setPosixFilePermissions(path, PosixFilePermissions.fromString("rw-r--r--"));

        assertThrows(java.io.IOException.class, store::read);
    }

    @Test
    void localFingerprintReadRejectsAncestorSymlinkOutsideInstallationRoot() throws Exception {
        Path installationRoot = Files.createDirectory(temporaryDirectory.resolve("installation"));
        Path outside = Files.createDirectory(temporaryDirectory.resolve("outside"));
        Path outsideFingerprint = outside.resolve("fingerprint");
        Files.writeString(outsideFingerprint, FIRST.value());
        Files.setPosixFilePermissions(outsideFingerprint, PosixFilePermissions.fromString("r--------"));
        Files.createSymbolicLink(installationRoot.resolve("data"), outside);
        LocalInstallationFingerprintStore store = new LocalInstallationFingerprintStore(
                installationRoot, installationRoot.resolve("data/fingerprint"), new SecureRandom());

        assertThrows(java.io.IOException.class, store::read);
    }
}
