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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.PortUnreachableException;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.UdpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link UdpCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class UdpCollectImplTest {

    @InjectMocks
    private UdpCollectImpl udpCollect;

    @Test
    void testPreCheck() {
        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setAliasFields(aliasField);
        assertThrows(IllegalArgumentException.class, () -> udpCollect.preCheck(metrics));

        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            udpCollect.preCheck(null);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            UdpProtocol udpProtocol = UdpProtocol.builder().timeout("10").port("21").host("127.0.0.1").build();
            udpCollect.preCheck(Metrics.builder().udp(udpProtocol).build());
        });
    }

    @Test
    void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        UdpProtocol udpProtocol = UdpProtocol.builder()
                .timeout("10")
                .port("21")
                .host("127.0.0.1")
                .build();

        MockedConstruction<DatagramSocket> socketMockedConstruction =
                Mockito.mockConstruction(DatagramSocket.class, (socket, context) -> {
                    Mockito.doNothing().when(socket).send(Mockito.any(DatagramPacket.class));
                    Mockito.doNothing().when(socket).receive(Mockito.any(DatagramPacket.class));
                });


        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setUdp(udpProtocol);
        metrics.setAliasFields(aliasField);
        udpCollect.preCheck(metrics);
        udpCollect.collect(builder, 1L, "test", metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertNotNull(valueRow.getColumns(0));
        }

        socketMockedConstruction.close();
    }

    @Test
    void testCollectWithSocketException() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        UdpProtocol udpProtocol = UdpProtocol.builder()
                .timeout("10")
                .port("21")
                .host("127.0.0.1")
                .build();

        MockedConstruction<DatagramSocket> socketMockedConstruction =
                Mockito.mockConstruction(DatagramSocket.class, (socket, context) -> Mockito.doThrow(new SocketTimeoutException("test exception"))
                        .when(socket).send(Mockito.any(DatagramPacket.class)));


        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setUdp(udpProtocol);
        metrics.setAliasFields(aliasField);
        udpCollect.preCheck(metrics);
        udpCollect.collect(builder, 1L, "test", metrics);
        assertEquals(builder.getCode(), CollectRep.Code.UN_CONNECTABLE);

        socketMockedConstruction.close();
    }

    @Test
    void testCollectWithPortUnreachableException() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        UdpProtocol udpProtocol = UdpProtocol.builder()
                .timeout("10")
                .port("21")
                .host("127.0.0.1")
                .build();

        MockedConstruction<DatagramSocket> socketMockedConstruction =
                Mockito.mockConstruction(DatagramSocket.class, (socket, context) -> Mockito.doThrow(new PortUnreachableException("test exception"))
                        .when(socket).send(Mockito.any(DatagramPacket.class)));


        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setUdp(udpProtocol);
        metrics.setAliasFields(aliasField);
        udpCollect.preCheck(metrics);
        udpCollect.collect(builder, 1L, "test", metrics);
        assertEquals(builder.getCode(), CollectRep.Code.UN_REACHABLE);

        socketMockedConstruction.close();
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_UDP, udpCollect.supportProtocol());
    }
}
