package org.apache.hertzbeat.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.common.cache.SshConnect;
import org.apache.hertzbeat.collector.util.PrivateKeyUtils;
import org.apache.sshd.client.SshClient;
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

    private static final GlobalConnectionCache CONNECTION_COMMON_CACHE = GlobalConnectionCache.getInstance();

    public static ClientSession getConnectSession(String host, String port, String username, String password, String privateKey,
                                                  String privateKeyPassphrase, int timeout, boolean reuseConnection)
            throws IOException, GeneralSecurityException {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(host).port(port)
                .username(username).password(password)
                .build();
        ClientSession clientSession = null;
        if (reuseConnection) {
            Optional<AbstractConnection<?>> cacheOption = CONNECTION_COMMON_CACHE.getCache(identifier, true);
            if (cacheOption.isPresent()) {
                SshConnect sshConnect = (SshConnect) cacheOption.get();
                clientSession = sshConnect.getConnection();
                try {
                    if (clientSession == null || clientSession.isClosed() || clientSession.isClosing()) {
                        clientSession = null;
                        CONNECTION_COMMON_CACHE.removeCache(identifier);
                    }
                } catch (Exception e) {
                    log.warn(e.getMessage());
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
                .verify(timeout, TimeUnit.MILLISECONDS).getSession();
        if (StringUtils.hasText(password)) {
            clientSession.addPasswordIdentity(password);
        } else if (StringUtils.hasText(privateKey)) {
            var resourceKey = PrivateKeyUtils.writePrivateKey(host, privateKey);
            FilePasswordProvider passwordProvider = (session, resource, index) -> {
                if (StringUtils.hasText(privateKeyPassphrase)) {
                    return privateKeyPassphrase;
                }
                return null;
            };
            SecurityUtils.loadKeyPairIdentities(null, () -> resourceKey, new FileInputStream(resourceKey), passwordProvider)
                    .forEach(clientSession::addPublicKeyIdentity);
        }  // else auth with localhost private public key certificates

        // auth
        if (!clientSession.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            clientSession.close();
            throw new IllegalArgumentException("ssh auth failed.");
        }
        if (reuseConnection) {
            SshConnect sshConnect = new SshConnect(clientSession);
            CONNECTION_COMMON_CACHE.addCache(identifier, sshConnect);
        }
        return clientSession;
    }

}
