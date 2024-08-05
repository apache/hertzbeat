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

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.epoll.Epoll;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.util.NetworkUtil;
import org.apache.hertzbeat.remoting.RemotingService;
import org.apache.hertzbeat.remoting.event.NettyEventListener;

/**
 * Derived from Apache Rocketmq org.apache.rocketmq.remoting.netty.NettyRemotingAbstract 
 * netty remote abstract
 * @see <a href="https://github.com/apache/rocketmq/blob/develop/remoting/src/main/java/org/apache/rocketmq/remoting/netty/NettyRemotingAbstract.java">NettyRemotingAbstract</a>
 */
@Slf4j
public abstract class NettyRemotingAbstract implements RemotingService {
    protected ConcurrentHashMap<ClusterMsg.MessageType, NettyRemotingProcessor> processorTable = new ConcurrentHashMap<>();

    protected ConcurrentHashMap<String, ResponseFuture> responseTable = new ConcurrentHashMap<>();

    protected List<NettyHook> nettyHookList = new ArrayList<>();

    protected NettyEventListener nettyEventListener;

    protected NettyRemotingAbstract(NettyEventListener nettyEventListener) {
        this.nettyEventListener = nettyEventListener;
    }

    public void registerProcessor(final ClusterMsg.MessageType messageType, final NettyRemotingProcessor processor) {
        this.processorTable.put(messageType, processor);
    }

    protected void processReceiveMsg(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        if (ClusterMsg.Direction.REQUEST.equals(message.getDirection())) {
            this.processRequestMsg(ctx, message);
        } else {
            this.processResponseMsg(message);
        }
    }

    protected void processRequestMsg(ChannelHandlerContext ctx, ClusterMsg.Message request) {
        this.doBeforeRequest(ctx, request);

        NettyRemotingProcessor processor = this.processorTable.get(request.getType());
        if (processor == null) {
            log.info("request type {} not supported", request.getType());
            return;
        }
        ClusterMsg.Message response = processor.handle(ctx, request);
        if (response != null) {
            ctx.writeAndFlush(response);
        }
    }

    private void doBeforeRequest(ChannelHandlerContext ctx, ClusterMsg.Message request) {
        if (CollectionUtils.isEmpty(this.nettyHookList)) {
            return;
        }
        for (NettyHook nettyHook : this.nettyHookList) {
            nettyHook.doBeforeRequest(ctx, request);
        }
    }

    protected void processResponseMsg(ClusterMsg.Message response) {
        if (this.responseTable.containsKey(response.getIdentity())) {
            ResponseFuture responseFuture = this.responseTable.get(response.getIdentity());
            responseFuture.putResponse(response);
        } else {
            log.warn("receive response not in responseTable, identity: {}", response.getIdentity());
        }
    }

    protected void sendMsgImpl(final Channel channel, final ClusterMsg.Message request) {
        channel.writeAndFlush(request).addListener(future -> {
            if (!future.isSuccess()) {
                log.warn("send request message failed. address: {}, ", channel.remoteAddress(), future.cause());
            }
        });
    }

    protected ClusterMsg.Message sendMsgSyncImpl(final Channel channel, final ClusterMsg.Message request, final int timeoutMillis) {
        final String identity = request.getIdentity();

        try {
            ResponseFuture responseFuture = new ResponseFuture();
            this.responseTable.put(identity, responseFuture);
            channel.writeAndFlush(request).addListener(future -> {
                if (!future.isSuccess()) {
                    responseTable.remove(identity);
                    log.warn("send request message failed. request: {}, address: {}, ", request, channel.remoteAddress(), future.cause());
                }
            });
            ClusterMsg.Message response = responseFuture.waitResponse(timeoutMillis);
            if (response == null) {
                log.warn("get response message failed, message is null");
            }
            return response;
        } catch (InterruptedException e) {
            log.warn("get response message failed, ", e);
        } finally {
            responseTable.remove(identity);
        }
        return null;
    }

    protected void channelActive(ChannelHandlerContext ctx) throws Exception {
        if (this.nettyEventListener != null && ctx.channel().isActive()) {
            this.nettyEventListener.onChannelActive(ctx.channel());
        }
    }

    protected void channelIdle(ChannelHandlerContext ctx, Object evt) throws Exception {
        IdleStateEvent event = (IdleStateEvent) evt;
        if (this.nettyEventListener != null && event.state() == IdleState.ALL_IDLE) {
            ctx.channel().closeFuture();
            this.nettyEventListener.onChannelIdle(ctx.channel());
        }
    }

    protected boolean useEpoll() {
        return NetworkUtil.isLinuxPlatform()
                && Epoll.isAvailable();
    }

}
