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

import java.io.InputStream;
import java.security.KeyPair;
import java.util.List;
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

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * ssh helper
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

        if (reuseConnection) {
            Optional<AbstractConnection<?>> cache =
                    CONNECTION_COMMON_CACHE.getCache(identifier, true);
            if (cache.isPresent()) {
                ClientSession cached =
                        ((SshConnect) cache.get()).getConnection();
                if (cached != null && !cached.isClosed() && !cached.isClosing()) {
                    return cached;
                }
                CONNECTION_COMMON_CACHE.removeCache(identifier);
            }
        }

        SshClient sshClient = SshClient.setUpDefaultClient();
        sshClient.start();

        ClientSession session = sshClient
                .connect(username, host, Integer.parseInt(port))
                .verify(timeout, TimeUnit.MILLISECONDS)
                .getSession();

        applyAuth(session, password, privateKey, privateKeyPassphrase, host);

        if (!session.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            session.close();
            sshClient.stop();
            throw new IllegalArgumentException("ssh auth failed.");
        }

        if (reuseConnection) {
            CONNECTION_COMMON_CACHE.addCache(identifier, new SshConnect(session));
        }

        return session;
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

        // ❗ Do NOT reuse sessions when ProxyJump is enabled
        if (reuseConnection && !useProxy) {
            Optional<AbstractConnection<?>> cache =
                    CONNECTION_COMMON_CACHE.getCache(identifier, true);
            if (cache.isPresent()) {
                ClientSession cached =
                        ((SshConnect) cache.get()).getConnection();
                if (cached != null && !cached.isClosed() && !cached.isClosing()) {
                    return cached;
                }
                CONNECTION_COMMON_CACHE.removeCache(identifier);
            }
        }

        SshClient sshClient = SshClient.setUpDefaultClient();
        sshClient.start();

        ClientSession session;

        if (useProxy && StringUtils.hasText(sshProtocol.getProxyHost())) {

            HostConfigEntry proxyConfig = new HostConfigEntry();
            proxyConfig.setHost(sshProtocol.getHost());
            proxyConfig.setHostName(sshProtocol.getHost());
            proxyConfig.setPort(Integer.parseInt(sshProtocol.getPort()));
            proxyConfig.setUsername(sshProtocol.getUsername());

            String proxySpec = String.format(
                    "%s@%s:%s",
                    sshProtocol.getProxyUsername(),
                    sshProtocol.getProxyHost(),
                    sshProtocol.getProxyPort()
            );
            proxyConfig.setProxyJump(proxySpec);

            if (StringUtils.hasText(sshProtocol.getProxyPrivateKey())) {
                proxyConfig.setIdentities(
                        List.of(sshProtocol.getProxyPrivateKey()));
            }

            session = sshClient
                    .connect(proxyConfig)
                    .verify(timeout, TimeUnit.MILLISECONDS)
                    .getSession();

        } else {
            session = sshClient
                    .connect(
                            sshProtocol.getUsername(),
                            sshProtocol.getHost(),
                            Integer.parseInt(sshProtocol.getPort()))
                    .verify(timeout, TimeUnit.MILLISECONDS)
                    .getSession();
        }

        applyAuth(
                session,
                sshProtocol.getPassword(),
                sshProtocol.getPrivateKey(),
                sshProtocol.getPrivateKeyPassphrase(),
                sshProtocol.getHost()
        );

        if (!session.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            session.close();
            sshClient.stop();
            throw new IllegalArgumentException("ssh auth failed.");
        }

        if (reuseConnection && !useProxy) {
            CONNECTION_COMMON_CACHE.addCache(identifier, new SshConnect(session));
        }

        return session;
    }

    private static void applyAuth(
            ClientSession session,
            String password,
            String privateKey,
            String privateKeyPassphrase,
            String host)
            throws IOException, GeneralSecurityException {

        if (StringUtils.hasText(password)) {
            session.addPasswordIdentity(password);
            return;
        }

        if (StringUtils.hasText(privateKey)) {
            var keyFile = PrivateKeyUtils.writePrivateKey(host, privateKey);
            try (InputStream in = new FileInputStream(keyFile)) {
                FilePasswordProvider provider =
                        (s, r, i) -> StringUtils.hasText(privateKeyPassphrase)
                                ? privateKeyPassphrase
                                : null;

                Iterable<KeyPair> keys =
                        SecurityUtils.loadKeyPairIdentities(
                                null, () -> keyFile, in, provider);

                if (keys != null) {
                    keys.forEach(session::addPublicKeyIdentity);
                }
            }
        }
    }
}

