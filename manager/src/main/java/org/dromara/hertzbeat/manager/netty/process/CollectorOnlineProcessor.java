package org.dromara.hertzbeat.manager.netty.process;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.netty.ManageServer;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * handle collector online message
 */
@Slf4j
public class CollectorOnlineProcessor implements NettyRemotingProcessor {

    private final ManageServer manageServer;

    public CollectorOnlineProcessor(final ManageServer manageServer) {
        this.manageServer = manageServer;
    }

    @Override
    public ClusterMsg.Message handle(ClusterMsg.Message message) {
        String collector = message.getIdentity();
        log.info("the collector {} actively requests to go online.", collector);
        CollectorInfo collectorInfo = JsonUtil.fromJson(message.getMsg(), CollectorInfo.class);
        this.manageServer.getCollectorScheduling().collectorGoOnline(collector, collectorInfo);
        return null;
    }
}
