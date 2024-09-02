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

package org.apache.hertzbeat.remoting.netty;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.Channel;
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
import io.netty.handler.timeout.IdleStateHandler;
import java.util.List;
import java.util.concurrent.ThreadFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.remoting.RemotingServer;
import org.apache.hertzbeat.remoting.event.NettyEventListener;

/**
 * Derived from Apache Rocketmq org.apache.rocketmq.remoting.netty.NettyRemotingServer 
 * netty server
 * @see <a href="https://github.com/apache/rocketmq/blob/develop/remoting/src/main/java/org/apache/rocketmq/remoting/netty/NettyRemotingServer.java">NettyRemotingServer</a>
 */
@Slf4j
public class NettyRemotingServer extends NettyRemotingAbstract implements RemotingServer {

    private final NettyServerConfig nettyServerConfig;

    private final CommonThreadPool threadPool;

    private EventLoopGroup bossGroup;

    private EventLoopGroup workerGroup;

    private Channel channel = null;

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
            ThreadFactory bossThreadFactory = new ThreadFactoryBuilder()
                    .setUncaughtExceptionHandler((thread, throwable) -> {
                        log.error("NettyServerBoss has uncaughtException.");
                        log.error(throwable.getMessage(), throwable);
                    })
                    .setDaemon(true)
                    .setNameFormat("netty-server-boss-%d")
                    .build();
            ThreadFactory workerThreadFactory = new ThreadFactoryBuilder()
                    .setUncaughtExceptionHandler((thread, throwable) -> {
                        log.error("NettyServerWorker has uncaughtException.");
                        log.error(throwable.getMessage(), throwable);
                    })
                    .setDaemon(true)
                    .setNameFormat("netty-server-worker-%d")
                    .build();
            if (this.useEpoll()) {
                bossGroup = new EpollEventLoopGroup(bossThreadFactory);
                workerGroup = new EpollEventLoopGroup(workerThreadFactory);
            } else {
                bossGroup = new NioEventLoopGroup(bossThreadFactory);
                workerGroup = new NioEventLoopGroup(workerThreadFactory);
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
                channel = b.bind(port).sync().channel();
                channel.closeFuture().sync();
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

    @Override
    public boolean isStart() {
        return this.channel != null && this.channel.isActive();
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
        pipeline.addLast(new IdleStateHandler(0, 0, nettyServerConfig.getIdleStateEventTriggerTime()));
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

    @Override
    public void sendMsg(final Channel channel, final ClusterMsg.Message request) {
        this.sendMsgImpl(channel, request);
    }

    @Override
    public ClusterMsg.Message sendMsgSync(final Channel channel, final ClusterMsg.Message request, final int timeoutMillis) {
        return this.sendMsgSyncImpl(channel, request, timeoutMillis);
    }

    @Override
    public void registerHook(List<NettyHook> nettyHookList) {
        this.nettyHookList.addAll(nettyHookList);
    }

    /**
     * netty server handler
     */
    @ChannelHandler.Sharable
    public class NettyServerHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {

        @Override
        public void channelActive(ChannelHandlerContext ctx) throws Exception {
            NettyRemotingServer.this.channelActive(ctx);
        }

        @Override
        protected void channelRead0(ChannelHandlerContext ctx, ClusterMsg.Message msg) throws Exception {
            NettyRemotingServer.this.processReceiveMsg(ctx, msg);
        }

        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
            NettyRemotingServer.this.channelIdle(ctx, evt);
        }
    }
}
