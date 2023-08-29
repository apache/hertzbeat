package org.dromara.hertzbeat.manager.netty;

import io.netty.channel.Channel;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;

import java.util.Map;

/**
 * manage netty event listener
 */
@Slf4j
public class ManageNettyEventListener implements NettyEventListener {

    private final ManageServer manageServer;

    public ManageNettyEventListener(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public void onChannelIdle(Channel channel) {
        for (Map.Entry<String, Channel> entry : manageServer.getCollectorAndJobScheduler().getCollectorChannelMap().entrySet()) {
            if (entry.getValue().equals(channel)) {
                String collector = entry.getKey();
                if (collector != null) {
                    log.info("handle idle event triggered. the collector {} is going offline.", collector);
                    this.manageServer.getCollectorAndJobScheduler().collectorGoOffline(collector);
                }
                break;
            }
        }
    }
}
