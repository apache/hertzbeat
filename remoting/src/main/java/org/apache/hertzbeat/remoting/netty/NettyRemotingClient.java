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
import java.util.concurrent.ThreadFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.support.CommonThreadPool;
import org.apache.hertzbeat.remoting.RemotingClient;
import org.apache.hertzbeat.remoting.event.NettyEventListener;

/**
 * Derived from Apache Rocketmq org.apache.rocketmq.remoting.netty.NettyRemotingClient 
 * netty client
 * @see <a href="https://github.com/apache/rocketmq/blob/develop/remoting/src/main/java/org/apache/rocketmq/remoting/netty/NettyRemotingClient.java">NettyRemotingClient</a>
 */
@Slf4j
public class NettyRemotingClient extends NettyRemotingAbstract implements RemotingClient {

    private static final int DEFAULT_WORKER_THREAD_NUM = Math.min(4, Runtime.getRuntime().availableProcessors());
    
    private final NettyClientConfig nettyClientConfig;

    private final CommonThreadPool threadPool;

    private final Bootstrap bootstrap = new Bootstrap();

    private EventLoopGroup workerGroup;

    private Channel channel;

    public NettyRemotingClient(final NettyClientConfig nettyClientConfig,
                               final NettyEventListener nettyEventListener,
                               final CommonThreadPool threadPool) {
        super(nettyEventListener);
        this.nettyClientConfig = nettyClientConfig;
        this.threadPool = threadPool;
    }

    @Override
    public void start() {
        this.threadPool.execute(() -> {
            ThreadFactory threadFactory = new ThreadFactoryBuilder()
                    .setUncaughtExceptionHandler((thread, throwable) -> {
                        log.error("NettyClientWorker has uncaughtException.");
                        log.error(throwable.getMessage(), throwable);
                    })
                    .setDaemon(true)
                    .setNameFormat("netty-client-worker-%d")
                    .build();
            String envThreadNum = System.getProperty("hertzbeat.client.worker.thread.num"); 
            int workerThreadNum = envThreadNum != null ? Integer.parseInt(envThreadNum) : DEFAULT_WORKER_THREAD_NUM;
            this.workerGroup = new NioEventLoopGroup(workerThreadNum, threadFactory);
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
            while (!Thread.currentThread().isInterrupted() 
                    && (first || this.channel == null || !this.channel.isActive())) {
                first = false;
                try {
                    this.channel = this.bootstrap
                            .connect(this.nettyClientConfig.getServerHost(), this.nettyClientConfig.getServerPort())
                            .sync().channel();
                    this.channel.closeFuture().sync();
                } catch (InterruptedException ignored) {
                    log.info("client shutdown now!");
                    Thread.currentThread().interrupt();
                } catch (Exception e2) {
                    log.error("client connect to server error: {}. try after 10s.", e2.getMessage());
                    try {
                        Thread.sleep(10000);
                    } catch (InterruptedException ignored) {
                    }
                }
            }
            workerGroup.shutdownGracefully();
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
        pipeline.addLast(new NettyClientHandler());

    }

    @Override
    public void shutdown() {
        try {
            if (this.channel != null) {
                this.channel.close();
            }

            this.workerGroup.shutdownGracefully();

            this.threadPool.destroy();

        } catch (Exception e) {
            log.error("netty client shutdown exception, ", e);
        }
    }

    @Override
    public boolean isStart() {
        return this.channel != null && this.channel.isActive();
    }

    @Override
    public void sendMsg(final ClusterMsg.Message request) {
        this.sendMsgImpl(this.channel, request);
    }

    @Override
    public ClusterMsg.Message sendMsgSync(ClusterMsg.Message request, int timeoutMillis) {
        return this.sendMsgSyncImpl(this.channel, request, timeoutMillis);
    }

    class NettyClientHandler extends SimpleChannelInboundHandler<ClusterMsg.Message> {

        @Override
        public void channelActive(ChannelHandlerContext ctx) throws Exception {
            NettyRemotingClient.this.channelActive(ctx);
        }

        @Override
        protected void channelRead0(ChannelHandlerContext ctx, ClusterMsg.Message msg) throws Exception {
            NettyRemotingClient.this.processReceiveMsg(ctx, msg);
        }

        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
            NettyRemotingClient.this.channelIdle(ctx, evt);
        }
    }
}
