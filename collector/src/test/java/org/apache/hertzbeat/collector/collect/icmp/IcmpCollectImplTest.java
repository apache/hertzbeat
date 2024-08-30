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

package org.apache.hertzbeat.collector.collect.icmp;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.IcmpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link IcmpCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class IcmpCollectImplTest {

    @Mock
    IcmpProtocol icmpProtocol;

    @Mock
    Metrics metrics;

    @Mock
    InetAddress inetAddress;

    @Mock
    CollectRep.MetricsData.Builder builder;

    @InjectMocks
    private IcmpCollectImpl icmpCollect;

    @BeforeEach
    void setUp() {
        icmpProtocol = IcmpProtocol.builder()
                .host("127.0.0.1")
                .timeout("3000")
                .build();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        metrics = new Metrics();
        metrics.setName("test");
        metrics.setIcmp(icmpProtocol);
        metrics.setAliasFields(aliasField);
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void testPreCheck() {
        assertDoesNotThrow(() -> icmpCollect.preCheck(metrics));
        assertThrows(IllegalArgumentException.class, () -> icmpCollect.preCheck(null));
        metrics.setIcmp(null);
        assertThrows(IllegalArgumentException.class, () -> icmpCollect.preCheck(null));
    }

    @Test
    void testCollect() throws Exception {
        try (MockedStatic<InetAddress> mockedInetAddress = Mockito.mockStatic(InetAddress.class)) {
            mockedInetAddress.when(() -> InetAddress.getByName(Mockito.anyString())).thenReturn(inetAddress);
            Mockito.when(inetAddress.isReachable(Mockito.anyInt())).thenReturn(true);
            assertDoesNotThrow(() -> icmpCollect.collect(builder, 1L, "app", metrics));
            assertEquals(1, builder.getValuesCount());
            assertNotNull(builder.getValues(0).getColumns(0));

        }
    }

    @Test
    void testUnreachable() throws Exception {
        try (MockedStatic<InetAddress> mockedInetAddress = Mockito.mockStatic(InetAddress.class)) {
            mockedInetAddress.when(() -> InetAddress.getByName(Mockito.anyString())).thenReturn(inetAddress);
            Mockito.when(inetAddress.isReachable(Mockito.anyInt())).thenReturn(false);
            assertDoesNotThrow(() -> icmpCollect.collect(builder, 1L, "app", metrics));
            assertEquals(CollectRep.Code.UN_REACHABLE, builder.getCode());
            assertNotNull(builder.getMsg());
        }
    }

    @Test
    void testUnknownHostException() {
        try (MockedStatic<InetAddress> mockedInetAddress = Mockito.mockStatic(InetAddress.class)) {
            mockedInetAddress.when(() -> InetAddress.getByName(Mockito.anyString())).thenThrow(new UnknownHostException("Mocked exception"));
            assertDoesNotThrow(() -> icmpCollect.collect(builder, 1L, "app", metrics));
            assertEquals(CollectRep.Code.UN_REACHABLE, builder.getCode());
            assertNotNull(builder.getMsg());
        }
    }

    @Test
    void testIoException() throws Exception {
        try (MockedStatic<InetAddress> mockedInetAddress = Mockito.mockStatic(InetAddress.class)) {
            mockedInetAddress.when(() -> InetAddress.getByName(Mockito.anyString())).thenReturn(inetAddress);
            Mockito.when(inetAddress.isReachable(Mockito.anyInt())).thenThrow(new IOException("Mocked exception"));
            assertDoesNotThrow(() -> icmpCollect.collect(builder, 1L, "app", metrics));
            assertEquals(CollectRep.Code.UN_REACHABLE, builder.getCode());
            assertNotNull(builder.getMsg());
        }
    }

    @Test
    void testException() throws Exception {
        try (MockedStatic<InetAddress> mockedInetAddress = Mockito.mockStatic(InetAddress.class)) {
            mockedInetAddress.when(() -> InetAddress.getByName(Mockito.anyString())).thenReturn(inetAddress);
            Mockito.when(inetAddress.isReachable(Mockito.anyInt())).thenThrow(new RuntimeException("Mocked exception"));
            assertDoesNotThrow(() -> icmpCollect.collect(builder, 1L, "app", metrics));
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
            assertNotNull(builder.getMsg());
        }
    }

    @Test
    void testSupportProtocol() {
        assertEquals("icmp", icmpCollect.supportProtocol());
    }
}
