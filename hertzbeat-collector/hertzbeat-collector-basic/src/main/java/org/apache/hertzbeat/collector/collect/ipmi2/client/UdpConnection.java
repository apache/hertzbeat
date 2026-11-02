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
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.nio.channels.DatagramChannel;
import java.nio.channels.ClosedSelectorException;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.util.concurrent.TimeUnit;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.Ipmi20Ipv4SessionWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp.RmcpPacket;

/**
 * Udp connection for ipmi
 */
public class UdpConnection implements AutoCloseable {
    /**
     * IPMI is carried over UDP, which gives no delivery guarantee. Without a bounded receive the
     * collection thread would block forever when a response is lost or the BMC stops answering,
     * leaving the monitor stuck in a timeout state until the process restarts.
     */
    public static final int DEFAULT_RECEIVE_TIMEOUT_MILLIS = 5_000;

    final String host;
    final int port;

    final SocketAddress address;

    final int receiveTimeoutMillis;

    DatagramChannel channel;

    private final Selector selector;

    ByteBuffer receiveBuffer = ByteBuffer.allocate(1024);


    public UdpConnection(String host, int port) throws IOException {
        this(host, port, DEFAULT_RECEIVE_TIMEOUT_MILLIS);
    }

    public UdpConnection(String host, int port, int receiveTimeoutMillis) throws IOException {
        if (receiveTimeoutMillis <= 0) {
            throw new IllegalArgumentException("receiveTimeoutMillis must be positive");
        }
        this.host = host;
        this.port = port;
        this.address = new InetSocketAddress(host, port);
        this.receiveTimeoutMillis = receiveTimeoutMillis;
        channel = DatagramChannel.open();
        channel.configureBlocking(false);
        selector = Selector.open();
        channel.register(selector, SelectionKey.OP_READ);
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
        receiveDatagram();
        receiveBuffer.flip();
        RmcpPacket rmcpPacket = IpmiEncoderDecoder.decode(context, receiveBuffer);
        return rmcpPacket.getEncapsulated(clazz);
    }

    /**
     * Waits for one datagram, failing once the configured timeout elapses.
     *
     * @return the number of bytes read into {@link #receiveBuffer}
     * @throws SocketTimeoutException when no datagram arrives before the timeout
     */
    int receiveDatagram() throws IOException {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(receiveTimeoutMillis);
        receiveBuffer.clear();
        while (true) {
            SocketAddress sender = channel.receive(receiveBuffer);
            if (sender != null) {
                return receiveBuffer.position();
            }
            long remainingNanos = deadline - System.nanoTime();
            if (remainingNanos <= 0) {
                throw new SocketTimeoutException("No IPMI UDP response within " + receiveTimeoutMillis
                        + "ms from " + address);
            }
            long remainingMillis = Math.max(1L, TimeUnit.NANOSECONDS.toMillis(remainingNanos));
            try {
                selector.select(remainingMillis);
                selector.selectedKeys().clear();
            } catch (ClosedSelectorException closed) {
                // The cache may evict and close this connection while a collection is waiting.
                throw new IOException("IPMI UDP connection was closed while waiting for a response", closed);
            }
        }
    }

    public synchronized <T extends IpmiPayload> T get(IpmiPacketContext context, IpmiPayload payload, Class<T> clazz) throws IOException {
        send(context, payload);
        return receive(context, clazz);
    }

    @Override
    public void close() throws IOException {
        try {
            selector.close();
        } finally {
            channel.close();
        }
    }

}
