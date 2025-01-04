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

package org.apache.hertzbeat.alert.notice.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Properties;
import org.apache.hertzbeat.alert.dto.MailServerConfig;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import jakarta.mail.internet.MimeMessage;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.ResourceBundle;

/**
 * Test case for Email Alert Notify
 */
@ExtendWith(MockitoExtension.class)
class EmailAlertNotifyHandlerImplTest {

    @Mock
    private JavaMailSenderImpl mailSender;
    
    @Mock
    private ResourceBundle bundle;
    
    @Mock
    private GeneralConfigDao generalConfigDao;
    
    @Mock
    private MimeMessage mimeMessage;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private EmailAlertNotifyHandlerImpl emailAlertNotifyHandler;

    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() throws JsonProcessingException {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setEmail("test@example.com");
        
        groupAlert = new GroupAlert();
        SingleAlert singleAlert = new SingleAlert();
        singleAlert.setLabels(new HashMap<>());
        singleAlert.getLabels().put("severity", "critical");
        singleAlert.getLabels().put("alertname", "Test Alert");
        
        List<SingleAlert> alerts = new ArrayList<>();
        alerts.add(singleAlert);
        groupAlert.setAlerts(alerts);
        
        template = new NoticeTemplate();
        template.setId(1L);
        template.setName("test-template");
        template.setContent("test content");
        
        // 设置邮件服务器配置
        MailServerConfig mailServerConfig = new MailServerConfig();
        mailServerConfig.setEmailHost("smtp.example.com");
        mailServerConfig.setEmailPort(587);
        mailServerConfig.setEmailUsername("sender@example.com");
        mailServerConfig.setEmailPassword("password");
        mailServerConfig.setEnable(true);
        GeneralConfig generalConfig = GeneralConfig.builder().content("").build();
        when(generalConfigDao.findByType(any())).thenReturn(generalConfig);
        when(objectMapper.readValue(any(String.class), eq(MailServerConfig.class)))
            .thenReturn(mailServerConfig);
        when(mailSender.getJavaMailProperties()).thenReturn(new Properties());
    }

    @Test
    public void testNotifyAlertWithInvalidEmail() {
        receiver.setEmail(null);
        assertThrows(AlertNoticeException.class, 
                () -> emailAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertSuccess() throws Exception {
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("Alert Notification");
        emailAlertNotifyHandler.send(receiver, template, groupAlert);
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    public void testNotifyAlertFailure() {
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("Test Error"));
        assertThrows(AlertNoticeException.class, 
                () -> emailAlertNotifyHandler.send(receiver, template, groupAlert));
    }
}
