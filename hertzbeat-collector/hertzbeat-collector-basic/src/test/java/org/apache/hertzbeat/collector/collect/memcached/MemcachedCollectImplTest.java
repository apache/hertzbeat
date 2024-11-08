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

package org.apache.hertzbeat.collector.collect.memcached;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MemcachedProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link MemcachedCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class MemcachedCollectImplTest {
    @Mock
    MemcachedProtocol memcachedProtocol;

    @InjectMocks
    private MemcachedCollectImpl memcachedCollect;

    private Metrics metrics;

    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        memcachedProtocol = MemcachedProtocol.builder()
                .host("0.0.0.0")
                .port("11211")
                .build();
        metrics = new Metrics();
        metrics.setName("server_info");
        metrics.setMemcached(memcachedProtocol);
        metrics.setAliasFields(List.of("responseTime", "pid", "uptime", "item_size", "item_count", "curr_items"));
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void testPreCheck() {
        assertDoesNotThrow(() -> memcachedCollect.preCheck(metrics));
        assertThrows(IllegalArgumentException.class, () -> memcachedCollect.preCheck(null));
        metrics.setIcmp(null);
        assertThrows(IllegalArgumentException.class, () -> memcachedCollect.preCheck(null));
    }

    @Test
    void testCollectCmdResponse() {
        String httpResponse =
                """
                        STAT pid 1
                        STAT uptime 2
                        END
                        """;
        OutputStream outputStreamMock = Mockito.mock(OutputStream.class);
        byte[] responseBytes = httpResponse.getBytes(StandardCharsets.UTF_8);
        InputStream inputStream = new ByteArrayInputStream(responseBytes);
        MockedConstruction<Socket> mocked =
                Mockito.mockConstruction(Socket.class, (socket, context) -> {
                    Mockito.when(socket.isConnected()).thenReturn(true);
                    Mockito.when(socket.getOutputStream()).thenReturn(outputStreamMock);
                    Mockito.when(socket.getInputStream()).thenReturn(inputStream);
                });

        memcachedCollect.collect(builder, 1L, "test", metrics);
        assertEquals(1, builder.getValuesCount());
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertNotNull(valueRow.getColumns(0));
            assertEquals(valueRow.getColumns(1), "1");
            assertEquals(valueRow.getColumns(2), "2");
        }
        mocked.close();
    }

    @Test
    void testSupportProtocol() {
        assertEquals("memcached", memcachedCollect.supportProtocol());
    }
}
