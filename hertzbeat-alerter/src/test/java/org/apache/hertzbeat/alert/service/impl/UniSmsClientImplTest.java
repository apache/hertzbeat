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

import org.apache.hertzbeat.alert.config.UniSmsProperties;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;


/**
 * Test case for {@link UniSmsClientImpl}
 */
@ExtendWith(MockitoExtension.class)
public class UniSmsClientImplTest {

    @Mock
    private UniSmsProperties uniSmsProperties;

    private UniSmsClientImpl uniSmsClient;

    @BeforeEach
    void setUp() {
        uniSmsClient = new UniSmsClientImpl(uniSmsProperties);
        when(uniSmsProperties.getSignature()).thenReturn("2");
        when(uniSmsProperties.getTemplateId()).thenReturn("any(String.class)");
        when(uniSmsProperties.getAuthMode()).thenReturn("hmac");
        when(uniSmsProperties.getAccessKeyId()).thenReturn("hmac");
        when(uniSmsProperties.getAccessKeySecret()).thenReturn("hmac");
    }

    @Test
    void testSendMessage() {
        assertEquals("unisms", uniSmsClient.getType());
        assertTrue(uniSmsClient.checkConfig());
        //
        NoticeReceiver noticeReceiver = new NoticeReceiver();
        noticeReceiver.setPhone("13888888888");

        Map<String, String> commonLabels = new HashMap<>();
        commonLabels.put("instance", "");
        commonLabels.put("priority", "unknown");

        Map<String, String> commonAnnotations = new HashMap<>();
        commonAnnotations.put("test", "test");

        GroupAlert groupAlert = new GroupAlert();
        groupAlert.setCommonLabels(commonLabels);
        groupAlert.setCommonAnnotations(commonAnnotations);

        assertThrows(SendMessageException.class,
                () -> uniSmsClient.sendMessage(noticeReceiver, null, groupAlert));

    }


}