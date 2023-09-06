package org.dromara.hertzbeat.remoting.netty;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.epoll.Epoll;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;
import org.dromara.hertzbeat.common.util.NetworkUtil;
import org.dromara.hertzbeat.remoting.RemotingService;
import org.dromara.hertzbeat.remoting.event.NettyEventListener;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * netty remote abstract
 * 参考: org.apache.rocketmq.remoting.netty.NettyRemotingAbstract
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
        if (this.nettyHookList == null || this.nettyHookList.isEmpty()) {
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
                log.warn("failed to send request message to server. address: {}, ", channel.remoteAddress(), future.cause());
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
                    log.warn("failed to send request message to server. address: {}, ", channel.remoteAddress(), future.cause());
                }
            });
            ClusterMsg.Message response = responseFuture.waitResponse(timeoutMillis);
            if (response == null) {
                log.warn("get response message from server is null");
            }
            return response;
        } catch (InterruptedException e) {
            log.warn("failed to get response message from server, ", e);
        } finally {
            responseTable.remove(identity);
        }
        return null;
    }

    protected void channelActive(ChannelHandlerContext ctx) {
        if (this.nettyEventListener != null && ctx.channel().isActive()) {
            this.nettyEventListener.onChannelActive(ctx.channel());
        }
    }

    protected void channelIdle(ChannelHandlerContext ctx, Object evt) {
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
