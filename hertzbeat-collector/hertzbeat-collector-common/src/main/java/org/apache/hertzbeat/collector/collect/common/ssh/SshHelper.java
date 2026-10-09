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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.common.cache.SshConnect;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.config.hosts.HostConfigEntry;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.RuntimeSshException;
import org.apache.sshd.common.SshConstants;
import org.apache.sshd.common.SshException;
import org.apache.sshd.common.config.keys.FilePasswordProvider;
import org.apache.sshd.common.util.security.SecurityUtils;
import org.springframework.util.StringUtils;

/**
 * ssh helper
 */
@Slf4j
public class SshHelper {

    private static final GlobalConnectionCache CONNECTION_COMMON_CACHE = GlobalConnectionCache.getInstance();
    private static final SshCircuitBreaker SSH_CIRCUIT_BREAKER = new SshCircuitBreaker();
    private static final ReentrantReadWriteLock CLIENT_IDENTITY_LOCK = new ReentrantReadWriteLock(true);

    public static ClientSession getConnectSession(String host, String port, String username, String password, String privateKey,
                                                  String privateKeyPassphrase, int timeout, boolean reuseConnection)
            throws IOException, GeneralSecurityException {
        SshProtocol sshProtocol = SshProtocol.builder()
                .host(host)
                .port(port)
                .username(username)
                .password(password)
                .privateKey(privateKey)
                .privateKeyPassphrase(privateKeyPassphrase)
                .build();
        return getConnectSession(sshProtocol, timeout, reuseConnection, false);
    }

    public static ClientSession getConnectSession(SshProtocol sshProtocol, int timeout, boolean reuseConnection, boolean useProxy)
            throws IOException, GeneralSecurityException {
        boolean proxyEnabled = useProxy && StringUtils.hasText(sshProtocol.getProxyHost());
        boolean cacheConnection = reuseConnection || proxyEnabled;
        List<String> targetIdentity = connectionIdentity(
                sshProtocol.getPassword(), sshProtocol.getPrivateKey(), sshProtocol.getPrivateKeyPassphrase());
        List<String> connectionIdentity = connectionIdentity(targetIdentity, sshProtocol, proxyEnabled);
        CacheIdentifier identifier = buildCacheIdentifier(
                sshProtocol.getHost(), sshProtocol.getPort(), sshProtocol.getUsername(), connectionIdentity);
        SshCircuitBreaker.Target targetCircuit = SSH_CIRCUIT_BREAKER.buildTarget(
                sshProtocol.getHost(), sshProtocol.getPort(), sshProtocol.getUsername(), targetIdentity);
        SshCircuitBreaker.Target proxyCircuit = proxyEnabled
                ? SSH_CIRCUIT_BREAKER.buildTarget(
                        sshProtocol.getProxyHost(), sshProtocol.getProxyPort(), sshProtocol.getProxyUsername(),
                        proxyIdentity(sshProtocol))
                : null;
        // Keep the final ProxyJump session cached with its intermediate session chain.
        if (cacheConnection) {
            ClientSession clientSession = getCachedSession(identifier);
            if (clientSession != null) {
                return clientSession;
            }
        }

        Lock connectionLock = SSH_CIRCUIT_BREAKER.connectionLock(targetCircuit);
        lockInterruptibly(connectionLock, "SSH connection");
        try {
            if (cacheConnection) {
                ClientSession clientSession = getCachedSession(identifier);
                if (clientSession != null) {
                    return clientSession;
                }
            }
            SSH_CIRCUIT_BREAKER.checkOpen(targetCircuit);
            if (proxyCircuit != null) {
                SSH_CIRCUIT_BREAKER.checkOpen(proxyCircuit);
            }
            SshClient sshClient = CommonSshClient.getSshClient();
            ClientSession clientSession = proxyEnabled
                    ? connectThroughProxy(sshClient, sshProtocol, timeout, proxyCircuit)
                    : connectDirect(sshClient, sshProtocol.getUsername(), sshProtocol.getHost(),
                            Integer.parseInt(sshProtocol.getPort()), timeout);
            return authenticate(clientSession, sshProtocol.getHost(), sshProtocol.getPassword(),
                    sshProtocol.getPrivateKey(), sshProtocol.getPrivateKeyPassphrase(),
                    timeout, cacheConnection, identifier, targetCircuit);
        } finally {
            connectionLock.unlock();
        }
    }

    private static ClientSession authenticate(
            ClientSession clientSession, String host, String password, String privateKey,
            String privateKeyPassphrase, int timeout, boolean cacheConnection,
            CacheIdentifier identifier, SshCircuitBreaker.Target circuitTarget)
            throws IOException, GeneralSecurityException {
        boolean authenticated = false;
        boolean identityReady = false;
        try {
            addIdentity(clientSession, host, password, privateKey, privateKeyPassphrase);
            identityReady = true;
            clientSession.auth().verify(timeout, TimeUnit.MILLISECONDS);
            authenticated = true;
            SSH_CIRCUIT_BREAKER.recordSuccess(circuitTarget);
            if (cacheConnection) {
                CONNECTION_COMMON_CACHE.addCache(identifier, new SshConnect(clientSession));
            }
            return clientSession;
        } catch (IOException | GeneralSecurityException | RuntimeException e) {
            if (!authenticated && ((!identityReady && isCredentialSetupFailure(e))
                    || isAuthenticationRejection(e))) {
                SSH_CIRCUIT_BREAKER.recordFailure(circuitTarget);
            }
            closeSessionOnFailure(clientSession, e);
            throw e;
        }
    }

    private static ClientSession connectDirect(
            SshClient sshClient, String username, String host, int port, int timeout) throws IOException {
        Lock identityLock = CLIENT_IDENTITY_LOCK.readLock();
        lockInterruptibly(identityLock, "SSH client identity");
        try {
            return sshClient.connect(username, host, port)
                    .verify(timeout, TimeUnit.MILLISECONDS).getSession();
        } finally {
            identityLock.unlock();
        }
    }

    private static ClientSession connectThroughProxy(
            SshClient sshClient, SshProtocol sshProtocol, int timeout, SshCircuitBreaker.Target proxyCircuit)
            throws IOException, GeneralSecurityException {
        Lock identityLock = CLIENT_IDENTITY_LOCK.writeLock();
        lockInterruptibly(identityLock, "SSH client identity");
        try {
            SSH_CIRCUIT_BREAKER.checkOpen(proxyCircuit);
            try {
                ClientSession clientSession = connectThroughProxyWithIdentity(sshClient, sshProtocol, timeout);
                SSH_CIRCUIT_BREAKER.recordSuccess(proxyCircuit);
                return clientSession;
            } catch (IOException | GeneralSecurityException | RuntimeException e) {
                if (isProxyAuthenticationFailure(e)) {
                    SSH_CIRCUIT_BREAKER.recordFailure(proxyCircuit);
                }
                throw e;
            }
        } finally {
            identityLock.unlock();
        }
    }

    private static ClientSession connectThroughProxyWithIdentity(
            SshClient sshClient, SshProtocol sshProtocol, int timeout)
            throws IOException, GeneralSecurityException {
        HostConfigEntry proxyConfig = new HostConfigEntry();
        String proxySpec = String.format("%s@%s:%d", sshProtocol.getProxyUsername(),
                sshProtocol.getProxyHost(), Integer.parseInt(sshProtocol.getProxyPort()));
        proxyConfig.setHostName(sshProtocol.getHost());
        proxyConfig.setHost(sshProtocol.getHost());
        proxyConfig.setPort(Integer.parseInt(sshProtocol.getPort()));
        proxyConfig.setUsername(sshProtocol.getUsername());
        proxyConfig.setProxyJump(proxySpec);

        String proxyPassword = StringUtils.hasText(sshProtocol.getProxyPassword())
                ? sshProtocol.getProxyPassword()
                : null;
        List<KeyPair> proxyKeyPairs = List.of();
        ClientSession clientSession = null;
        try {
            if (proxyPassword != null) {
                sshClient.addPasswordIdentity(proxyPassword);
            }
            if (StringUtils.hasText(sshProtocol.getProxyPrivateKey())) {
                try {
                    proxyKeyPairs = loadKeyPairs(
                            sshProtocol.getProxyHost(), sshProtocol.getProxyPrivateKey(), null);
                } catch (IOException | GeneralSecurityException e) {
                    throw new GeneralSecurityException("Failed to load proxy private key", e);
                }
                proxyKeyPairs.forEach(sshClient::addPublicKeyIdentity);
            }
            clientSession = sshClient.connect(proxyConfig)
                    .verify(timeout, TimeUnit.MILLISECONDS).getSession();
            if (proxyPassword != null) {
                clientSession.removePasswordIdentity(proxyPassword);
            }
            proxyKeyPairs.forEach(clientSession::removePublicKeyIdentity);
            return clientSession;
        } catch (IOException | GeneralSecurityException | RuntimeException e) {
            if (clientSession != null) {
                closeSessionOnFailure(clientSession, e);
            }
            throw e;
        } finally {
            if (proxyPassword != null) {
                sshClient.removePasswordIdentity(proxyPassword);
            }
            proxyKeyPairs.forEach(sshClient::removePublicKeyIdentity);
        }
    }

    private static void addIdentity(ClientSession clientSession, String host, String password, String privateKey,
                                    String privateKeyPassphrase) throws IOException, GeneralSecurityException {
        if (StringUtils.hasText(password)) {
            clientSession.addPasswordIdentity(password);
            return;
        }
        if (!StringUtils.hasText(privateKey)) {
            return;
        }
        loadKeyPairs(host, privateKey, privateKeyPassphrase).forEach(clientSession::addPublicKeyIdentity);
    }

    private static List<KeyPair> loadKeyPairs(String host, String privateKey, String privateKeyPassphrase)
            throws IOException, GeneralSecurityException {
        String resourceKey = "ssh-key-" + valueOrEmpty(host);
        FilePasswordProvider passwordProvider = (session, resource, index) ->
                StringUtils.hasText(privateKeyPassphrase) ? privateKeyPassphrase : null;
        try (InputStream keyStream = new ByteArrayInputStream(privateKey.getBytes(StandardCharsets.UTF_8))) {
            Iterable<KeyPair> keyPairs = SecurityUtils.loadKeyPairIdentities(
                    null, () -> resourceKey, keyStream, passwordProvider);
            if (keyPairs == null) {
                throw new GeneralSecurityException("Failed to load SSH private key");
            }
            List<KeyPair> loadedKeyPairs = new ArrayList<>();
            keyPairs.forEach(loadedKeyPairs::add);
            if (loadedKeyPairs.isEmpty()) {
                throw new GeneralSecurityException("SSH private key contains no identities");
            }
            return List.copyOf(loadedKeyPairs);
        }
    }

    private static ClientSession getCachedSession(CacheIdentifier identifier) {
        Optional<AbstractConnection<?>> cacheOption = CONNECTION_COMMON_CACHE.getCache(identifier, true);
        if (cacheOption.isEmpty()) {
            return null;
        }
        ClientSession clientSession;
        try {
            clientSession = ((SshConnect) cacheOption.get()).getConnection();
            if (clientSession == null || clientSession.isClosed() || clientSession.isClosing()) {
                CONNECTION_COMMON_CACHE.removeCache(identifier);
                return null;
            }
            return clientSession;
        } catch (Exception e) {
            log.warn("Failed to validate cached SSH session for {}", identifier, e);
            CONNECTION_COMMON_CACHE.removeCache(identifier);
            return null;
        }
    }

    private static CacheIdentifier buildCacheIdentifier(
            String host, String port, String username, List<String> connectionIdentity) {
        return CacheIdentifier.builder()
                .ip(host)
                .port(port)
                .username(username)
                .customArg(fingerprint(connectionIdentity))
                .build();
    }

    private static List<String> connectionIdentity(
            String password, String privateKey, String privateKeyPassphrase) {
        List<String> identity = new ArrayList<>();
        addAuthenticationIdentity(identity, password, privateKey, privateKeyPassphrase);
        return List.copyOf(identity);
    }

    private static List<String> connectionIdentity(
            List<String> targetIdentity, SshProtocol sshProtocol, boolean proxyEnabled) {
        List<String> identity = new ArrayList<>(targetIdentity);
        if (proxyEnabled) {
            identity.add("proxy");
            identity.add(valueOrEmpty(sshProtocol.getProxyHost()));
            identity.add(valueOrEmpty(sshProtocol.getProxyPort()));
            identity.add(valueOrEmpty(sshProtocol.getProxyUsername()));
            identity.add(textOrEmpty(sshProtocol.getProxyPassword()));
            identity.add(textOrEmpty(sshProtocol.getProxyPrivateKey()));
        }
        return List.copyOf(identity);
    }

    private static List<String> proxyIdentity(SshProtocol sshProtocol) {
        List<String> identity = new ArrayList<>();
        if (StringUtils.hasText(sshProtocol.getProxyPassword())) {
            identity.add("proxy-password");
            identity.add(sshProtocol.getProxyPassword());
        }
        if (StringUtils.hasText(sshProtocol.getProxyPrivateKey())) {
            identity.add("proxy-private-key");
            identity.add(sshProtocol.getProxyPrivateKey());
        }
        if (identity.isEmpty()) {
            identity.add("proxy-default");
        }
        return List.copyOf(identity);
    }

    private static void addAuthenticationIdentity(
            List<String> identity, String password, String privateKey, String privateKeyPassphrase) {
        if (StringUtils.hasText(password)) {
            identity.add("target-password");
            identity.add(password);
        } else if (StringUtils.hasText(privateKey)) {
            identity.add("target-private-key");
            identity.add(privateKey);
            identity.add(textOrEmpty(privateKeyPassphrase));
        } else {
            identity.add("target-default");
        }
    }

    private static String fingerprint(List<String> connectionIdentity) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String component : connectionIdentity) {
                byte[] bytes = component.getBytes(StandardCharsets.UTF_8);
                digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
                digest.update(bytes);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String textOrEmpty(String value) {
        return StringUtils.hasText(value) ? value : "";
    }

    private static boolean isCredentialSetupFailure(Exception exception) {
        return !(exception instanceof InterruptedIOException)
                && (exception instanceof IOException || exception instanceof GeneralSecurityException);
    }

    private static boolean isProxyAuthenticationFailure(Exception exception) {
        return exception instanceof GeneralSecurityException || isAuthenticationRejection(exception);
    }

    private static boolean isAuthenticationRejection(Exception exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof InterruptedIOException) {
                return false;
            }
            if (current instanceof SshException sshException) {
                int disconnectCode = sshException.getDisconnectCode();
                return disconnectCode == SshConstants.SSH2_DISCONNECT_NO_MORE_AUTH_METHODS_AVAILABLE
                        || disconnectCode == SshConstants.SSH2_DISCONNECT_HOST_AUTHENTICATION_FAILED
                        || disconnectCode == SshConstants.SSH2_DISCONNECT_ILLEGAL_USER_NAME;
            }
            current = current instanceof RuntimeSshException ? current.getCause() : null;
        }
        return false;
    }

    private static void lockInterruptibly(Lock lock, String operation) throws InterruptedIOException {
        try {
            lock.lockInterruptibly();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            InterruptedIOException exception = new InterruptedIOException(operation + " interrupted");
            exception.initCause(e);
            throw exception;
        }
    }

    private static void closeSessionOnFailure(ClientSession clientSession, Exception originalException) {
        if (clientSession == null) {
            return;
        }
        if (originalException instanceof InterruptedIOException) {
            try {
                clientSession.close(true);
            } catch (RuntimeException closeException) {
                originalException.addSuppressed(closeException);
            } finally {
                Thread.currentThread().interrupt();
            }
            return;
        }
        try {
            clientSession.close();
        } catch (Exception closeException) {
            if (closeException instanceof InterruptedIOException) {
                Thread.currentThread().interrupt();
            }
            originalException.addSuppressed(closeException);
        }
    }
}
