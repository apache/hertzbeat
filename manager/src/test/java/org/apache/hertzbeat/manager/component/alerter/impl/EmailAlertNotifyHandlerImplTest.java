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

package org.apache.hertzbeat.manager.component.alerter.impl;

import java.util.Date;
import java.util.Properties;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.service.MailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link EmailAlertNotifyHandlerImpl}
 */

@ExtendWith(MockitoExtension.class)
class EmailAlertNotifyHandlerImplTest {

    @Mock
    private JavaMailSenderImpl javaMailSender;

    @Mock
    private MailService mailService;

    @Mock
    private GeneralConfigDao generalConfigDao;

    @Mock
    private ObjectMapper objectMapper;

    private JavaMailSenderImpl sender;

    @InjectMocks
    private EmailAlertNotifyHandlerImpl emailAlertNotifyHandler;

    @BeforeEach
    public void setUp() {

        ReflectionTestUtils.setField(emailAlertNotifyHandler, "host", "smtp.demo.com");
        ReflectionTestUtils.setField(emailAlertNotifyHandler, "username", "demo");
        ReflectionTestUtils.setField(emailAlertNotifyHandler, "password", "demo");
        ReflectionTestUtils.setField(emailAlertNotifyHandler, "port", 465);
        ReflectionTestUtils.setField(emailAlertNotifyHandler, "sslEnable", true);
    }

    @Test
    void testSend() throws Exception {

        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setEmail("receiver@example.com");

        NoticeTemplate noticeTemplate = new NoticeTemplate();
        Alert alert = Alert.builder().build();

        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

        Properties properties = new Properties();
        when(javaMailSender.getJavaMailProperties()).thenReturn(properties);

        when(mailService.buildAlertHtmlTemplate(
                any(Alert.class),
                any(NoticeTemplate.class))
        ).thenReturn("HTML Content");

        emailAlertNotifyHandler.send(receiver, noticeTemplate, alert);

        verify(javaMailSender).send(mimeMessage);

        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom("demo");
        helper.setTo("receiver@example.com");
        helper.setSubject("Email Alert Notification");
        helper.setSentDate(new Date());
        helper.setText("HTML Content", true);
    }

}
