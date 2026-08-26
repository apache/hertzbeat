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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.protobuf.ByteString;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.junit.jupiter.api.Test;

class ClusterMessageAuthenticatorTest {

    private static final String ACTIVE_SECRET = "active-cluster-secret-32-bytes!!";
    private static final String PREVIOUS_SECRET = "previous-cluster-secret-32-bytes";
    private static final String LEGACY_AES_SECRET = "legacy-root-1234";
    private static final Instant NOW = Instant.parse("2026-07-30T08:00:00Z");
    private static final ByteString CHANNEL_NONCE =
            ByteString.copyFromUtf8("server-channel-nonce-32-bytes!!!");

    @Test
    void shouldRequireAuthenticationByDefault() {
        assertEquals(
                ClusterMessageAuthConfig.Mode.REQUIRED,
                new ClusterMessageAuthConfig().getMode());
    }

    @Test
    void shouldSupportOptionalThenRequiredRollout() {
        ClusterMsg.Message unsigned = message();

        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.LEGACY_UNSIGNED,
                authenticator(config(ClusterMessageAuthConfig.Mode.OPTIONAL), NOW, 1).verify(unsigned, CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.UNSIGNED,
                authenticator(config(ClusterMessageAuthConfig.Mode.REQUIRED), NOW, 1).verify(unsigned, CHANNEL_NONCE));
    }

    @Test
    void shouldSignVersionedEnvelopeBoundToChannelAndRejectReplay() {
        ClusterMessageAuthenticator sender =
                authenticator(config(ClusterMessageAuthConfig.Mode.REQUIRED), NOW, 1);
        ClusterMessageAuthenticator receiver =
                authenticator(config(ClusterMessageAuthConfig.Mode.REQUIRED), NOW, 20);

        ClusterMsg.Message signed = sender.sign(message(), CHANNEL_NONCE);

        assertEquals(1, signed.getAuthVersion());
        assertEquals("active", signed.getAuthKeyId());
        assertEquals(CHANNEL_NONCE, signed.getAuthChannelNonce());
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.VERIFIED,
                receiver.verify(signed, CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.REPLAY,
                receiver.verify(signed, CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.CHANNEL_MISMATCH,
                authenticator(config(ClusterMessageAuthConfig.Mode.REQUIRED), NOW, 30)
                        .verify(signed, ByteString.copyFromUtf8("different-channel-nonce-32-byte")));
    }

    @Test
    void shouldAcceptPreviousKeyWhileAlwaysSigningWithActiveKey() {
        ClusterMessageAuthConfig senderConfig = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        senderConfig.setActiveKeyId("previous");
        senderConfig.setActiveSecret(PREVIOUS_SECRET);
        ClusterMessageAuthConfig receiverConfig = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        receiverConfig.setPreviousKeyId("previous");
        receiverConfig.setPreviousSecret(PREVIOUS_SECRET);
        ClusterMessageAuthenticator sender = authenticator(senderConfig, NOW, 1);
        ClusterMessageAuthenticator receiver = authenticator(receiverConfig, NOW, 20);

        ClusterMsg.Message previousKeyMessage = sender.sign(message(), CHANNEL_NONCE);
        ClusterMsg.Message activeKeyMessage = receiver.sign(message(), CHANNEL_NONCE);

        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.VERIFIED,
                receiver.verify(previousKeyMessage, CHANNEL_NONCE));
        assertEquals("active", activeKeyMessage.getAuthKeyId());
    }

    @Test
    void shouldRotateFromExistingSixteenByteRootSecret() {
        ClusterMessageAuthConfig legacyConfig = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        legacyConfig.setActiveKeyId("legacy");
        legacyConfig.setActiveSecret(null);
        ClusterMessageAuthenticator legacySender = new ClusterMessageAuthenticator(
                legacyConfig,
                () -> LEGACY_AES_SECRET,
                Clock.fixed(NOW, ZoneOffset.UTC),
                () -> ByteString.copyFromUtf8("0000000000000001"));
        ClusterMessageAuthConfig rotatedConfig = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        rotatedConfig.setPreviousKeyId("legacy");
        rotatedConfig.setPreviousSecret(LEGACY_AES_SECRET);

        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.VERIFIED,
                authenticator(rotatedConfig, NOW, 20)
                        .verify(legacySender.sign(message(), CHANNEL_NONCE), CHANNEL_NONCE));
    }

    @Test
    void shouldReportTamperUnknownKeyUnsupportedVersionAndConfiguredClockSkew() {
        ClusterMessageAuthConfig config = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        config.setMaxClockSkew(Duration.ofSeconds(30));
        ClusterMsg.Message signed = authenticator(config, NOW, 1).sign(message(), CHANNEL_NONCE);

        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.INVALID_SIGNATURE,
                authenticator(config, NOW, 20)
                        .verify(signed.toBuilder().setIdentity("collector-2").build(), CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.UNKNOWN_KEY,
                authenticator(config, NOW, 20)
                        .verify(signed.toBuilder().setAuthKeyId("unknown").build(), CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.UNSUPPORTED_VERSION,
                authenticator(config, NOW, 20)
                        .verify(signed.toBuilder().setAuthVersion(2).build(), CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.STALE,
                authenticator(config, NOW.plusSeconds(31), 20).verify(signed, CHANNEL_NONCE));
        assertEquals(
                ClusterMessageAuthenticator.VerificationResult.STALE,
                authenticator(config, Instant.ofEpochMilli(Long.MIN_VALUE), 20)
                        .verify(signed.toBuilder().setAuthTimestamp(Long.MAX_VALUE).build(), CHANNEL_NONCE));
    }

    @Test
    void shouldFailFastForMissingDefaultAndWeakSecrets() {
        ClusterMessageAuthConfig missing = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        missing.setActiveSecret(null);
        assertThrows(IllegalStateException.class, () -> missing.validate(() -> null));

        ClusterMessageAuthConfig defaultSecret = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        defaultSecret.setActiveSecret("tomSun28HaHaHaHa");
        assertThrows(IllegalStateException.class, () -> defaultSecret.validate(() -> null));

        ClusterMessageAuthConfig weak = config(ClusterMessageAuthConfig.Mode.REQUIRED);
        weak.setActiveSecret("too-short");
        assertThrows(IllegalStateException.class, () -> weak.validate(() -> null));
    }

    private ClusterMessageAuthenticator authenticator(
            ClusterMessageAuthConfig config, Instant now, int nonceSeed) {
        AtomicInteger nonce = new AtomicInteger(nonceSeed);
        return new ClusterMessageAuthenticator(
                config,
                () -> null,
                Clock.fixed(now, ZoneOffset.UTC),
                () -> ByteString.copyFromUtf8("%016d".formatted(nonce.getAndIncrement())));
    }

    private ClusterMessageAuthConfig config(ClusterMessageAuthConfig.Mode mode) {
        ClusterMessageAuthConfig config = new ClusterMessageAuthConfig();
        config.setMode(mode);
        config.setActiveKeyId("active");
        config.setActiveSecret(ACTIVE_SECRET);
        return config;
    }

    private ClusterMsg.Message message() {
        return ClusterMsg.Message.newBuilder()
                .setIdentity("collector-1")
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.RESPONSE_CYCLIC_TASK_DATA)
                .setMsg(ByteString.copyFromUtf8("metrics"))
                .build();
    }
}
