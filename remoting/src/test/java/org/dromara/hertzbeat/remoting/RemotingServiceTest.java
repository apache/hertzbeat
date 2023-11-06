package org.dromara.hertzbeat.remoting;

import org.assertj.core.util.Lists;
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

    public RemotingServer createRemotingServer(int port) {
        NettyServerConfig nettyServerConfig = new NettyServerConfig();
        nettyServerConfig.setPort(port);
        // todo test NettyEventListener
        RemotingServer server = new NettyRemotingServer(nettyServerConfig, null, threadPool);
        server.start();
        return server;
    }

    public RemotingClient createRemotingClient(int port) {
        NettyClientConfig nettyClientConfig = new NettyClientConfig();
        nettyClientConfig.setServerHost("localhost");
        nettyClientConfig.setServerPort(port);
        RemotingClient client = new NettyRemotingClient(nettyClientConfig, null, threadPool);
        client.start();
        return client;
    }

    @BeforeEach
    public void setUp() throws InterruptedException {
        int port = 10000 + (int) (Math.random() * 10000);

        remotingServer = createRemotingServer(port);
        // await remotingServer start
        int count = 5;
        while (count-- > 0) {
            Thread.sleep(1000);
            if (remotingServer.isStart()) {
                break;
            }
        }

        if (count < 0) {
            throw new RuntimeException("remoting server start error");
        }

        remotingClient = createRemotingClient(port);
        // await remotingClient start
        count = 5;
        while (count-- > 0) {
            Thread.sleep(1000);
            if (remotingClient.isStart()) {
                break;
            }
        }

        if (count < 0) {
            throw new RuntimeException("remoting client start error");
        }
    }

    @AfterEach
    public void shutdown() {
        this.remotingClient.shutdown();
        this.remotingServer.shutdown();
    }

    @Test
    public void testSendMsg() {
        final String msg = "hello world";

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
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

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) -> {
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

    @Test
    public void testNettyHook() {
        this.remotingServer.registerHook(Lists.newArrayList(
                (ctx, message) -> {
                    Assertions.assertEquals("hello world", message.getMsg());
                }
        ));

        this.remotingServer.registerProcessor(ClusterMsg.MessageType.HEARTBEAT, (ctx, message) ->
                ClusterMsg.Message.newBuilder()
                        .setDirection(ClusterMsg.Direction.RESPONSE)
                        .build());

        ClusterMsg.Message request = ClusterMsg.Message.newBuilder()
                .setDirection(ClusterMsg.Direction.REQUEST)
                .setType(ClusterMsg.MessageType.HEARTBEAT)
                .setMsg("hello world")
                .build();
        this.remotingClient.sendMsg(request);
    }

}
