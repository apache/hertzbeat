package org.dromara.hertzbeat.collector.collect.common.cache;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.session.ClientSession;

/**
 * ssh connection holder
 * @author tom
 */
@Slf4j
public class SshConnect implements CacheCloseable {
    private final ClientSession clientSession;

    public SshConnect(ClientSession clientSession) {
        this.clientSession = clientSession;
    }

    @Override
    public void close() {
        try {
            if (clientSession != null) {
                clientSession.close();
            }
        } catch (Exception e) {
            log.error("[connection common cache] close ssh connect error: {}", e.getMessage());
        }
    }

    public ClientSession getConnection() {
        return clientSession;
    }
}
