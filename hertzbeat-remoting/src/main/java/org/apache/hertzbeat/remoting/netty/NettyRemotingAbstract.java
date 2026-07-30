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

import com.google.protobuf.ByteString;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.epoll.Epoll;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.util.Attribute;
import io.netty.util.AttributeKey;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
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

    private static final AttributeKey<ByteString> AUTH_CHANNEL_NONCE =
            AttributeKey.valueOf(NettyRemotingAbstract.class, "authChannelNonce");
    private static final AttributeKey<Boolean> APPLICATION_ACTIVE_NOTIFIED =
            AttributeKey.valueOf(NettyRemotingAbstract.class, "applicationActiveNotified");

    protected ConcurrentHashMap<ClusterMsg.MessageType, NettyRemotingProcessor> processorTable =
            new ConcurrentHashMap<>();

    protected ConcurrentHashMap<String, ResponseFuture> responseTable = new ConcurrentHashMap<>();

    protected List<NettyHook> nettyHookList = new ArrayList<>();

    protected NettyEventListener nettyEventListener;

    private final EndpointRole endpointRole;
    private final ClusterMessageAuthenticator messageAuthenticator;

    protected NettyRemotingAbstract(NettyEventListener nettyEventListener) {
        this(nettyEventListener, EndpointRole.DISABLED, null, null);
    }

    protected NettyRemotingAbstract(
            NettyEventListener nettyEventListener,
            EndpointRole endpointRole,
            ClusterMessageAuthConfig authConfig,
            Supplier<String> fallbackSecretSupplier) {
        this.nettyEventListener = nettyEventListener;
        this.endpointRole = endpointRole;
        this.messageAuthenticator = endpointRole == EndpointRole.DISABLED
                ? null
                : new ClusterMessageAuthenticator(
                        Objects.requireNonNull(
                                authConfig,
                                "Cluster message authentication settings must be configured"),
                        fallbackSecretSupplier);
    }

    protected final void initializeAuthentication() {
        if (messageAuthenticator != null) {
            messageAuthenticator.validateConfiguration();
        }
    }

    public void registerProcessor(
            final ClusterMsg.MessageType messageType,
            final NettyRemotingProcessor processor) {
        this.processorTable.put(messageType, processor);
    }

    protected void processReceiveMsg(ChannelHandlerContext ctx, ClusterMsg.Message message) {
        if (message.getType() == ClusterMsg.MessageType.AUTH_CHALLENGE) {
            processAuthenticationChallenge(ctx, message);
            return;
        }
        if (messageAuthenticator != null) {
            ClusterMessageAuthenticator.VerificationResult result =
                    messageAuthenticator.verify(message, channelNonce(ctx.channel()));
            ClusterMessageAuthMetrics.recordVerification(result, endpointRole);
            if (!result.accepted()) {
                log.warn(
                        "Reject cluster message authentication from {}, reason: {}",
                        ctx.channel().remoteAddress(),
                        result);
                ctx.close();
                return;
            }
        }
        if (ClusterMsg.Direction.REQUEST.equals(message.getDirection())) {
            this.processRequestMsg(ctx, message);
        } else {
            this.processResponseMsg(ctx, message);
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
            ctx.writeAndFlush(prepareOutbound(ctx.channel(), response));
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

    protected void processResponseMsg(ChannelHandlerContext ctx, ClusterMsg.Message response) {
        if (this.responseTable.containsKey(response.getIdentity())) {
            ResponseFuture responseFuture = this.responseTable.get(response.getIdentity());
            responseFuture.putResponse(response);
        } else {
            NettyRemotingProcessor processor = this.processorTable.get(response.getType());
            if (processor != null) {
                ClusterMsg.Message repMessage = processor.handle(ctx, response);
                if (repMessage != null) {
                    ctx.writeAndFlush(prepareOutbound(ctx.channel(), repMessage));
                }
            }
        }
    }

    protected void sendMsgImpl(final Channel channel, final ClusterMsg.Message request) {
        channel.writeAndFlush(prepareOutbound(channel, request)).addListener(future -> {
            if (!future.isSuccess()) {
                log.warn(
                        "send request message failed. address: {}, ",
                        channel.remoteAddress(),
                        future.cause());
            }
        });
    }

    protected ClusterMsg.Message sendMsgSyncImpl(
            final Channel channel,
            final ClusterMsg.Message request,
            final int timeoutMillis) {
        final String identity = request.getIdentity();

        try {
            ResponseFuture responseFuture = new ResponseFuture();
            this.responseTable.put(identity, responseFuture);
            channel.writeAndFlush(prepareOutbound(channel, request)).addListener(future -> {
                if (!future.isSuccess()) {
                    responseTable.remove(identity);
                    log.warn(
                            "send request message failed. request: {}, address: {}, ",
                            request,
                            channel.remoteAddress(),
                            future.cause());
                }
            });
            ClusterMsg.Message response = responseFuture.waitResponse(timeoutMillis);
            if (response == null) {
                log.warn("get response message failed, message is null");
            }
            return response;
        } catch (InterruptedException e) {
            log.warn("get response message failed, ", e);
            Thread.currentThread().interrupt();
        } finally {
            responseTable.remove(identity);
        }
        return null;
    }

    private ClusterMsg.Message prepareOutbound(Channel channel, ClusterMsg.Message message) {
        return messageAuthenticator == null
                ? message
                : messageAuthenticator.sign(message, channelNonce(channel));
    }

    protected void channelActive(ChannelHandlerContext ctx) {
        if (messageAuthenticator == null || endpointRole == EndpointRole.DISABLED) {
            notifyApplicationChannelActive(ctx.channel());
            return;
        }
        if (endpointRole == EndpointRole.SERVER) {
            ByteString channelNonce = messageAuthenticator.newChannelNonce();
            setChannelNonce(ctx.channel(), channelNonce);
            ClusterMsg.Message challenge = ClusterMsg.Message.newBuilder()
                    .setDirection(ClusterMsg.Direction.REQUEST)
                    .setType(ClusterMsg.MessageType.AUTH_CHALLENGE)
                    .setAuthVersion(ClusterMessageAuthenticator.AUTH_VERSION)
                    .setMsg(channelNonce)
                    .build();
            ctx.writeAndFlush(challenge);
            notifyApplicationChannelActive(ctx.channel());
            return;
        }
        scheduleClientHandshakeTimeout(ctx);
    }

    private void processAuthenticationChallenge(
            ChannelHandlerContext ctx,
            ClusterMsg.Message challenge) {
        if (messageAuthenticator == null || endpointRole == EndpointRole.DISABLED) {
            log.debug("Ignore authentication capability challenge in legacy compatibility mode");
            return;
        }
        if (endpointRole != EndpointRole.CLIENT
                || challenge.getDirection() != ClusterMsg.Direction.REQUEST
                || challenge.getAuthVersion() != ClusterMessageAuthenticator.AUTH_VERSION
                || challenge.getMsg().size() != ClusterMessageAuthenticator.CHANNEL_NONCE_BYTES
                || challenge.getAuthTimestamp() != 0
                || !challenge.getAuthNonce().isEmpty()
                || !challenge.getAuthSignature().isEmpty()
                || !challenge.getAuthKeyId().isEmpty()
                || !challenge.getAuthChannelNonce().isEmpty()) {
            ClusterMessageAuthMetrics.recordVerification(
                    ClusterMessageAuthenticator.VerificationResult.MALFORMED,
                    endpointRole);
            log.warn("Reject malformed cluster authentication challenge from {}",
                    ctx.channel().remoteAddress());
            ctx.close();
            return;
        }
        setChannelNonce(ctx.channel(), challenge.getMsg());
        notifyApplicationChannelActive(ctx.channel());
    }

    private void scheduleClientHandshakeTimeout(ChannelHandlerContext ctx) {
        long timeoutMillis = messageAuthenticator == null
                ? 0
                : messageAuthenticator.handshakeTimeoutMillis();
        ctx.executor().schedule(() -> {
            if (applicationActiveWasNotified(ctx.channel())) {
                return;
            }
            ClusterMessageAuthMetrics.recordHandshakeTimeout(
                    endpointRole,
                    messageAuthenticator.mode());
            if (messageAuthenticator.mode() == ClusterMessageAuthConfig.Mode.OPTIONAL) {
                log.warn(
                        "Cluster peer did not advertise authentication; continuing in optional compatibility mode");
                notifyApplicationChannelActive(ctx.channel());
            } else {
                log.warn("Cluster peer did not advertise required authentication; closing channel");
                ctx.close();
            }
        }, timeoutMillis, TimeUnit.MILLISECONDS);
    }

    private void notifyApplicationChannelActive(Channel channel) {
        Attribute<Boolean> notified = channel.attr(APPLICATION_ACTIVE_NOTIFIED);
        if (notified != null && !notified.compareAndSet(null, Boolean.TRUE)) {
            return;
        }
        if (this.nettyEventListener != null && channel.isActive()) {
            try {
                this.nettyEventListener.onChannelActive(channel);
            } catch (Exception e) {
                log.error("Cluster channel activation callback failed", e);
                channel.close();
            }
        }
    }

    private boolean applicationActiveWasNotified(Channel channel) {
        Attribute<Boolean> attribute = channel.attr(APPLICATION_ACTIVE_NOTIFIED);
        return attribute != null && Boolean.TRUE.equals(attribute.get());
    }

    private ByteString channelNonce(Channel channel) {
        Attribute<ByteString> attribute = channel.attr(AUTH_CHANNEL_NONCE);
        return attribute == null || attribute.get() == null
                ? ByteString.EMPTY
                : attribute.get();
    }

    private void setChannelNonce(Channel channel, ByteString channelNonce) {
        Attribute<ByteString> attribute = channel.attr(AUTH_CHANNEL_NONCE);
        if (attribute != null) {
            attribute.set(channelNonce);
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
        return NetworkUtil.isLinuxPlatform() && Epoll.isAvailable();
    }

    enum EndpointRole {
        DISABLED("disabled"),
        CLIENT("client"),
        SERVER("server");

        private final String metricTag;

        EndpointRole(String metricTag) {
            this.metricTag = metricTag;
        }

        String metricTag() {
            return metricTag;
        }
    }
}
