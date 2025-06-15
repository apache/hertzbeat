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

package org.apache.hertzbeat.alert.service.impl;

import com.google.common.collect.Lists;
import org.apache.hertzbeat.alert.config.SmslocalSmsProperties;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link SmsLocalSmsClientImpl}
 */
@ExtendWith(MockitoExtension.class)
public class SmsLocalSmsClientImplTest {

    @Mock
    private SmslocalSmsProperties smslocalSmsProperties;

    private SmsLocalSmsClientImpl smsLocalSmsClient;


    @BeforeEach
    void setUp() {
        smsLocalSmsClient = new SmsLocalSmsClientImpl(smslocalSmsProperties);
        when(smslocalSmsProperties.getApiKey()).thenReturn("2");
    }

    @Test
    void testSendMessage() {
        assertEquals("smslocal", smsLocalSmsClient.getType());
        assertTrue(smsLocalSmsClient.checkConfig());
        //
        NoticeReceiver noticeReceiver = new NoticeReceiver();
        noticeReceiver.setPhone("13888888888");

        SingleAlert singleAlert = new SingleAlert();
        singleAlert.setContent("test");

        GroupAlert groupAlert = new GroupAlert();
        groupAlert.setAlerts(Lists.newArrayList(singleAlert));

        assertThrows(SendMessageException.class,
                () -> smsLocalSmsClient.sendMessage(noticeReceiver, null, groupAlert));
    }

}