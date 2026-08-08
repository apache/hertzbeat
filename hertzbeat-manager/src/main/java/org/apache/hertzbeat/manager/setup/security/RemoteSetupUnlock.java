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

import java.io.IOException;
import java.net.InetAddress;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** One-time local-file proof required when setup listens beyond loopback. */
public final class RemoteSetupUnlock {
    private static final Logger LOGGER = LoggerFactory.getLogger(RemoteSetupUnlock.class);
    private static final Duration TTL = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_CLIENTS = 1024;
    private final Path codeFile;
    private final Clock clock;
    private final SecureRandom random;
    private final Map<String, Attempts> attempts = new HashMap<>();
    private byte[] codeDigest;
    private byte[] sessionDigest;
    private Instant expiresAt;

    public RemoteSetupUnlock(Path codeFile, Clock clock, SecureRandom random) {
        this.codeFile = codeFile.toAbsolutePath().normalize();
        this.clock = clock;
        this.random = random;
    }

    public boolean requiresUnlock(InetAddress bindAddress) {
        return !bindAddress.isLoopbackAddress();
    }

    public synchronized void open() throws IOException {
        SecureSetupFile.ensureSafeParent(codeFile);
        removeStaleCodeFile();
        clearDigest(sessionDigest);
        sessionDigest = null;
        attempts.clear();
        byte[] entropy = new byte[24];
        byte[] encodedCode = null;
        try {
            random.nextBytes(entropy);
            encodedCode = Base64.getUrlEncoder().withoutPadding().encode(entropy);
            clearDigest(codeDigest);
            codeDigest = digest(encodedCode);
            expiresAt = clock.instant().plus(TTL);
            SecureSetupFile.create(codeFile, encodedCode);
        } catch (IOException | RuntimeException exception) {
            clearDigest(codeDigest);
            codeDigest = null;
            throw exception;
        } finally {
            Arrays.fill(entropy, (byte) 0);
            if (encodedCode != null) {
                Arrays.fill(encodedCode, (byte) 0);
            }
        }
        LOGGER.warn("Remote setup requires the one-time unlock file at {}", codeFile);
    }

    private void removeStaleCodeFile() throws IOException {
        if (!Files.exists(codeFile, LinkOption.NOFOLLOW_LINKS)) {
            return;
        }
        if (!SecureSetupFile.isOwnerOnlyRegularFile(codeFile)) {
            throw new IOException("Existing setup unlock path is not an owner-only regular file");
        }
        Files.delete(codeFile);
    }

    public synchronized SetupAccessSession redeem(String remoteAddress, SetupUnlockCode supplied) throws IOException {
        Instant now = clock.instant();
        attempts.entrySet().removeIf(entry -> entry.getValue().expired(now));
        if (!attempts.containsKey(remoteAddress) && attempts.size() >= MAX_CLIENTS) {
            throw new SetupUnlockRejected(SetupUnlockRejected.Reason.RATE_LIMITED);
        }
        Attempts current = attempts.compute(remoteAddress, (key, value) -> value == null || value.expired(now)
                ? new Attempts(now.plus(TTL), 1) : value.increment());
        if (current.count() > MAX_ATTEMPTS) {
            throw new SetupUnlockRejected(SetupUnlockRejected.Reason.RATE_LIMITED);
        }
        char[] value = supplied.copyValue();
        byte[] suppliedDigest = null;
        try {
            suppliedDigest = digest(value);
            if (codeDigest == null) {
                throw new SetupUnlockRejected(SetupUnlockRejected.Reason.INVALID);
            }
            if (!now.isBefore(expiresAt)) {
                throw new SetupUnlockRejected(SetupUnlockRejected.Reason.EXPIRED);
            }
            if (!MessageDigest.isEqual(codeDigest, suppliedDigest)) {
                throw new SetupUnlockRejected(SetupUnlockRejected.Reason.INVALID);
            }
            byte[] entropy = new byte[32];
            byte[] newSessionDigest = null;
            try {
                random.nextBytes(entropy);
                String token = Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
                newSessionDigest = digest(token);

                // Publish the in-memory session only after the one-time proof is durably unavailable.
                Files.deleteIfExists(codeFile);
                clearDigest(sessionDigest);
                sessionDigest = newSessionDigest;
                newSessionDigest = null;
                clearDigest(codeDigest);
                codeDigest = null;
                return new SetupAccessSession(token, expiresAt);
            } finally {
                Arrays.fill(entropy, (byte) 0);
                clearDigest(newSessionDigest);
            }
        } finally {
            clearDigest(suppliedDigest);
            Arrays.fill(value, '\0');
            supplied.close();
        }
    }

    public synchronized boolean permits(String token) {
        if (token == null || sessionDigest == null || !clock.instant().isBefore(expiresAt)) {
            return false;
        }
        byte[] suppliedDigest = digest(token);
        try {
            return MessageDigest.isEqual(sessionDigest, suppliedDigest);
        } finally {
            Arrays.fill(suppliedDigest, (byte) 0);
        }
    }

    public synchronized void close() throws IOException {
        clearDigest(codeDigest);
        clearDigest(sessionDigest);
        codeDigest = null;
        sessionDigest = null;
        attempts.clear();
        Files.deleteIfExists(codeFile);
    }

    private static byte[] digest(String value) {
        byte[] encoded = value.getBytes(StandardCharsets.UTF_8);
        try {
            return digest(encoded);
        } finally {
            Arrays.fill(encoded, (byte) 0);
        }
    }

    private static byte[] digest(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static byte[] digest(char[] value) {
        ByteBuffer encoded = StandardCharsets.UTF_8.encode(CharBuffer.wrap(value));
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(encoded);
            return digest.digest();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        } finally {
            if (encoded.hasArray()) {
                Arrays.fill(encoded.array(), (byte) 0);
            }
        }
    }

    private static void clearDigest(byte[] digest) {
        if (digest != null) {
            Arrays.fill(digest, (byte) 0);
        }
    }

    private record Attempts(Instant resetsAt, int count) {
        Attempts increment() {
            return new Attempts(resetsAt, count + 1);
        }

        boolean expired(Instant now) {
            return !now.isBefore(resetsAt);
        }
    }
}
