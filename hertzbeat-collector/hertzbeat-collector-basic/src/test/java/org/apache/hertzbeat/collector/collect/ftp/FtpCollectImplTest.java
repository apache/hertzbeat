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

package org.apache.hertzbeat.collector.collect.ftp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.FtpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link FtpCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class FtpCollectImplTest {

    @InjectMocks
    private FtpCollectImpl ftpCollectImpl;

    @Test
    void testPreCheck() {
        FtpProtocol ftpProtocol = FtpProtocol.builder()
                .host("127.0.0.1")
                .username("admin")
                .password("123456")
                .port("21")
                .direction("/")
                .build();

        List<String> aliasField = new ArrayList<>();
        aliasField.add("isActive");
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setName("server");
        metrics.setFtp(ftpProtocol);
        metrics.setAliasFields(aliasField);
        assertThrows(IllegalArgumentException.class, () -> ftpCollectImpl.preCheck(metrics));

    }

    @Test
    void testCollect() throws IOException {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        FtpProtocol ftpProtocol = FtpProtocol.builder()
                .host("127.0.0.1")
                .username("admin")
                .password("123456")
                .port("21")
                .timeout("3000")
                .direction("/")
                .build();

        boolean isActive = false;
        MockedConstruction<FTPClient> mocked = Mockito.mockConstruction(FTPClient.class,
                (ftpClient, context) -> {
                    Mockito.doNothing().when(ftpClient).connect(ftpProtocol.getHost(),
                            Integer.parseInt(ftpProtocol.getPort()));

                    Mockito.doAnswer(invocationOnMock -> true).when(ftpClient)
                            .login(ftpProtocol.getUsername(), ftpProtocol.getPassword());
                    Mockito.when(ftpClient.changeWorkingDirectory(ftpProtocol.getDirection())).thenReturn(isActive);
                    Mockito.doNothing().when(ftpClient).disconnect();
                });


        List<String> aliasField = new ArrayList<>();
        aliasField.add("isActive");
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setFtp(ftpProtocol);
        metrics.setAliasFields(aliasField);
        ftpCollectImpl.preCheck(metrics);
        ftpCollectImpl.collect(builder, metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertEquals(Boolean.toString(isActive), valueRow.getColumns(0));
            assertNotNull(valueRow.getColumns(1));
        }
        mocked.close();

    }

    @Test
    void testAnonymousCollect() throws IOException {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        FtpProtocol ftpProtocol = FtpProtocol.builder()
                .host("127.0.0.1")
                .port("21")
                .timeout("3000")
                .direction("/")
                .build();

        boolean isActive = true;
        MockedConstruction<FTPClient> mocked = Mockito.mockConstruction(FTPClient.class,
                (ftpClient, context) -> {
                    Mockito.doNothing().when(ftpClient).connect(ftpProtocol.getHost(),
                            Integer.parseInt(ftpProtocol.getPort()));
                    Mockito.doAnswer(invocationOnMock -> true).when(ftpClient).login("anonymous", "password");
                    Mockito.when(ftpClient.changeWorkingDirectory(ftpProtocol.getDirection())).thenReturn(isActive);
                    Mockito.doNothing().when(ftpClient).disconnect();
                });

        List<String> aliasField = new ArrayList<>();
        aliasField.add("isActive");
        aliasField.add("responseTime");
        Metrics metrics = new Metrics();
        metrics.setFtp(ftpProtocol);
        metrics.setAliasFields(aliasField);

        ftpCollectImpl.collect(builder, metrics);
        assertEquals(builder.getValuesCount(), 1);
        for (CollectRep.ValueRow valueRow : builder.getValuesList()) {
            assertEquals(Boolean.toString(isActive), valueRow.getColumns(0));
            assertNotNull(valueRow.getColumns(1));
        }
        mocked.close();

    }


}
