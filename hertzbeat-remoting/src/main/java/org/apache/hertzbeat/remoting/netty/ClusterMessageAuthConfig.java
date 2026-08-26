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

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.util.AesUtil;

/**
 * Versioned cluster-message authentication and rollout settings.
 *
 * <p>The active secret may be configured independently. When it is absent,
 * the caller-provided root secret is domain-separated before HMAC use.</p>
 */
public final class ClusterMessageAuthConfig {

    private static final int MIN_EXPLICIT_SECRET_BYTES = 32;
    private static final int MIN_FALLBACK_SECRET_BYTES = 16;
    private static final int MIN_PREVIOUS_SECRET_BYTES = 16;
    private static final Duration MAX_ALLOWED_CLOCK_SKEW = Duration.ofMinutes(30);
    private static final Pattern KEY_ID_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,64}");

    private Mode mode = Mode.REQUIRED;
    private String activeKeyId = "primary";
    private String activeSecret;
    private String previousKeyId;
    private String previousSecret;
    private Duration maxClockSkew = Duration.ofMinutes(5);
    private Duration handshakeTimeout = Duration.ofSeconds(3);

    /**
     * Optional accepts legacy unsigned peers during rollout; required rejects them.
     */
    public enum Mode {
        OPTIONAL,
        REQUIRED
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

    public String getActiveKeyId() {
        return activeKeyId;
    }

    public void setActiveKeyId(String activeKeyId) {
        this.activeKeyId = activeKeyId;
    }

    public String getActiveSecret() {
        return activeSecret;
    }

    public void setActiveSecret(String activeSecret) {
        this.activeSecret = activeSecret;
    }

    public String getPreviousKeyId() {
        return previousKeyId;
    }

    public void setPreviousKeyId(String previousKeyId) {
        this.previousKeyId = previousKeyId;
    }

    public String getPreviousSecret() {
        return previousSecret;
    }

    public void setPreviousSecret(String previousSecret) {
        this.previousSecret = previousSecret;
    }

    public Duration getMaxClockSkew() {
        return maxClockSkew;
    }

    public void setMaxClockSkew(Duration maxClockSkew) {
        this.maxClockSkew = maxClockSkew;
    }

    public Duration getHandshakeTimeout() {
        return handshakeTimeout;
    }

    public void setHandshakeTimeout(Duration handshakeTimeout) {
        this.handshakeTimeout = handshakeTimeout;
    }

    /**
     * Validate all settings and resolved secrets before opening a Netty listener.
     *
     * @param fallbackSecret supplies the locally configured root secret when no
     *                       independent active secret is configured
     */
    public void validate(Supplier<String> fallbackSecret) {
        resolve(fallbackSecret);
    }

    ResolvedSecrets resolve(Supplier<String> fallbackSecret) {
        if (mode == null) {
            throw new IllegalStateException("Cluster message authentication mode must be configured");
        }
        validateKeyId(activeKeyId, "active");
        validateDuration(maxClockSkew, "max clock skew", MAX_ALLOWED_CLOCK_SKEW);
        validateDuration(handshakeTimeout, "handshake timeout", Duration.ofMinutes(1));

        boolean independentSecret = !isBlank(activeSecret);
        String resolvedActiveSecret = independentSecret
                ? activeSecret
                : fallbackSecret == null ? null : fallbackSecret.get();
        validateSecret(
                resolvedActiveSecret,
                independentSecret ? MIN_EXPLICIT_SECRET_BYTES : MIN_FALLBACK_SECRET_BYTES,
                "active");

        boolean hasPreviousKeyId = !isBlank(previousKeyId);
        boolean hasPreviousSecret = !isBlank(previousSecret);
        if (hasPreviousKeyId != hasPreviousSecret) {
            throw new IllegalStateException(
                    "Previous cluster authentication key id and secret must be configured together");
        }
        if (hasPreviousKeyId) {
            validateKeyId(previousKeyId, "previous");
            // Existing common.secret values are valid 16/24/32-byte AES roots.
            // Accepting a 16-byte previous root is required to rotate away from
            // the domain-separated fallback without interrupting a cluster.
            validateSecret(previousSecret, MIN_PREVIOUS_SECRET_BYTES, "previous");
            if (activeKeyId.equals(previousKeyId)) {
                throw new IllegalStateException("Active and previous cluster authentication key ids must differ");
            }
            if (resolvedActiveSecret.equals(previousSecret)) {
                throw new IllegalStateException("Active and previous cluster authentication secrets must differ");
            }
        }
        return new ResolvedSecrets(
                activeKeyId,
                resolvedActiveSecret,
                hasPreviousKeyId ? previousKeyId : null,
                hasPreviousSecret ? previousSecret : null);
    }

    private static void validateDuration(Duration value, String name, Duration maximum) {
        if (value == null || value.isZero() || value.isNegative() || value.compareTo(maximum) > 0) {
            throw new IllegalStateException(
                    "Cluster message authentication " + name + " must be positive and no more than " + maximum);
        }
    }

    private static void validateKeyId(String keyId, String name) {
        if (keyId == null || !KEY_ID_PATTERN.matcher(keyId).matches()) {
            throw new IllegalStateException(
                    "Cluster message authentication " + name + " key id must match "
                            + KEY_ID_PATTERN.pattern());
        }
    }

    private static void validateSecret(String secret, int minimumBytes, String name) {
        if (isBlank(secret)) {
            throw new IllegalStateException(
                    "Cluster message authentication " + name + " secret must be configured");
        }
        if (AesUtil.DEFAULT_ENCODE_RULES.equals(secret)) {
            throw new IllegalStateException(
                    "Cluster message authentication " + name + " secret must not use the default value");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < minimumBytes) {
            throw new IllegalStateException(
                    "Cluster message authentication " + name + " secret must contain at least "
                            + minimumBytes + " UTF-8 bytes");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    record ResolvedSecrets(
            String activeKeyId,
            String activeSecret,
            String previousKeyId,
            String previousSecret) {
    }
}
