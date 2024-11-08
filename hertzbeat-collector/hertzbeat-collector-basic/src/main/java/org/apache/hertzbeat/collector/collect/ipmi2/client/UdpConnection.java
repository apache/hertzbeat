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

package org.apache.hertzbeat.collector.collect.ipmi2.client;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.DatagramChannel;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.Ipmi20Ipv4SessionWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp.RmcpPacket;

/**
 * Udp connection for ipmi
 */
public class UdpConnection {
    final String host;
    final int port;

    final SocketAddress address;

    DatagramChannel channel;

    ByteBuffer receiveBuffer = ByteBuffer.allocate(1024);


    public UdpConnection(String host, int port) throws IOException {
        this.host = host;
        this.port = port;
        this.address = new InetSocketAddress(host, port);
        channel = DatagramChannel.open();
    }

    private int send(IpmiPacketContext context, IpmiPayload payload) throws IOException {
        Ipmi20Ipv4SessionWrapper wrapper = new Ipmi20Ipv4SessionWrapper();
        wrapper.setIpmiPayload(payload);
        if (context.getIpmiSession().isConnected()) {
            wrapper.setIpmiSessionId(context.getIpmiSession().getSystemSessionId());
            wrapper.setIpmiSessionSequenceNumber(context.getIpmiSession().getAuthenticatedSequenceNumber().getAndIncrement());
        }
        RmcpPacket rmcpPacket = new RmcpPacket();
        rmcpPacket.withData(wrapper);
        ByteBuffer sendBuffer = IpmiEncoderDecoder.encode(context, rmcpPacket);
        return channel.send(sendBuffer, address);
    }

    private <T extends IpmiPayload> T receive(IpmiPacketContext context, Class<T> clazz) throws IOException {
        receiveBuffer.clear();
        channel.receive(receiveBuffer);
        receiveBuffer.flip();
        RmcpPacket rmcpPacket = IpmiEncoderDecoder.decode(context, receiveBuffer);
        return rmcpPacket.getEncapsulated(clazz);
    }

    public <T extends IpmiPayload> T get(IpmiPacketContext context, IpmiPayload payload, Class<T> clazz) throws IOException {
        send(context, payload);
        return receive(context, clazz);
    }

    public void close() throws IOException {
        channel.close();
    }

}
