package org.dromara.hertzbeat.remoting.netty;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.codec.compression.ZlibCodecFactory;
import io.netty.handler.codec.compression.ZlibWrapper;
import io.netty.handler.codec.protobuf.ProtobufDecoder;
import io.netty.handler.codec.protobuf.ProtobufEncoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32FrameDecoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32LengthFieldPrepender;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.remoting.RemotingClient;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;

/**
 * netty client
 */
@Slf4j
public class NettyRemotingClient extends NettyRemotingAbstract implements RemotingClient {

    private final NettyClientConfig nettyClientConfig;

    private final Bootstrap bootstrap = new Bootstrap();

    private EventLoopGroup workerGroup;

    private Channel channel;

    protected NettyRemotingClient(final NettyClientConfig nettyClientConfig, final NettyEventListener nettyEventListener) {
        super(nettyEventListener);
        this.nettyClientConfig = nettyClientConfig;
    }

    @Override
    public void start() {
        this.workerGroup = new NioEventLoopGroup();

        this.bootstrap.group(workerGroup)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, this.nettyClientConfig.getConnectTimeoutMillis())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel channel) throws Exception {
                        NettyRemotingClient.this.initChannel(channel);
                    }
                });

        this.channel = null;
        boolean first = true;
        while (first || this.channel == null || !this.channel.isActive()) {
            first = false;
            try {
                this.channel = this.bootstrap
                        .connect(this.nettyClientConfig.getServerIp(), this.nettyClientConfig.getServerPort())
                        .sync().channel();
                this.channel.closeFuture().sync();
            } catch (InterruptedException ignored) {
                log.error("collector shutdown now!");
            } catch (Exception e2) {
                log.error("collector connect cluster server error: {}. try after 10s.", e2.getMessage());
                try {
                    Thread.sleep(10000);
                } catch (InterruptedException ignored) {
                }
            }
        }
        workerGroup.shutdownGracefully();
    }

    private void initChannel(final SocketChannel channel) {
        ChannelPipeline pipeline = channel.pipeline();
        // zip
        pipeline.addLast(ZlibCodecFactory.newZlibEncoder(ZlibWrapper.GZIP));
        pipeline.addLast(ZlibCodecFactory.newZlibDecoder(ZlibWrapper.GZIP));
        // protocol buf encode decode
        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(ClusterMsg.Message.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        pipeline.addLast(new NettyClientHandler());

    }

    @Override
    public void shutdown() {
        try {
            this.channel.close();

            this.workerGroup.shutdownGracefully();

            this.nettyEventExecutor.shutdown();

        } catch (Exception e) {
            log.error("netty client shutdown exception, ", e);
        }
    }

    @Override
    public void sendMsg(final ClusterMsg.Message request) {
        this.channel.writeAndFlush(request).addListener(future -> {
            if (!future.isSuccess()) {
                log.warn("failed to send request message to server. address: {}, ", channel.remoteAddress(), future.cause());
            }
        });;
    }

    @Override
    public ClusterMsg.Message sendMsg(ClusterMsg.Message request, int timeoutMillis) {
        return this.sendMsgSync(this.channel, request, timeoutMillis);
    }

    class NettyClientHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {

        @Override
        protected void channelRead0(ChannelHandlerContext ctx, ClusterMsg.Message msg) throws Exception {
            NettyRemotingClient.this.processReceiveMsg(ctx, msg);
        }
    }
}
