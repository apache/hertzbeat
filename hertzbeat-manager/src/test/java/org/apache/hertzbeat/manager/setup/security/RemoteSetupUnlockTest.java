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

package org.apache.hertzbeat.manager.setup.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.InetAddress;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RemoteSetupUnlockTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void loopbackNeedsNoUnlockWhileRemoteBindDoes() throws Exception {
        RemoteSetupUnlock unlock = unlock(temporaryDirectory.resolve("unlock"));
        assertFalse(unlock.requiresUnlock(InetAddress.getLoopbackAddress()));
        assertTrue(unlock.requiresUnlock(InetAddress.getByName("0.0.0.0")));
    }

    @Test
    void ownerOnlyCodeIsSingleUseAndBecomesStrictHttpOnlyCookie() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        Clock clock = Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC);
        RemoteSetupUnlock unlock = new RemoteSetupUnlock(codeFile, clock, deterministicRandom());
        unlock.open();
        String code = Files.readString(codeFile);
        assertTrue(Files.getPosixFilePermissions(codeFile)
                .equals(PosixFilePermissions.fromString("rw-------")));

        SetupAccessSession session = unlock.redeem("198.51.100.4", new SetupUnlockCode(code.toCharArray()));

        assertFalse(Files.exists(codeFile));
        assertTrue(unlock.permits(session.token()));
        SetupUnlockRejected reused = assertThrows(SetupUnlockRejected.class,
                () -> unlock.redeem("198.51.100.4", new SetupUnlockCode(code.toCharArray())));
        assertEquals(SetupUnlockRejected.Reason.INVALID, reused.reason());
        String cookie = SetupAccessCookie.create(session, true, clock).toString();
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("SameSite=Strict"));
        assertTrue(cookie.contains("Secure"));
        assertFalse(session.toString().contains(session.token()));
    }

    @Test
    void limitsRepeatedInvalidProofs() throws Exception {
        RemoteSetupUnlock unlock = unlock(temporaryDirectory.resolve("unlock"));
        unlock.open();
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThrows(SetupUnlockRejected.class,
                    () -> unlock.redeem("203.0.113.8", new SetupUnlockCode("wrong".toCharArray())));
        }
        SetupUnlockRejected limited = assertThrows(SetupUnlockRejected.class,
                () -> unlock.redeem("203.0.113.8", new SetupUnlockCode("wrong".toCharArray())));
        assertEquals(SetupUnlockRejected.Reason.RATE_LIMITED, limited.reason());
    }

    @Test
    void distinguishesAnExpiredProofFromAnInvalidProof() throws Exception {
        Instant openedAt = Instant.parse("2026-08-08T00:00:00Z");
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(openedAt, openedAt.plus(Duration.ofMinutes(16)));
        Path codeFile = temporaryDirectory.resolve("unlock");
        RemoteSetupUnlock unlock = new RemoteSetupUnlock(codeFile, clock, deterministicRandom());
        unlock.open();

        SetupUnlockRejected expired = assertThrows(SetupUnlockRejected.class,
                () -> unlock.redeem(
                        "198.51.100.4", new SetupUnlockCode(Files.readString(codeFile).toCharArray())));

        assertEquals(SetupUnlockRejected.Reason.EXPIRED, expired.reason());
    }

    @Test
    void restartRotatesStaleOwnerOnlyUnlockFile() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        Clock clock = Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC);
        SecureRandom random = deterministicRandom();
        RemoteSetupUnlock firstProcess = new RemoteSetupUnlock(codeFile, clock, random);
        firstProcess.open();
        String staleCode = Files.readString(codeFile);

        RemoteSetupUnlock restarted = new RemoteSetupUnlock(codeFile, clock, random);
        restarted.open();
        String replacementCode = Files.readString(codeFile);

        assertNotEquals(staleCode, replacementCode);
        assertThrows(SetupUnlockRejected.class,
                () -> restarted.redeem("198.51.100.4", new SetupUnlockCode(staleCode.toCharArray())));
        SetupAccessSession session = restarted.redeem(
                "198.51.100.4", new SetupUnlockCode(replacementCode.toCharArray()));
        assertTrue(restarted.permits(session.token()));
    }

    @Test
    void openingNewProofInvalidatesPreviousSession() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        Clock clock = Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC);
        RemoteSetupUnlock unlock = new RemoteSetupUnlock(codeFile, clock, deterministicRandom());
        unlock.open();
        SetupAccessSession oldSession = unlock.redeem(
                "198.51.100.4", new SetupUnlockCode(Files.readString(codeFile).toCharArray()));

        unlock.open();

        assertFalse(unlock.permits(oldSession.token()));
    }

    @Test
    void ensureOpenPreservesAnActiveSession() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        MutableClock clock = new MutableClock(Instant.parse("2026-08-08T00:00:00Z"));
        RemoteSetupUnlock unlock = new RemoteSetupUnlock(codeFile, clock, deterministicRandom());
        unlock.ensureOpen();
        SetupAccessSession session = unlock.redeem(
                "198.51.100.4", new SetupUnlockCode(Files.readString(codeFile).toCharArray()));

        unlock.ensureOpen();

        assertTrue(unlock.permits(session.token()));
        assertFalse(Files.exists(codeFile));
    }

    @Test
    void ensureOpenRenewsProofAfterExpiry() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        MutableClock clock = new MutableClock(Instant.parse("2026-08-08T00:00:00Z"));
        RemoteSetupUnlock unlock = new RemoteSetupUnlock(codeFile, clock, deterministicRandom());
        unlock.ensureOpen();
        String expiredCode = Files.readString(codeFile);
        SetupAccessSession expiredSession = unlock.redeem(
                "198.51.100.4", new SetupUnlockCode(expiredCode.toCharArray()));

        clock.advance(Duration.ofMinutes(16));
        unlock.ensureOpen();

        assertFalse(unlock.permits(expiredSession.token()));
        assertTrue(Files.exists(codeFile));
        assertNotEquals(expiredCode, Files.readString(codeFile));
    }

    @Test
    void failedProofRemovalDoesNotPublishUnreachableSession() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock");
        RemoteSetupUnlock unlock = unlock(codeFile);
        unlock.open();
        String code = Files.readString(codeFile);
        Files.delete(codeFile);
        Files.createDirectory(codeFile);
        Files.writeString(codeFile.resolve("blocker"), "keep-directory-non-empty");

        assertThrows(DirectoryNotEmptyException.class,
                () -> unlock.redeem("198.51.100.4", new SetupUnlockCode(code.toCharArray())));

        Files.delete(codeFile.resolve("blocker"));
        Files.delete(codeFile);
        SetupAccessSession recovered = unlock.redeem(
                "198.51.100.4", new SetupUnlockCode(code.toCharArray()));
        assertTrue(unlock.permits(recovered.token()));
    }

    private static RemoteSetupUnlock unlock(Path path) {
        return new RemoteSetupUnlock(path,
                Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC), deterministicRandom());
    }

    private static SecureRandom deterministicRandom() {
        return new SecureRandom() {
            private byte next = 1;

            @Override
            public void nextBytes(byte[] bytes) {
                Arrays.fill(bytes, next++);
            }
        };
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
