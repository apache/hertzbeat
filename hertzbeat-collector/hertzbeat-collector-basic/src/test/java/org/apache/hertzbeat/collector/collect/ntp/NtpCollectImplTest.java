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

package org.apache.hertzbeat.collector.collect.ntp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.net.ntp.NTPUDPClient;
import org.apache.commons.net.ntp.NtpV3Impl;
import org.apache.commons.net.ntp.NtpV3Packet;
import org.apache.commons.net.ntp.TimeInfo;
import org.apache.commons.net.ntp.TimeStamp;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.writer.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NtpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link NtpCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class NtpCollectImplTest {

    @InjectMocks
    private NtpCollectImpl ntpCollect;

    @Test
    void testCollect() throws Exception {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder().setId(1L).setApp("test");
        NtpProtocol telnetProtocol = NtpProtocol.builder()
                .host("192.168.77.100")
                .port("1234")
                .timeout("10")
                .build();

        NtpV3Packet packet = new NtpV3Impl();
        int version = 1;
        packet.setVersion(version);
        packet.setOriginateTimeStamp(new TimeStamp(3000));
        packet.setReceiveTimeStamp(new TimeStamp(2000));
        packet.setTransmitTime(new TimeStamp(1000));
        TimeInfo timeInfo = new TimeInfo(packet, 1000, false);

        MockedConstruction<NTPUDPClient> mocked =
                Mockito.mockConstruction(NTPUDPClient.class, (client, context) -> {
                    Mockito.doNothing().when(client).open();
                    Mockito.when(client.getTime(InetAddress.getByName(telnetProtocol.getHost()))).thenReturn(timeInfo);

                });

        List<String> aliasField = new ArrayList<>();
        aliasField.add("responseTime");
        aliasField.add("version");
        Metrics metrics = new Metrics();
        metrics.setNtp(telnetProtocol);
        metrics.setAliasFields(aliasField);
        ntpCollect.preCheck(metrics);

        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            ntpCollect.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                assertEquals(1, arrowVectorReader.getRowCount());

                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertNotNull(rowWrapper.nextCell().getValue());
                    assertEquals(String.valueOf(version), rowWrapper.nextCell().getValue());
                }
            }
        }

        mocked.close();
    }

}
