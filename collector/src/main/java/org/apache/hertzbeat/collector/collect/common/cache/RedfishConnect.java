package org.apache.hertzbeat.collector.collect.common.cache;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.redfish.ConnectSession;

/**
 * redfish connect session
 */
@Slf4j
public class RedfishConnect implements CacheCloseable{
    private final ConnectSession reddishConnectSession;

    public RedfishConnect(ConnectSession reddishConnectSession) {
        this.reddishConnectSession = reddishConnectSession;
    }

    @Override
    public void close() {
        try {
            if (reddishConnectSession != null) {
                reddishConnectSession.close();
            }
        } catch (Exception e) {
            log.error("[connection common cache] close redfish connect error: {}", e.getMessage());
        }
    }

    public ConnectSession getConnection() {
        return reddishConnectSession;
    }
}
