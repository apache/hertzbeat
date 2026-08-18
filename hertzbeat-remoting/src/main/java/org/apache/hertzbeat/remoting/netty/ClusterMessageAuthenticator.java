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

package org.apache.hertzbeat.remoting.netty;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.google.protobuf.ByteString;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.function.Supplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;

/**
 * Signs versioned cluster envelopes and verifies integrity, freshness,
 * key rotation, connection binding, and replay state.
 */
final class ClusterMessageAuthenticator {

    static final int AUTH_VERSION = 1;
    static final int CHANNEL_NONCE_BYTES = 32;

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int MESSAGE_NONCE_BYTES = 16;
    private static final int SIGNATURE_BYTES = 32;
    private static final long MAX_REPLAY_ENTRIES = 65_536;
    private static final Duration DEFAULT_REPLAY_WINDOW = Duration.ofMinutes(10);
    private static final Duration MAX_CONFIGURED_CLOCK_SKEW = Duration.ofMinutes(30);
    private static final byte[] HKDF_SALT =
            "HertzBeat cluster message authentication salt v1".getBytes(StandardCharsets.UTF_8);
    private static final byte[] HKDF_INFO =
            "HertzBeat Netty cluster envelope HMAC key v1".getBytes(StandardCharsets.UTF_8);

    private final ClusterMessageAuthConfig config;
    private final Supplier<String> fallbackSecretSupplier;
    private final Clock clock;
    private final Supplier<ByteString> nonceSupplier;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Cache<ByteString, Boolean> acceptedSignatures;

    private volatile KeyRing keyRing;

    ClusterMessageAuthenticator(
            ClusterMessageAuthConfig config,
            Supplier<String> fallbackSecretSupplier) {
        SecureRandom messageRandom = new SecureRandom();
        this.config = config;
        this.fallbackSecretSupplier = fallbackSecretSupplier;
        this.clock = Clock.systemUTC();
        this.nonceSupplier = () -> {
            byte[] nonce = new byte[MESSAGE_NONCE_BYTES];
            messageRandom.nextBytes(nonce);
            return ByteString.copyFrom(nonce);
        };
        this.acceptedSignatures = newReplayCache();
    }

    ClusterMessageAuthenticator(
            ClusterMessageAuthConfig config,
            Supplier<String> fallbackSecretSupplier,
            Clock clock,
            Supplier<ByteString> nonceSupplier) {
        this.config = config;
        this.fallbackSecretSupplier = fallbackSecretSupplier;
        this.clock = clock;
        this.nonceSupplier = nonceSupplier;
        this.acceptedSignatures = newReplayCache();
    }

    void validateConfiguration() {
        getKeyRing();
    }

    ClusterMessageAuthConfig.Mode mode() {
        return config.getMode();
    }

    long handshakeTimeoutMillis() {
        return config.getHandshakeTimeout().toMillis();
    }

    ByteString newChannelNonce() {
        byte[] nonce = new byte[CHANNEL_NONCE_BYTES];
        secureRandom.nextBytes(nonce);
        return ByteString.copyFrom(nonce);
    }

    ClusterMsg.Message sign(ClusterMsg.Message message, ByteString channelNonce) {
        KeyRing keys = getKeyRing();
        ByteString safeChannelNonce = channelNonce == null ? ByteString.EMPTY : channelNonce;
        if (config.getMode() == ClusterMessageAuthConfig.Mode.REQUIRED
                && safeChannelNonce.size() != CHANNEL_NONCE_BYTES) {
            throw new IllegalStateException(
                    "Required cluster message authentication needs a server channel challenge");
        }
        ClusterMsg.Message unsigned = message.toBuilder()
                .setAuthVersion(AUTH_VERSION)
                .setAuthKeyId(keys.activeKeyId())
                .setAuthTimestamp(clock.millis())
                .setAuthNonce(nonceSupplier.get())
                .setAuthChannelNonce(safeChannelNonce)
                .clearAuthSignature()
                .build();
        return unsigned.toBuilder()
                .setAuthSignature(ByteString.copyFrom(calculateSignature(unsigned, keys.activeKey())))
                .build();
    }

    VerificationResult verify(ClusterMsg.Message message, ByteString expectedChannelNonce) {
        KeyRing keys = getKeyRing();
        if (isLegacyUnsigned(message)) {
            return config.getMode() == ClusterMessageAuthConfig.Mode.OPTIONAL
                    ? VerificationResult.LEGACY_UNSIGNED
                    : VerificationResult.UNSIGNED;
        }
        if (message.getAuthVersion() != AUTH_VERSION) {
            return VerificationResult.UNSUPPORTED_VERSION;
        }
        if (message.getAuthTimestamp() <= 0
                || message.getAuthNonce().size() != MESSAGE_NONCE_BYTES
                || message.getAuthSignature().size() != SIGNATURE_BYTES) {
            return VerificationResult.MALFORMED;
        }
        ByteString safeExpectedChannelNonce =
                expectedChannelNonce == null ? ByteString.EMPTY : expectedChannelNonce;
        if (!MessageDigest.isEqual(
                safeExpectedChannelNonce.toByteArray(),
                message.getAuthChannelNonce().toByteArray())) {
            return VerificationResult.CHANNEL_MISMATCH;
        }
        long maxSkewMillis = config.getMaxClockSkew().toMillis();
        long timestampDelta;
        try {
            timestampDelta = Math.subtractExact(clock.millis(), message.getAuthTimestamp());
        } catch (ArithmeticException e) {
            return VerificationResult.STALE;
        }
        if (timestampDelta > maxSkewMillis || timestampDelta < -maxSkewMillis) {
            return VerificationResult.STALE;
        }
        byte[] signingKey = keys.keyFor(message.getAuthKeyId());
        if (signingKey == null) {
            return VerificationResult.UNKNOWN_KEY;
        }
        ClusterMsg.Message unsigned = message.toBuilder().clearAuthSignature().build();
        byte[] expected = calculateSignature(unsigned, signingKey);
        if (!MessageDigest.isEqual(expected, message.getAuthSignature().toByteArray())) {
            return VerificationResult.INVALID_SIGNATURE;
        }
        if (acceptedSignatures.asMap()
                .putIfAbsent(message.getAuthSignature(), Boolean.TRUE) != null) {
            return VerificationResult.REPLAY;
        }
        return VerificationResult.VERIFIED;
    }

    private boolean isLegacyUnsigned(ClusterMsg.Message message) {
        return message.getAuthVersion() == 0
                && message.getAuthTimestamp() == 0
                && message.getAuthNonce().isEmpty()
                && message.getAuthSignature().isEmpty()
                && message.getAuthKeyId().isEmpty()
                && message.getAuthChannelNonce().isEmpty();
    }

    private KeyRing getKeyRing() {
        KeyRing local = keyRing;
        if (local == null) {
            synchronized (this) {
                local = keyRing;
                if (local == null) {
                    ClusterMessageAuthConfig.ResolvedSecrets resolved =
                            config.resolve(fallbackSecretSupplier);
                    local = new KeyRing(
                            resolved.activeKeyId(),
                            deriveSigningKey(resolved.activeSecret()),
                            resolved.previousKeyId(),
                            resolved.previousSecret() == null
                                    ? null
                                    : deriveSigningKey(resolved.previousSecret()));
                    keyRing = local;
                }
            }
        }
        return local;
    }

    private byte[] calculateSignature(ClusterMsg.Message message, byte[] signingKey) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(signingKey, HMAC_ALGORITHM));
            return mac.doFinal(message.toByteArray());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to authenticate cluster message", e);
        }
    }

    private byte[] deriveSigningKey(String rootSecret) {
        try {
            Mac extract = Mac.getInstance(HMAC_ALGORITHM);
            extract.init(new SecretKeySpec(HKDF_SALT, HMAC_ALGORITHM));
            byte[] pseudoRandomKey = extract.doFinal(rootSecret.getBytes(StandardCharsets.UTF_8));

            Mac expand = Mac.getInstance(HMAC_ALGORITHM);
            expand.init(new SecretKeySpec(pseudoRandomKey, HMAC_ALGORITHM));
            expand.update(HKDF_INFO);
            expand.update((byte) 1);
            return expand.doFinal();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to derive cluster message authentication key", e);
        }
    }

    private Cache<ByteString, Boolean> newReplayCache() {
        Duration maxClockSkew = config.getMaxClockSkew();
        Duration replayWindow = maxClockSkew == null
                || maxClockSkew.isZero()
                || maxClockSkew.isNegative()
                || maxClockSkew.compareTo(MAX_CONFIGURED_CLOCK_SKEW) > 0
                ? DEFAULT_REPLAY_WINDOW
                : maxClockSkew.multipliedBy(2);
        return Caffeine.newBuilder()
                .maximumSize(MAX_REPLAY_ENTRIES)
                .expireAfterWrite(replayWindow)
                .build();
    }

    enum VerificationResult {
        VERIFIED(true),
        LEGACY_UNSIGNED(true),
        UNSIGNED(false),
        UNSUPPORTED_VERSION(false),
        MALFORMED(false),
        CHANNEL_MISMATCH(false),
        STALE(false),
        UNKNOWN_KEY(false),
        INVALID_SIGNATURE(false),
        REPLAY(false);

        private final boolean accepted;

        VerificationResult(boolean accepted) {
            this.accepted = accepted;
        }

        boolean accepted() {
            return accepted;
        }
    }

    private record KeyRing(
            String activeKeyId,
            byte[] activeKey,
            String previousKeyId,
            byte[] previousKey) {

        byte[] keyFor(String keyId) {
            if (activeKeyId.equals(keyId)) {
                return activeKey;
            }
            if (previousKeyId != null && previousKeyId.equals(keyId)) {
                return previousKey;
            }
            return null;
        }
    }
}
