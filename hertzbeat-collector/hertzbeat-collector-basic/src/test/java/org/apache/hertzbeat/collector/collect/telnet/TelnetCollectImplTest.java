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

package org.apache.hertzbeat.collector.collect.telnet;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.net.telnet.TelnetClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.TelnetProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link TelnetCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class TelnetCollectImplTest {

    @InjectMocks
    private TelnetCollectImpl telnetCollect;

    @Test
    void testCollectWithEquals() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        TelnetProtocol telnetProtocol = TelnetProtocol.builder()
                .timeout("10")
                .port("21")
                .cmd("ls")
                .build();

        String httpResponse = """
                a=SomeValue
                b=AnotherValue
                c=YetAnotherValue""";
        byte[] responseBytes = httpResponse.getBytes(StandardCharsets.UTF_8);
        InputStream inputStream = new ByteArrayInputStream(responseBytes);

        MockedConstruction<TelnetClient> mocked =
                Mockito.mockConstruction(TelnetClient.class, (telnetClient, context) -> {
                    Mockito.doNothing().when(telnetClient).connect(telnetProtocol.getHost(),
                            Integer.parseInt(telnetProtocol.getPort()));
                    Mockito.doNothing().when(telnetClient).disconnect();
                    Mockito.when(telnetClient.isConnected()).thenReturn(true);

                    OutputStream out = Mockito.mock(OutputStream.class);
                    Mockito.when(telnetClient.getOutputStream()).thenReturn(out);
                    Mockito.doNothing().when(out).write(Mockito.any());
                    Mockito.doNothing().when(out).flush();

                    Mockito.when(telnetClient.getInputStream()).thenReturn(inputStream);

                });


        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        aliasField.add("a");
        aliasField.add("b");
        aliasField.add("c");
        Metrics metrics = new Metrics();
        metrics.setTelnet(telnetProtocol);
        metrics.setAliasFields(aliasField);
        telnetCollect.preCheck(metrics);
        telnetCollect.collect(builder, metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertNotNull(valueRow.getColumns(0));
            assertEquals(valueRow.getColumns(1), "SomeValue");
            assertEquals(valueRow.getColumns(2), "AnotherValue");
            assertEquals(valueRow.getColumns(3), "YetAnotherValue");
        }
        mocked.close();
    }

    @Test
    void testCollectWithTab() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        TelnetProtocol telnetProtocol = TelnetProtocol.builder()
                .timeout("10")
                .port("21")
                .cmd("ls")
                .build();

        String httpResponse = """
                a\tSomeValue
                b\tAnotherValue
                c\tYetAnotherValue""";
        byte[] responseBytes = httpResponse.getBytes(StandardCharsets.UTF_8);
        InputStream inputStream = new ByteArrayInputStream(responseBytes);

        MockedConstruction<TelnetClient> mocked =
                Mockito.mockConstruction(TelnetClient.class, (telnetClient, context) -> {
                    Mockito.doNothing().when(telnetClient).connect(telnetProtocol.getHost(),
                            Integer.parseInt(telnetProtocol.getPort()));
                    Mockito.doNothing().when(telnetClient).disconnect();
                    Mockito.when(telnetClient.isConnected()).thenReturn(true);

                    OutputStream out = Mockito.mock(OutputStream.class);
                    Mockito.when(telnetClient.getOutputStream()).thenReturn(out);
                    Mockito.doNothing().when(out).write(Mockito.any());
                    Mockito.doNothing().when(out).flush();

                    Mockito.when(telnetClient.getInputStream()).thenReturn(inputStream);

                });


        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        aliasField.add("a");
        aliasField.add("b");
        aliasField.add("c");
        Metrics metrics = new Metrics();
        metrics.setTelnet(telnetProtocol);
        metrics.setAliasFields(aliasField);
        telnetCollect.preCheck(metrics);
        telnetCollect.collect(builder, metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertNotNull(valueRow.getColumns(0));
            assertEquals(valueRow.getColumns(1), "SomeValue");
            assertEquals(valueRow.getColumns(2), "AnotherValue");
            assertEquals(valueRow.getColumns(3), "YetAnotherValue");
        }
        mocked.close();
    }

    @Test
    void preCheck() throws IllegalArgumentException {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> telnetCollect.preCheck(null));

        // protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            telnetCollect.preCheck(metrics);
        });

        // everyting is ok
        assertDoesNotThrow(() -> {
            Metrics metrics = new Metrics();
            metrics.setTelnet(TelnetProtocol.builder().build());
            telnetCollect.preCheck(metrics);
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_TELNET, telnetCollect.supportProtocol());
    }
}
