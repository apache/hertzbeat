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

import org.apache.hertzbeat.collector.collect.common.MetricsDataBuilder;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
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
        builder = CollectRep.MetricsData.newBuilder().setId(1L).setApp("test");
    }

    @Test
    void testPreCheck() {
        assertDoesNotThrow(() -> memcachedCollect.preCheck(metrics));
        assertThrows(IllegalArgumentException.class, () -> memcachedCollect.preCheck(null));
        metrics.setIcmp(null);
        assertThrows(IllegalArgumentException.class, () -> memcachedCollect.preCheck(null));
    }

    @Test
    void testCollectCmdResponse() throws Exception {
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

        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            memcachedCollect.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                assertEquals(1, arrowVectorReader.getRowCount());

                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertNotNull(rowWrapper.nextCell().getValue());
                    assertEquals("1", rowWrapper.nextCell().getValue());
                    assertEquals("2", rowWrapper.nextCell().getValue());
                }
            }
        }
        mocked.close();
    }

    @Test
    void testSupportProtocol() {
        assertEquals("memcached", memcachedCollect.supportProtocol());
    }
}
