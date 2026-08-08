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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.net.InetAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockRequest;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SetupHttpUnlockServiceTest {
    @TempDir
    private Path temporaryDirectory;

    @Test
    void completedSetupMustNotPublishAnotherRemoteUnlockCode() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock-code");
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), mock(ManagedConfigCapability.class),
                SetupPhase.COMPLETE, SetupAccess.LOCKED, true, "operator");

        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, Clock.systemUTC(), new SecureRandom()),
                InetAddress.getByName("0.0.0.0"), state, Clock.systemUTC())) {
            assertThat(service.requiresUnlock()).isFalse();
            assertThat(Files.exists(codeFile)).isFalse();
        }
    }

    @Test
    void ordinaryLoopbackSetupDoesNotPublishUnusedUnlockProof() throws Exception {
        Path codeFile = temporaryDirectory.resolve("local-unlock-code");
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), mock(ManagedConfigCapability.class),
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, Clock.systemUTC(), new SecureRandom()),
                InetAddress.getLoopbackAddress(), state, Clock.systemUTC())) {
            MockHttpServletRequest direct = new MockHttpServletRequest("GET", "/api/setup/status");
            assertThat(service.requiresUnlock(direct)).isFalse();
            assertThat(Files.exists(codeFile)).isFalse();
        }
    }

    @Test
    void untrustedForwardingRequiresUnlockAndCannotGrantSecureCookieOrPublicPolling() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock-code");
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), mock(ManagedConfigCapability.class),
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, Clock.systemUTC(), new SecureRandom()),
                InetAddress.getLoopbackAddress(), state, Clock.systemUTC())) {
            MockHttpServletRequest direct = new MockHttpServletRequest("GET", "/api/setup/status");
            assertThat(service.requiresUnlock(direct)).isFalse();
            MockHttpServletRequest forwarded = new MockHttpServletRequest(
                    "GET", "/api/setup/operations/operation-1");
            forwarded.setServletPath("/api/setup/operations/operation-1");
            forwarded.addHeader("X-Forwarded-Proto", "https");
            forwarded.setSecure(true);
            assertThat(service.requiresUnlock(forwarded)).isTrue();
            assertThat(service.secureCookie(forwarded)).isFalse();

            MockHttpServletResponse response = new MockHttpServletResponse();
            new SetupWriteAccessFilter(service, Clock.systemUTC()).doFilter(
                    forwarded, response, (request, target) -> request.setAttribute("called", true));
            assertThat(response.getStatus()).isEqualTo(403);
            assertThat(forwarded.getAttribute("called")).isNull();
        }
    }

    @Test
    void forwardedLoopbackCanRedeemOwnerProofAndPollWithConservativeCookie() throws Exception {
        Path codeFile = temporaryDirectory.resolve("unlock-code");
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), mock(ManagedConfigCapability.class),
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, Clock.systemUTC(), new SecureRandom()),
                InetAddress.getLoopbackAddress(), state, Clock.systemUTC())) {
            MockHttpServletRequest forwarded = new MockHttpServletRequest(
                    "POST", "/api/setup/unlock");
            forwarded.setRemoteAddr("127.0.0.1");
            forwarded.setSecure(true);
            forwarded.addHeader("Forwarded", "for=203.0.113.4;proto=https");
            assertThat(service.requiresUnlock(forwarded)).isTrue();
            assertThat(Files.getPosixFilePermissions(codeFile)).containsExactlyInAnyOrder(
                    PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE);
            String code = Files.readString(codeFile);

            var exchange = service.redeem(new UnlockRequest(code), forwarded);

            assertThat(exchange.cookie().isHttpOnly()).isTrue();
            assertThat(exchange.cookie().getSameSite()).isEqualTo("Strict");
            assertThat(exchange.cookie().isSecure()).isFalse();
            assertThat(state.status().access()).isEqualTo(SetupAccess.LOCAL);

            MockHttpServletRequest poll = new MockHttpServletRequest(
                    "GET", "/api/setup/operations/operation-1");
            poll.setServletPath("/api/setup/operations/operation-1");
            poll.addHeader("X-Forwarded-Proto", "https");
            poll.setSecure(true);
            poll.setCookies(new jakarta.servlet.http.Cookie(
                    SetupAccessCookie.NAME, exchange.cookie().getValue()));
            MockHttpServletResponse response = new MockHttpServletResponse();
            new SetupWriteAccessFilter(service, Clock.systemUTC()).doFilter(
                    poll, response, (request, target) -> request.setAttribute("called", true));

            assertThat(poll.getAttribute("called")).isEqualTo(true);
        }
    }

    @Test
    void expiredRemoteSessionRelocksUntilTheRenewedProofIsRedeemed() throws Exception {
        Path codeFile = temporaryDirectory.resolve("renewed-unlock-code");
        MutableClock clock = new MutableClock(Instant.parse("2026-08-08T00:00:00Z"));
        SetupRuntimeState state = new SetupRuntimeState(clock, mock(ManagedConfigCapability.class),
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCKED, false, null);
        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, clock, new SecureRandom()),
                InetAddress.getByName("0.0.0.0"), state, clock)) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/unlock");
            request.setRemoteAddr("198.51.100.4");
            service.redeem(new UnlockRequest(Files.readString(codeFile)), request);
            assertThat(state.status().access()).isEqualTo(SetupAccess.UNLOCKED);

            clock.advance(Duration.ofMinutes(16));
            assertThat(service.requiresUnlock(request)).isTrue();
            assertThat(state.status().access()).isEqualTo(SetupAccess.LOCKED);
            var renewed = service.redeem(new UnlockRequest(Files.readString(codeFile)), request);

            assertThat(renewed.response().access()).isEqualTo(SetupAccess.UNLOCKED);
            assertThat(state.status().access()).isEqualTo(SetupAccess.UNLOCKED);
        }
    }

    @Test
    void proofRenewalSerializesConcurrentRedemptionUntilRelockIsPublished() throws Exception {
        Path codeFile = temporaryDirectory.resolve("serialized-renewal-code");
        MutableClock clock = new MutableClock(Instant.parse("2026-08-08T00:00:00Z"));
        SetupRuntimeState state = new SetupRuntimeState(clock, mock(ManagedConfigCapability.class),
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCKED, false, null);
        try (SetupHttpUnlockService service = new SetupHttpUnlockService(
                new RemoteSetupUnlock(codeFile, clock, new SecureRandom()),
                InetAddress.getByName("0.0.0.0"), state, clock)) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/unlock");
            request.setRemoteAddr("198.51.100.7");
            service.redeem(new UnlockRequest(Files.readString(codeFile)), request);
            clock.advance(Duration.ofMinutes(16));
            AtomicReference<Throwable> failure = new AtomicReference<>();
            AtomicReference<SetupHttpUnlockService.UnlockExchange> exchange = new AtomicReference<>();
            Thread renew = new Thread(() -> {
                try {
                    service.ensureProof();
                } catch (Throwable error) {
                    failure.compareAndSet(null, error);
                }
            }, "setup-proof-renew");
            Thread redeem;

            synchronized (state) {
                renew.start();
                awaitBlocked(renew);
                assertThat(Files.exists(codeFile)).isTrue();
                String renewedCode = Files.readString(codeFile);
                redeem = new Thread(() -> {
                    try {
                        exchange.set(service.redeem(new UnlockRequest(renewedCode), request));
                    } catch (Throwable error) {
                        failure.compareAndSet(null, error);
                    }
                }, "setup-proof-redeem");
                redeem.start();
                awaitBlocked(redeem);
                assertThat(Files.exists(codeFile)).isTrue();
            }

            renew.join(5_000);
            redeem.join(5_000);
            assertThat(renew.isAlive()).isFalse();
            assertThat(redeem.isAlive()).isFalse();
            assertThat(failure.get()).isNull();
            assertThat(state.status().access()).isEqualTo(SetupAccess.UNLOCKED);
            assertThat(service.permits(exchange.get().cookie().getValue(), request)).isTrue();
        }
    }

    private static void awaitBlocked(Thread thread) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
        while (thread.getState() != Thread.State.BLOCKED && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertThat(thread.getState()).isEqualTo(Thread.State.BLOCKED);
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
