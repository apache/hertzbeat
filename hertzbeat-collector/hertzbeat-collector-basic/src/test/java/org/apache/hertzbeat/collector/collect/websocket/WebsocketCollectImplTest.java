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

package org.apache.hertzbeat.collector.collect.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.WebsocketProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link WebsocketCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class WebsocketCollectImplTest {

    @InjectMocks
    private WebsocketCollectImpl websocketCollectImpl;

    @Test
    void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        WebsocketProtocol websocketProtocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .path("/")
                .port("80")
                .build();

        String httpResponse = """
                HTTP/1.1 200 OK\r
                Content-Type: text/html; charset=UTF-8\r
                Content-Length: 1234\r
                Date: Sat, 4 May 2024 12:00:00 GMT\r
                Connection: close\r
                \r
                """;
        byte[] responseBytes = httpResponse.getBytes(StandardCharsets.UTF_8);
        InputStream inputStream = new ByteArrayInputStream(responseBytes);

        MockedConstruction<Socket> socketMockedConstruction =
                Mockito.mockConstruction(Socket.class, (socket, context) -> {
                    OutputStream out = Mockito.mock(OutputStream.class);
                    Mockito.doNothing().when(socket).connect(Mockito.any(SocketAddress.class));
                    Mockito.when(socket.isConnected()).thenReturn(true);
                    Mockito.when(socket.getOutputStream()).thenReturn(out);
                    Mockito.doNothing().when(out).write(Mockito.any());
                    Mockito.doNothing().when(out).flush();
                    Mockito.when(socket.getInputStream()).thenReturn(inputStream);

                });


        List<String> aliasField = new ArrayList<>();
        aliasField.add("httpVersion");
        aliasField.add("responseTime");
        aliasField.add("responseCode");
        Metrics metrics = new Metrics();
        metrics.setWebsocket(websocketProtocol);
        metrics.setAliasFields(aliasField);
        websocketCollectImpl.preCheck(metrics);
        websocketCollectImpl.collect(builder, metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertEquals(valueRow.getColumns(0), "HTTP/1.1");
            assertNotNull(valueRow.getColumns(1));
            assertEquals(valueRow.getColumns(2), "200");
        }

        socketMockedConstruction.close();
    }

}
