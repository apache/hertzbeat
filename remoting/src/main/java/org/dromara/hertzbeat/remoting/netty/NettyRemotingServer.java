package org.dromara.hertzbeat.remoting.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.epoll.EpollEventLoopGroup;
import io.netty.channel.epoll.EpollServerSocketChannel;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.compression.ZlibCodecFactory;
import io.netty.handler.codec.compression.ZlibWrapper;
import io.netty.handler.codec.protobuf.ProtobufDecoder;
import io.netty.handler.codec.protobuf.ProtobufEncoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32FrameDecoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32LengthFieldPrepender;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.handler.timeout.IdleStateHandler;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.support.CommonThreadPool;
import org.dromara.hertzbeat.remoting.RemotingServer;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;

/**
 * netty server
 */
@Slf4j
public class NettyRemotingServer extends NettyRemotingAbstract implements RemotingServer {

    private final NettyServerConfig nettyServerConfig;

    private final CommonThreadPool threadPool;

    private EventLoopGroup bossGroup;

    private EventLoopGroup workerGroup;

    public NettyRemotingServer(final NettyServerConfig nettyServerConfig,
                               final NettyEventListener nettyEventListener,
                               final CommonThreadPool threadPool) {
        super(nettyEventListener);
        this.nettyServerConfig = nettyServerConfig;
        this.threadPool = threadPool;
    }

    @Override
    public void start() {

        this.threadPool.execute(() -> {
            int port = this.nettyServerConfig.getPort();

            if (this.useEpoll()) {
                bossGroup = new EpollEventLoopGroup(1);
                workerGroup = new EpollEventLoopGroup();
            } else {
                bossGroup = new NioEventLoopGroup(1);
                workerGroup = new NioEventLoopGroup();
            }

            try {
                ServerBootstrap b = new ServerBootstrap();
                b.group(bossGroup, workerGroup)
                        .channel(this.useEpoll() ? EpollServerSocketChannel.class : NioServerSocketChannel.class)
                        .handler(new LoggingHandler(LogLevel.INFO))
                        .childOption(ChannelOption.TCP_NODELAY, true)
                        .childOption(ChannelOption.SO_KEEPALIVE, false)
                        .childHandler(new ChannelInitializer<SocketChannel>() {
                            @Override
                            protected void initChannel(SocketChannel channel) throws Exception {
                                NettyRemotingServer.this.initChannel(channel);
                            }
                        });
                b.bind(port).sync().channel().closeFuture().sync();
            } catch (InterruptedException ignored) {
                log.info("server shutdown now!");
            } catch (Exception e) {
                log.error("Netty Server start exception, {}", e.getMessage());
                throw new RuntimeException(e);
            } finally {
                bossGroup.shutdownGracefully();
                workerGroup.shutdownGracefully();
            }
        });
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
        // idle state
        pipeline.addLast(new IdleStateHandler(0, 0, 30));
        pipeline.addLast(new NettyServerHandler());
    }

    @Override
    public void shutdown() {
        try {
            this.bossGroup.shutdownGracefully();

            this.workerGroup.shutdownGracefully();

            this.threadPool.destroy();

        } catch (Exception e) {
            log.error("Netty Server shutdown exception, ", e);
        }
    }

    @ChannelHandler.Sharable
    public class NettyServerHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {

        @Override
        protected void channelRead0(ChannelHandlerContext ctx, ClusterMsg.Message msg) throws Exception {
            NettyRemotingServer.this.processReceiveMsg(ctx, msg);
        }

        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
            IdleStateEvent event = (IdleStateEvent) evt;
            if (event.state() == IdleState.ALL_IDLE) {
                ctx.channel().closeFuture();
                NettyRemotingServer.this.nettyEventListener.onChannelIdle(ctx.channel());
            }
        }
    }
}
