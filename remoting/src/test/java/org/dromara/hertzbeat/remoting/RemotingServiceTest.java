package org.dromara.hertzbeat.remoting;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.remoting.netty.NettyClientConfig;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingClient;
import org.dromara.hertzbeat.remoting.netty.NettyRemotingServer;
import org.dromara.hertzbeat.remoting.netty.NettyServerConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test NettyRemotingClient and NettyRemotingServer
 */
public class RemotingServiceTest {

    private final CommonThreadPool threadPool = new CommonThreadPool();

    private RemotingServer remotingServer;

    private RemotingClient remotingClient;

    public RemotingServer createRemotingServer() {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(1157);
        // todo test NettyEventListener
        RemotingServer server = new NettyRemotingServer(nettyServerConfig, null, threadPool);
        server.start();
        return server;
    }

    public RemotingClient createRemotingClient() {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        nettyClientConfig.setServerIp("localhost");
        nettyClientConfig.setServerPort(1157);
        RemotingClient client = new NettyRemotingClient(nettyClientConfig, null, threadPool);
        client.start();
        return client;
    }

    @BeforeEach
    public void setUp() throws InterruptedException {
        this.remotingServer = createRemotingServer();
        this.remotingClient = createRemotingClient();
        // todo waiting server and client start, 替换为更优雅的方式
        Thread.sleep(3000);
    }

    @AfterEach
    public void shutdown() {
        this.remotingClient.shutdown();
        this.remotingServer.shutdown();
    }

    @Test
    public void testSendMsg() {
        final String msg = "hello world";

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, message -> {
            Assertions.assertEquals(msg, message.getMsg());
            return null;
        });

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(msg)
                .build();
        this.remotingClient.sendMsg(request);
    }

    @Test
    public void testSendMsgSync() {
        final String requestMsg = "request";
        final String responseMsg = "response";

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, message -> {
            Assertions.assertEquals(requestMsg, message.getMsg());
            return ClusterMsg.Message.newBuilder()
                    .setDirection(ClusterMsg.Direction.RESPONSE)
                    .setMsg(responseMsg)
                    .build();
        });

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg(requestMsg)
                .build();
        ClusterMsg.Message response = this.remotingClient.sendMsgSync(request, 3000);
        Assertions.assertEquals(responseMsg, response.getMsg());
    }

}
