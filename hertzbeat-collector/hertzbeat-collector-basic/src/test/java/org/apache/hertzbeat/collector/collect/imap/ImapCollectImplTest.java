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

package org.apache.hertzbeat.collector.collect.imap;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.List;
import org.apache.commons.net.imap.IMAPClient;
import org.apache.commons.net.imap.IMAPSClient;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.writer.ArrowVectorWriterImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ImapProtocol;
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
 * Test case for {@link ImapCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class ImapCollectImplTest {
    private Metrics metrics;
    private CollectRep.MetricsData.Builder builder;
    @Mock
    private ImapProtocol imapProtocol;
    @InjectMocks
    private ImapCollectImpl imapCollect;

    @BeforeEach
    void setUp() {
        imapProtocol = ImapProtocol.builder()
                .host("0.0.0.0")
                .port("993")
                .ssl("true")
                .email("test@test.email.com")
                .authorize("test")
                .folderName("testFolder")
                .timeout("6000")
                .build();
        metrics = new Metrics();
        metrics.setName("testMailboxInfo");
        metrics.setImap(imapProtocol);
        metrics.setAliasFields(List.of("responseTime", "testFolderTotalMessageCount", "testFolderRecentMessageCount", "testFolderUnseenMessageCount"));
        builder = CollectRep.MetricsData.newBuilder().setId(1L).setApp("testIMAP");
    }

    @Test
    void preCheck() {
        assertDoesNotThrow(() -> imapCollect.preCheck(metrics));
        assertThrows(NullPointerException.class, () -> imapCollect.preCheck(null));
        metrics.setImap(null);
        assertThrows(NullPointerException.class, () -> imapCollect.preCheck(null));
    }

    @Test
    void enableSslCollect() throws Exception {
        String response = "* STATUS \"testFolder\" (MESSAGES 3 RECENT 2 UNSEEN 1)";
        MockedConstruction<IMAPSClient> mocked = Mockito.mockConstruction(IMAPSClient.class,
                (imapsClient, context) -> {
                    Mockito.doNothing().when(imapsClient).connect(Mockito.anyString(), Mockito.anyInt());
                    Mockito.doAnswer(invocationOnMock -> true).when(imapsClient).login(Mockito.anyString(), Mockito.anyString());
                    Mockito.doAnswer(invocationOnMock -> true).when(imapsClient).isConnected();
                    Mockito.when(imapsClient.sendCommand(Mockito.anyString())).thenReturn(0);
                    Mockito.when(imapsClient.getReplyString()).thenReturn(response);
                    Mockito.doAnswer(invocationOnMock -> true).when(imapsClient).logout();
                    Mockito.doNothing().when(imapsClient).disconnect();
                });

        imapCollect.preCheck(metrics);
        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            imapCollect.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                assertEquals(1, arrowVectorReader.getRowCount());

                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertNotNull(rowWrapper.nextCell().getValue());
                    assertEquals("3", rowWrapper.nextCell().getValue());
                    assertEquals("2", rowWrapper.nextCell().getValue());
                    assertEquals("1", rowWrapper.nextCell().getValue());
                }
            }
        }

        mocked.close();
    }

    @Test
    void disableSslCollect() throws Exception {
        metrics.getImap().setSsl("false");
        String response = "* STATUS \"testFolder\" (MESSAGES 3 RECENT 2 UNSEEN 1)";
        MockedConstruction<IMAPClient> mocked = Mockito.mockConstruction(IMAPClient.class,
                (imapClient, context) -> {
                    Mockito.doNothing().when(imapClient).connect(Mockito.anyString(), Mockito.anyInt());
                    Mockito.doAnswer(invocationOnMock -> true).when(imapClient).login(Mockito.anyString(), Mockito.anyString());
                    Mockito.doAnswer(invocationOnMock -> true).when(imapClient).isConnected();
                    Mockito.when(imapClient.sendCommand(Mockito.anyString())).thenReturn(0);
                    Mockito.when(imapClient.getReplyString()).thenReturn(response);
                    Mockito.doAnswer(invocationOnMock -> true).when(imapClient).logout();
                    Mockito.doNothing().when(imapClient).disconnect();
                });

        imapCollect.preCheck(metrics);
        try (final ArrowVectorWriterImpl arrowVectorWriter = new ArrowVectorWriterImpl(metrics.getAliasFields())) {
            final MetricsDataBuilder metricsDataBuilder = new MetricsDataBuilder(builder, arrowVectorWriter);
            imapCollect.collect(metricsDataBuilder, metrics);

            final CollectRep.MetricsData metricsData = metricsDataBuilder.build();
            try (ArrowVectorReader arrowVectorReader = new ArrowVectorReaderImpl(metricsData.getData().toByteArray())) {
                assertEquals(1, arrowVectorReader.getRowCount());

                RowWrapper rowWrapper = arrowVectorReader.readRow();
                while (rowWrapper.hasNextRow()) {
                    rowWrapper = rowWrapper.nextRow();

                    assertNotNull(rowWrapper.nextCell().getValue());
                    assertEquals("3", rowWrapper.nextCell().getValue());
                    assertEquals("2", rowWrapper.nextCell().getValue());
                    assertEquals("1", rowWrapper.nextCell().getValue());
                }
            }
        }

        mocked.close();
    }

    @Test
    void supportProtocol() {
        assertEquals("imap", imapCollect.supportProtocol());
    }
}
