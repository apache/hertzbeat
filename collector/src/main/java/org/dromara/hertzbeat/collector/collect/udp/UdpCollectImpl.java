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

package org.dromara.hertzbeat.collector.collect.udp;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.UdpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;

import java.net.*;

/**
 * udp探测协议采集实现
 *
 * @author tom
 */
@Slf4j
public class UdpCollectImpl extends AbstractCollect {

    
    private static final String SNMP = "snmp";
    private static final String SNMP_HEX_CONTENT = "30250201010409636f6d6d756e697479a015020419e502ff020100020100300730050601290500";
    
    public UdpCollectImpl() {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 简单校验必有参数
        if (metrics == null || metrics.getUdp() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Udp collect must has udp params");
            return;
        }
        UdpProtocol udpProtocol = metrics.getUdp();
        // 超时时间默认6000毫秒
        int timeout = CollectUtil.getTimeout(udpProtocol.getTimeout());
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(timeout);
            String content = udpProtocol.getContent();
            if (SNMP.equalsIgnoreCase(udpProtocol.getProtocol())) {
                content = SNMP_HEX_CONTENT;
            }
            byte[] buffer = CollectUtil.fromHexString(content);
            SocketAddress socketAddress = new InetSocketAddress(udpProtocol.getHost(), Integer.parseInt(udpProtocol.getPort()));
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length, socketAddress);
            socket.send(packet);
            DatagramPacket response = new DatagramPacket(buffer, buffer.length);
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
