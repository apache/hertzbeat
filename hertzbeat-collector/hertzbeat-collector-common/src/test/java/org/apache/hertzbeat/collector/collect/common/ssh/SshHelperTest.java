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

package org.apache.hertzbeat.collector.collect.common.ssh;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.security.KeyPair;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.config.hosts.HostConfigEntry;
import org.apache.sshd.client.future.AuthFuture;
import org.apache.sshd.client.future.ConnectFuture;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.SshConstants;
import org.apache.sshd.common.SshException;
import org.apache.sshd.common.config.keys.FilePasswordProvider;
import org.apache.sshd.common.util.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.MockedStatic;

/**
 * Tests for {@link SshHelper}.
 */
class SshHelperTest {

    private static final int TIMEOUT = 1_000;

    private String host;
    private SshClient sshClient;

    @BeforeEach
    void setUp() {
        host = UUID.randomUUID() + ".example.com";
        sshClient = mock(SshClient.class);
    }

    @Test
    void blocksSameEffectiveCredentialsAndRetriesAfterPasswordChanges() throws Exception {
        ConnectAttempt firstFailure = failedAttempt("first auth failure");
        ConnectAttempt secondFailure = failedAttempt("second auth failure");
        ConnectAttempt thirdFailure = failedAttempt("third auth failure");
        ConnectAttempt success = successfulAttempt();
        when(sshClient.connect("root", host, 22)).thenReturn(
                firstFailure.connectFuture(), secondFailure.connectFuture(),
                thirdFailure.connectFuture(), success.connectFuture());

        SshProtocol badProtocol = protocol("bad-password", "ignored-private-key-a");
        SshProtocol samePassword = protocol("bad-password", "ignored-private-key-b");
        SshProtocol correctedProtocol = protocol("correct-password", "ignored-private-key-b");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            for (int i = 0; i < SshCircuitBreaker.MAX_FAILURES; i++) {
                assertThrows(SshException.class,
                        () -> SshHelper.getConnectSession(badProtocol, TIMEOUT, false, false));
            }
            IOException blocked = assertThrows(IOException.class,
                    () -> SshHelper.getConnectSession(samePassword, TIMEOUT, false, false));
            assertTrue(blocked.getMessage().contains("temporarily blocked"));

            assertSame(success.clientSession(),
                    SshHelper.getConnectSession(correctedProtocol, TIMEOUT, false, false));
        }

        verify(sshClient, times(4)).connect("root", host, 22);
        verify(firstFailure.clientSession()).close();
        verify(secondFailure.clientSession()).close();
        verify(thirdFailure.clientSession()).close();
        verify(success.clientSession(), never()).close();
        verify(success.clientSession()).addPasswordIdentity("correct-password");
    }

    @Test
    void concurrentReuseCreatesOnePhysicalSession() throws Exception {
        ConnectAttempt success = successfulAttempt();
        CountDownLatch authenticationStarted = new CountDownLatch(1);
        CountDownLatch allowAuthentication = new CountDownLatch(1);
        when(success.authFuture().verify(TIMEOUT, TimeUnit.MILLISECONDS)).thenAnswer(invocation -> {
            authenticationStarted.countDown();
            assertTrue(allowAuthentication.await(5, TimeUnit.SECONDS));
            return success.authFuture();
        });
        when(success.clientSession().isClosed()).thenReturn(false);
        when(success.clientSession().isClosing()).thenReturn(false);
        when(sshClient.connect("root", host, 22)).thenReturn(success.connectFuture());

        CountDownLatch secondStarted = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<ClientSession> first = executor.submit(() -> connectWithThreadLocalClient("password"));
            assertTrue(authenticationStarted.await(5, TimeUnit.SECONDS));
            Future<ClientSession> second = executor.submit(() -> {
                secondStarted.countDown();
                return connectWithThreadLocalClient("password");
            });
            assertTrue(secondStarted.await(5, TimeUnit.SECONDS));

            assertThrows(TimeoutException.class, () -> second.get(200, TimeUnit.MILLISECONDS));
            verify(sshClient).connect("root", host, 22);
            allowAuthentication.countDown();
            assertSame(success.clientSession(), first.get(5, TimeUnit.SECONDS));
            assertSame(success.clientSession(), second.get(5, TimeUnit.SECONDS));
        } finally {
            allowAuthentication.countDown();
        }

        verify(sshClient).connect("root", host, 22);
        verify(success.clientSession()).auth();
        verify(success.authFuture()).verify(TIMEOUT, TimeUnit.MILLISECONDS);
    }

    @Test
    void concurrentAuthenticationFailuresCreateAtMostThreePhysicalSessions() throws Exception {
        ConnectAttempt firstFailure = failedAttempt("first concurrent failure");
        ConnectAttempt secondFailure = failedAttempt("second concurrent failure");
        ConnectAttempt thirdFailure = failedAttempt("third concurrent failure");
        when(sshClient.connect("root", host, 22)).thenReturn(
                firstFailure.connectFuture(), secondFailure.connectFuture(), thirdFailure.connectFuture());

        int taskCount = 8;
        CountDownLatch ready = new CountDownLatch(taskCount);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Exception>> futures = new ArrayList<>();
        try (ExecutorService executor = Executors.newFixedThreadPool(taskCount)) {
            for (int i = 0; i < taskCount; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    try {
                        connectWithThreadLocalClient("concurrent-bad-password", false);
                        return null;
                    } catch (Exception e) {
                        return e;
                    }
                }));
            }
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
        }

        int authenticationFailures = 0;
        int blockedFailures = 0;
        for (Future<Exception> future : futures) {
            Exception exception = future.get(5, TimeUnit.SECONDS);
            if (exception instanceof SshException) {
                authenticationFailures++;
            } else {
                assertTrue(exception instanceof IOException);
                assertTrue(exception.getMessage().contains("temporarily blocked"));
                blockedFailures++;
            }
        }
        assertEquals(SshCircuitBreaker.MAX_FAILURES, authenticationFailures);
        assertEquals(taskCount - SshCircuitBreaker.MAX_FAILURES, blockedFailures);
        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES)).connect("root", host, 22);
        verify(firstFailure.clientSession()).close();
        verify(secondFailure.clientSession()).close();
        verify(thirdFailure.clientSession()).close();
    }

    @Test
    void proxyFailuresOpenCircuitAndRemoveGlobalPassword() throws Exception {
        ConnectFuture connectFuture = mock(ConnectFuture.class);
        ConnectAttempt correctedSuccess = successfulAttempt();
        when(sshClient.connect(any(HostConfigEntry.class))).thenReturn(
                connectFuture, connectFuture, connectFuture, correctedSuccess.connectFuture());
        when(connectFuture.verify(TIMEOUT, TimeUnit.MILLISECONDS))
                .thenThrow(new SshException(
                        SshConstants.SSH2_DISCONNECT_NO_MORE_AUTH_METHODS_AVAILABLE, "proxy auth failed"));
        SshProtocol protocol = proxyProtocol("bad-proxy-password", "target-password");
        SshProtocol otherTarget = proxyProtocol("bad-proxy-password", "different-target-password");
        otherTarget.setHost(UUID.randomUUID() + ".example.com");
        SshProtocol correctedProtocol = proxyProtocol("correct-proxy-password", "target-password");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            for (int i = 0; i < SshCircuitBreaker.MAX_FAILURES; i++) {
                assertThrows(SshException.class,
                        () -> SshHelper.getConnectSession(protocol, TIMEOUT, false, true));
            }
            IOException blocked = assertThrows(IOException.class,
                    () -> SshHelper.getConnectSession(protocol, TIMEOUT, false, true));
            assertTrue(blocked.getMessage().contains("temporarily blocked"));
            IOException sharedProxyBlocked = assertThrows(IOException.class,
                    () -> SshHelper.getConnectSession(otherTarget, TIMEOUT, false, true));
            assertTrue(sharedProxyBlocked.getMessage().contains("temporarily blocked"));

            assertSame(correctedSuccess.clientSession(),
                    SshHelper.getConnectSession(correctedProtocol, TIMEOUT, false, true));
        }

        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES + 1)).connect(any(HostConfigEntry.class));
        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES))
                .addPasswordIdentity("bad-proxy-password");
        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES))
                .removePasswordIdentity("bad-proxy-password");
        verify(sshClient).addPasswordIdentity("correct-proxy-password");
        verify(sshClient).removePasswordIdentity("correct-proxy-password");
    }

    @Test
    void cachedProxySessionDoesNotResetProxyAuthenticationFailures() throws Exception {
        ConnectAttempt cachedSuccess = successfulAttempt();
        ConnectFuture failedProxyConnect = mock(ConnectFuture.class);
        when(failedProxyConnect.verify(TIMEOUT, TimeUnit.MILLISECONDS))
                .thenThrow(new SshException(
                        SshConstants.SSH2_DISCONNECT_NO_MORE_AUTH_METHODS_AVAILABLE, "proxy auth failed"));
        when(cachedSuccess.clientSession().isClosed()).thenReturn(false);
        when(cachedSuccess.clientSession().isClosing()).thenReturn(false);
        when(sshClient.connect(any(HostConfigEntry.class))).thenReturn(
                cachedSuccess.connectFuture(), failedProxyConnect, failedProxyConnect, failedProxyConnect);
        String proxyPassword = UUID.randomUUID() + "-proxy-password";
        SshProtocol cachedProtocol = proxyProtocol(proxyPassword, "cached-target-password");
        SshProtocol failingProtocol = proxyProtocol(proxyPassword, "failing-target-password");
        failingProtocol.setHost(UUID.randomUUID() + ".example.com");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            assertSame(cachedSuccess.clientSession(),
                    SshHelper.getConnectSession(cachedProtocol, TIMEOUT, false, true));
            for (int i = 0; i < SshCircuitBreaker.MAX_FAILURES; i++) {
                assertThrows(SshException.class,
                        () -> SshHelper.getConnectSession(failingProtocol, TIMEOUT, false, true));
                assertSame(cachedSuccess.clientSession(),
                        SshHelper.getConnectSession(cachedProtocol, TIMEOUT, false, true));
            }
            IOException blocked = assertThrows(IOException.class,
                    () -> SshHelper.getConnectSession(failingProtocol, TIMEOUT, false, true));
            assertTrue(blocked.getMessage().contains("temporarily blocked"));
        }

        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES + 1))
                .connect(any(HostConfigEntry.class));
    }

    @Test
    void proxyTransportFailuresDoNotOpenAuthenticationCircuit() throws Exception {
        ConnectFuture connectFuture = mock(ConnectFuture.class);
        when(sshClient.connect(any(HostConfigEntry.class))).thenReturn(connectFuture);
        when(connectFuture.verify(TIMEOUT, TimeUnit.MILLISECONDS))
                .thenThrow(new SshException(
                        SshConstants.SSH2_DISCONNECT_CONNECTION_LOST, "proxy transport failed"));
        String proxyPassword = UUID.randomUUID() + "-proxy-password";
        SshProtocol protocol = proxyProtocol(proxyPassword, "target-password");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            for (int i = 0; i < SshCircuitBreaker.MAX_FAILURES + 1; i++) {
                assertThrows(SshException.class,
                        () -> SshHelper.getConnectSession(protocol, TIMEOUT, false, true));
            }
        }

        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES + 1))
                .connect(any(HostConfigEntry.class));
        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES + 1))
                .addPasswordIdentity(proxyPassword);
        verify(sshClient, times(SshCircuitBreaker.MAX_FAILURES + 1))
                .removePasswordIdentity(proxyPassword);
    }

    @Test
    void proxyPasswordIsRemovedBeforeTargetAuthentication() throws Exception {
        ConnectAttempt success = successfulAttempt();
        when(sshClient.connect(any(HostConfigEntry.class))).thenReturn(success.connectFuture());
        SshProtocol protocol = proxyProtocol("proxy-password", "target-password");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            assertSame(success.clientSession(),
                    SshHelper.getConnectSession(protocol, TIMEOUT, false, true));
        }

        verify(sshClient).addPasswordIdentity("proxy-password");
        verify(sshClient).connect(any(HostConfigEntry.class));
        verify(success.connectFuture()).verify(TIMEOUT, TimeUnit.MILLISECONDS);
        verify(sshClient).removePasswordIdentity("proxy-password");

        InOrder order = inOrder(success.clientSession(), success.authFuture());
        order.verify(success.clientSession()).removePasswordIdentity("proxy-password");
        order.verify(success.clientSession()).addPasswordIdentity("target-password");
        order.verify(success.clientSession()).auth();
        order.verify(success.authFuture()).verify(TIMEOUT, TimeUnit.MILLISECONDS);

        ArgumentCaptor<HostConfigEntry> configCaptor = ArgumentCaptor.forClass(HostConfigEntry.class);
        verify(sshClient).connect(configCaptor.capture());
        HostConfigEntry proxyConfig = configCaptor.getValue();
        assertEquals(host, proxyConfig.getHostName());
        assertEquals("root", proxyConfig.getUsername());
        assertEquals("proxy-user@proxy.example.com:2222", proxyConfig.getProxyJump());
    }

    @Test
    void defaultIdentityReconnectsAfterCachedSessionsBecomeUnhealthy() throws Exception {
        ConnectAttempt first = successfulAttempt();
        ConnectAttempt second = successfulAttempt();
        ConnectAttempt third = successfulAttempt();
        when(sshClient.connect("root", host, 22)).thenReturn(
                first.connectFuture(), second.connectFuture(), third.connectFuture());

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            assertSame(first.clientSession(), SshHelper.getConnectSession(
                    host, "22", "root", null, null, null, TIMEOUT, true));
            when(first.clientSession().isClosed()).thenReturn(true);
            assertSame(second.clientSession(), SshHelper.getConnectSession(
                    host, "22", "root", null, null, null, TIMEOUT, true));
            when(second.clientSession().isClosed()).thenThrow(new IllegalStateException("health check failed"));
            assertSame(third.clientSession(), SshHelper.getConnectSession(
                    host, "22", "root", null, null, null, TIMEOUT, true));
            when(third.clientSession().isClosed()).thenReturn(false);
            when(third.clientSession().isClosing()).thenReturn(false);
            assertSame(third.clientSession(), SshHelper.getConnectSession(
                    host, "22", "root", null, null, null, TIMEOUT, true));
        }

        verify(sshClient, times(3)).connect("root", host, 22);
        verify(first.clientSession()).close();
        verify(second.clientSession()).close();
        verify(third.clientSession(), never()).close();
        verify(first.clientSession(), never()).addPasswordIdentity(any());
        verify(first.clientSession(), never()).addPublicKeyIdentity(any());
    }

    @Test
    void loadsTargetPrivateKeyDirectlyFromMemory() throws Exception {
        ConnectAttempt success = successfulAttempt();
        KeyPair keyPair = mock(KeyPair.class);
        when(sshClient.connect("root", host, 22)).thenReturn(success.connectFuture());

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class);
             MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);
            securityUtils.when(() -> SecurityUtils.loadKeyPairIdentities(any(), any(), any(), any()))
                    .thenAnswer(invocation -> {
                        FilePasswordProvider provider = invocation.getArgument(3);
                        assertEquals("passphrase", provider.getPassword(null, null, 0));
                        return List.of(keyPair);
                    });

            assertSame(success.clientSession(), SshHelper.getConnectSession(
                    host, "22", "root", null, "private-key", "passphrase", TIMEOUT, false));
        }

        verify(success.clientSession()).addPublicKeyIdentity(keyPair);
        verify(success.clientSession(), never()).addPasswordIdentity(any());
    }

    @Test
    void proxyPrivateKeyIsRemovedBeforeTargetAuthentication() throws Exception {
        ConnectAttempt success = successfulAttempt();
        KeyPair keyPair = mock(KeyPair.class);
        when(sshClient.connect(any(HostConfigEntry.class))).thenReturn(success.connectFuture());
        SshProtocol protocol = proxyProtocol(null, "target-password");
        protocol.setProxyPrivateKey("proxy-private-key");

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class);
             MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);
            securityUtils.when(() -> SecurityUtils.loadKeyPairIdentities(any(), any(), any(), any()))
                    .thenAnswer(invocation -> {
                        FilePasswordProvider provider = invocation.getArgument(3);
                        assertNull(provider.getPassword(null, null, 0));
                        return List.of(keyPair);
                    });

            assertSame(success.clientSession(),
                    SshHelper.getConnectSession(protocol, TIMEOUT, false, true));
        }

        verify(sshClient).addPublicKeyIdentity(keyPair);
        verify(sshClient).removePublicKeyIdentity(keyPair);
        verify(success.clientSession()).removePublicKeyIdentity(keyPair);
        verify(sshClient, never()).addPasswordIdentity(any());
    }

    @Test
    void connectionLockInterruptionIsPropagated() {
        Thread.currentThread().interrupt();
        try {
            InterruptedIOException exception = assertThrows(InterruptedIOException.class,
                    () -> SshHelper.getConnectSession(
                            host, "22", "root", "password", null, null, TIMEOUT, true));

            assertTrue(exception.getMessage().contains("SSH connection"));
            assertTrue(exception.getCause() instanceof InterruptedException);
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void interruptedAuthenticationForcesSessionCloseAndPreservesInterrupt() throws Exception {
        ConnectAttempt attempt = attempt();
        InterruptedIOException interrupted = new InterruptedIOException("authentication interrupted");
        when(attempt.authFuture().verify(TIMEOUT, TimeUnit.MILLISECONDS)).thenThrow(interrupted);
        when(sshClient.connect("root", host, 22)).thenReturn(attempt.connectFuture());

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);
            try {
                assertSame(interrupted, assertThrows(InterruptedIOException.class,
                        () -> SshHelper.getConnectSession(
                                host, "22", "root", "password", null, null, TIMEOUT, false)));
                assertTrue(Thread.currentThread().isInterrupted());
                verify(attempt.clientSession()).close(true);
                verify(attempt.clientSession(), never()).close();
            } finally {
                Thread.interrupted();
            }
        }
    }

    @Test
    void closeFailureDoesNotHideAuthenticationFailure() throws Exception {
        ConnectAttempt attempt = attempt();
        SshException authenticationFailure = new SshException(
                SshConstants.SSH2_DISCONNECT_NO_MORE_AUTH_METHODS_AVAILABLE, "auth failed");
        InterruptedIOException closeFailure = new InterruptedIOException("close interrupted");
        when(attempt.authFuture().verify(TIMEOUT, TimeUnit.MILLISECONDS)).thenThrow(authenticationFailure);
        doThrow(closeFailure).when(attempt.clientSession()).close();
        when(sshClient.connect("root", host, 22)).thenReturn(attempt.connectFuture());

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);
            try {
                SshException thrown = assertThrows(SshException.class,
                        () -> SshHelper.getConnectSession(
                                host, "22", "root", "password", null, null, TIMEOUT, false));
                assertSame(authenticationFailure, thrown);
                assertEquals(1, thrown.getSuppressed().length);
                assertSame(closeFailure, thrown.getSuppressed()[0]);
                assertTrue(Thread.currentThread().isInterrupted());
            } finally {
                Thread.interrupted();
            }
        }
    }

    private ClientSession connectWithThreadLocalClient(String password) throws Exception {
        return connectWithThreadLocalClient(password, true);
    }

    private ClientSession connectWithThreadLocalClient(String password, boolean reuseConnection) throws Exception {
        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);
            return SshHelper.getConnectSession(
                    host, "22", "root", password, null, null, TIMEOUT, reuseConnection);
        }
    }

    private SshProtocol protocol(String password, String privateKey) {
        return SshProtocol.builder()
                .host(host)
                .port("22")
                .username("root")
                .password(password)
                .privateKey(privateKey)
                .build();
    }

    private SshProtocol proxyProtocol(String proxyPassword, String targetPassword) {
        return SshProtocol.builder()
                .host(host)
                .port("22")
                .username("root")
                .password(targetPassword)
                .proxyHost("proxy.example.com")
                .proxyPort("2222")
                .proxyUsername("proxy-user")
                .proxyPassword(proxyPassword)
                .build();
    }

    private ConnectAttempt failedAttempt(String message) throws IOException {
        ConnectAttempt attempt = attempt();
        when(attempt.authFuture().verify(TIMEOUT, TimeUnit.MILLISECONDS))
                .thenThrow(new SshException(
                        SshConstants.SSH2_DISCONNECT_NO_MORE_AUTH_METHODS_AVAILABLE, message));
        return attempt;
    }

    private ConnectAttempt successfulAttempt() throws IOException {
        ConnectAttempt attempt = attempt();
        when(attempt.authFuture().verify(TIMEOUT, TimeUnit.MILLISECONDS))
                .thenReturn(attempt.authFuture());
        return attempt;
    }

    private ConnectAttempt attempt() throws IOException {
        ConnectFuture connectFuture = mock(ConnectFuture.class);
        ClientSession clientSession = mock(ClientSession.class);
        AuthFuture authFuture = mock(AuthFuture.class);
        when(connectFuture.verify(TIMEOUT, TimeUnit.MILLISECONDS)).thenReturn(connectFuture);
        when(connectFuture.getSession()).thenReturn(clientSession);
        when(clientSession.auth()).thenReturn(authFuture);
        return new ConnectAttempt(connectFuture, clientSession, authFuture);
    }

    private record ConnectAttempt(
            ConnectFuture connectFuture, ClientSession clientSession, AuthFuture authFuture) {
    }
}
