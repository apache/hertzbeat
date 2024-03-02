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

package org.dromara.hertzbeat.manager.service;

import freemarker.template.TemplateException;
import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.service.impl.MailServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.ResourceBundle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

/**
 * Test case for {@link MailService}
 */
@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Spy
    @InjectMocks
    private MailServiceImpl mailService;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;


    @Test
    void buildAlertHtmlTemplate() throws TemplateException, IOException {
        Alert alert=new Alert();
        NoticeTemplate noticeTemplate=new NoticeTemplate();
        alert.setTarget("Test Target");
        alert.setContent("Test");
        alert.setTriggerTimes(1);
        alert.setFirstAlarmTime(System.currentTimeMillis());
        alert.setLastAlarmTime(System.currentTimeMillis());
        alert.setPriority(CommonConstants.ALERT_PRIORITY_CODE_CRITICAL);
        noticeTemplate.setId(1L);
        noticeTemplate.setName("test");
        noticeTemplate.setContent("result");

        assertEquals("result", mailService.buildAlertHtmlTemplate(alert,noticeTemplate));
        assertNotNull(mailService.buildAlertHtmlTemplate(alert,noticeTemplate));
    }
}
