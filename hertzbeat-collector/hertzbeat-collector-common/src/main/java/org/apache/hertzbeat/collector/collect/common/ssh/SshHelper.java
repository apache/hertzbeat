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

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.common.cache.SshConnect;
import org.apache.hertzbeat.collector.util.PrivateKeyUtils;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.config.hosts.HostConfigEntry;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.config.keys.FilePasswordProvider;
import org.apache.sshd.common.util.security.SecurityUtils;
import org.springframework.util.StringUtils;

/**
 * SSH helper
 */
@Slf4j
public class SshHelper {

    private static final GlobalConnectionCache CONNECTION_COMMON_CACHE =
        GlobalConnectionCache.getInstance();

    public static ClientSession getConnectSession(
        String host,
        String port,
        String username,
        String password,
        String privateKey,
        String privateKeyPassphrase,
        int timeout,
        boolean reuseConnection)
        throws IOException, GeneralSecurityException {

        CacheIdentifier identifier = CacheIdentifier.builder()
            .ip(host)
            .port(port)
            .username(username)
            .password(password)
            .build();

        ClientSession clientSession = null;

        if (reuseConnection) {
            Optional<AbstractConnection<?>> cacheOption =
                CONNECTION_COMMON_CACHE.getCache(identifier, true);

            if (cacheOption.isPresent()) {
                SshConnect sshConnect = (SshConnect) cacheOption.get();
                clientSession = sshConnect.getConnection();
                try {
                    if (clientSession == null
                        || clientSession.isClosed()
                        || clientSession.isClosing()) {
                        clientSession = null;
                        CONNECTION_COMMON_CACHE.removeCache(identifier);
                    }
                } catch (Exception e) {
                    log.warn("Failed to validate cached ssh session", e);
                    clientSession = null;
                    CONNECTION_COMMON_CACHE.removeCache(identifier);
                }
            }

            if (clientSession != null) {
                return clientSession;
            }
        }

        SshClient sshClient = CommonSshClient.getSshClient();
        clientSession = sshClient.connect(username, host, Integer.parseInt(port))
            .verify(timeout, TimeUnit.MILLISECONDS)
            .getSession();

        if (StringUtils.hasText(password)) {
            clientSession.addPasswordIdentity(password);
        } else if (StringUtils.hasText(privateKey)) {
            String resourceKey = PrivateKeyUtils.writePrivateKey(host, privateKey);
            FilePasswordProvider passwordProvider =
                (session, resource, index) ->
                    StringUtils.hasText(privateKeyPassphrase)
                        ? privateKeyPassphrase
                        : null;

            Iterable<KeyPair> keyPairs =
                SecurityUtils.loadKeyPairIdentities(
                    null,
                    () -> resourceKey,
                    new FileInputStream(resourceKey),
                    passwordProvider);

            if (keyPairs != null) {
                keyPairs.forEach(clientSession::addPublicKeyIdentity);
            }
        }

        if (!clientSession.auth()
            .verify(timeout, TimeUnit.MILLISECONDS)
            .isSuccess()) {
            clientSession.close();
            throw new IllegalArgumentException("ssh auth failed.");
        }

        if (reuseConnection) {
            CONNECTION_COMMON_CACHE.addCache(identifier, new SshConnect(clientSession));
        }

        return clientSession;
    }

    public static ClientSession getConnectSession(
        SshProtocol sshProtocol,
        int timeout,
        boolean reuseConnection,
        boolean useProxy)
        throws IOException, GeneralSecurityException {

        CacheIdentifier identifier = CacheIdentifier.builder()
            .ip(sshProtocol.getHost())
            .port(sshProtocol.getPort())
            .username(sshProtocol.getUsername())
            .password(sshProtocol.getPassword())
            .build();

        ClientSession clientSession = null;

        if (reuseConnection && !useProxy) {
            Optional<AbstractConnection<?>> cacheOption =
                CONNECTION_COMMON_CACHE.getCache(identifier, true);

            if (cacheOption.isPresent()) {
                SshConnect sshConnect = (SshConnect) cacheOption.get();
                clientSession = sshConnect.getConnection();
                try {
                    if (clientSession == null
                        || clientSession.isClosed()
                        || clientSession.isClosing()) {
                        clientSession = null;
                        CONNECTION_COMMON_CACHE.removeCache(identifier);
                    }
                } catch (Exception e) {
                    log.warn("Failed to validate cached ssh session", e);
                    clientSession = null;
                    CONNECTION_COMMON_CACHE.removeCache(identifier);
                }
            }

            if (clientSession != null) {
                return clientSession;
            }
        }

        SshClient sshClient = CommonSshClient.getSshClient();
        HostConfigEntry proxyConfig = new HostConfigEntry();

        if (useProxy && StringUtils.hasText(sshProtocol.getProxyHost())) {
            String proxySpec = String.format(
                "%s@%s:%d",
                sshProtocol.getProxyUsername(),
                sshProtocol.getProxyHost(),
                Integer.parseInt(sshProtocol.getProxyPort()));

            proxyConfig.setHostName(sshProtocol.getHost());
            proxyConfig.setHost(sshProtocol.getHost());
            proxyConfig.setPort(Integer.parseInt(sshProtocol.getPort()));
            proxyConfig.setUsername(sshProtocol.getUsername());
            proxyConfig.setProxyJump(proxySpec);

            if (StringUtils.hasText(sshProtocol.getProxyPassword())) {
                sshClient.addPasswordIdentity(sshProtocol.getProxyPassword());
            }

            if (StringUtils.hasText(sshProtocol.getProxyPrivateKey())) {
                proxyConfig.setIdentities(
                    List.of(sshProtocol.getProxyPrivateKey()));
            }
        }

        try {
            if (useProxy && StringUtils.hasText(sshProtocol.getProxyHost())) {
                clientSession = sshClient.connect(proxyConfig)
                    .verify(timeout, TimeUnit.MILLISECONDS)
                    .getSession();
            } else {
                clientSession = sshClient.connect(
                        sshProtocol.getUsername(),
                        sshProtocol.getHost(),
                        Integer.parseInt(sshProtocol.getPort()))
                    .verify(timeout, TimeUnit.MILLISECONDS)
                    .getSession();
            }

            if (StringUtils.hasText(sshProtocol.getPassword())) {
                clientSession.addPasswordIdentity(sshProtocol.getPassword());
            } else if (StringUtils.hasText(sshProtocol.getPrivateKey())) {
                String resourceKey = PrivateKeyUtils.writePrivateKey(
                    sshProtocol.getHost(),
                    sshProtocol.getPrivateKey());

                try (InputStream keyStream = new FileInputStream(resourceKey)) {
                    FilePasswordProvider passwordProvider =
                        (session, resource, index) ->
                            StringUtils.hasText(
                                sshProtocol.getPrivateKeyPassphrase())
                                ? sshProtocol.getPrivateKeyPassphrase()
                                : null;

                    Iterable<KeyPair> keyPairs =
                        SecurityUtils.loadKeyPairIdentities(
                            null,
                            () -> resourceKey,
                            keyStream,
                            passwordProvider);

                    if (keyPairs != null) {
                        keyPairs.forEach(clientSession::addPublicKeyIdentity);
                    }
                }
            }

            if (!clientSession.auth()
                .verify(timeout, TimeUnit.MILLISECONDS)
                .isSuccess()) {
                throw new IllegalArgumentException("ssh auth failed.");
            }

            if (reuseConnection && !useProxy) {
                CONNECTION_COMMON_CACHE.addCache(
                    identifier, new SshConnect(clientSession));
            }

            return clientSession;

        } catch (Exception e) {
            if (clientSession != null && clientSession.isOpen()) {
                clientSession.close();
            }
            throw e;
        }
    }
}
