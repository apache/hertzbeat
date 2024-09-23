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

package org.apache.hertzbeat.collector.collect.udp;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.PortUnreachableException;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.UdpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * udp collect
 */
@Slf4j
public class UdpCollectImpl extends AbstractCollect {
    
    private static final byte[] HELLO = "hello".getBytes(StandardCharsets.UTF_8);

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getUdp() == null) {
            throw new IllegalArgumentException("Udp collect must has udp params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        UdpProtocol udpProtocol = metrics.getUdp();
        int timeout = CollectUtil.getTimeout(udpProtocol.getTimeout());
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(timeout);
            String content = udpProtocol.getContent();
            byte[] buffer = CollectUtil.fromHexString(content);
            buffer = buffer == null ? HELLO : buffer;
            SocketAddress socketAddress = new InetSocketAddress(udpProtocol.getHost(), Integer.parseInt(udpProtocol.getPort()));
            DatagramPacket request = new DatagramPacket(buffer, buffer.length, socketAddress);
            socket.send(request);
            byte[] responseBuffer = new byte[1];
            DatagramPacket response = new DatagramPacket(responseBuffer, responseBuffer.length);
            socket.receive(response);
            long responseTime = System.currentTimeMillis() - startTime;
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : metrics.getAliasFields()) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(Long.toString(responseTime));
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValues(valueRowBuilder.build());
        } catch (SocketTimeoutException timeoutException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(timeoutException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer connect failed: " + errorMsg);
        } catch (PortUnreachableException portUnreachableException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(portUnreachableException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("Peer port unreachable");
        } catch (Exception exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            log.warn(errorMsg, exception);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_UDP;
    }
}
