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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link UdpConnection} receive timeout handling.
 */
class UdpConnectionTest {

    @Test
    void receiveDatagramTimesOutWhenPeerNeverResponds() throws IOException {
        // Bind an unresponsive port: nothing is listening, so the reply never arrives.
        int silentPort;
        try (DatagramSocket socket = new DatagramSocket(0, InetAddress.getLoopbackAddress())) {
            silentPort = socket.getLocalPort();
        }
        try (UdpConnection connection = new UdpConnection("127.0.0.1", silentPort, 150)) {
            long start = System.nanoTime();
            assertThrows(SocketTimeoutException.class, connection::receiveDatagram);
            long elapsedMillis = (System.nanoTime() - start) / 1_000_000L;
            assertTrue(elapsedMillis >= 100,
                    "receive must wait for the bounded timeout instead of returning immediately, took " + elapsedMillis + "ms");
            assertTrue(elapsedMillis < 5_000,
                    "receive must not block indefinitely, took " + elapsedMillis + "ms");
        }
    }

    @Test
    void receiveDatagramReturnsPayloadWhenPeerResponds() throws IOException, InterruptedException {
        try (DatagramSocket peer = new DatagramSocket(0, InetAddress.getLoopbackAddress())) {
            peer.setSoTimeout(5_000);
            byte[] payload = "ipmi-response".getBytes(StandardCharsets.UTF_8);
            Thread responder = new Thread(() -> {
                try {
                    DatagramPacket request = new DatagramPacket(new byte[64], 64);
                    peer.receive(request);
                    peer.send(new DatagramPacket(payload, payload.length, request.getSocketAddress()));
                } catch (IOException ignored) {
                    // The assertion below reports the failure.
                }
            }, "ipmi-test-responder");
            responder.setDaemon(true);
            responder.start();

            try (UdpConnection connection = new UdpConnection("127.0.0.1", peer.getLocalPort(), 5_000)) {
                connection.channel.send(java.nio.ByteBuffer.wrap(new byte[] {1}), connection.address);
                assertEquals(payload.length, connection.receiveDatagram());
                connection.receiveBuffer.flip();
                byte[] received = new byte[payload.length];
                connection.receiveBuffer.get(received);
                assertEquals(new String(payload, StandardCharsets.UTF_8), new String(received, StandardCharsets.UTF_8));
            }
            responder.join(5_000);
        }
    }

    @Test
    void closeIsIdempotentAndReleasesResources() throws IOException {
        UdpConnection connection = new UdpConnection("127.0.0.1", 623, 100);
        assertDoesNotThrow(connection::close);
        assertDoesNotThrow(connection::close);
    }

    @Test
    void rejectsNonPositiveReceiveTimeout() {
        assertThrows(IllegalArgumentException.class, () -> new UdpConnection("127.0.0.1", 623, 0));
    }
}
