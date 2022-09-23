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

package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.service.MailService;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import javax.mail.internet.MimeMessage;
import java.util.Date;
import java.util.ResourceBundle;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty("spring.mail.username")
final class EmailAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final JavaMailSender javaMailSender;
    private final MailService mailService;

    @Value("${spring.mail.username}")
    private String emailFromUser;

    private ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            messageHelper.setSubject(bundle.getString("alerter.notify.title"));
            //Set sender Email 设置发件人Email
            messageHelper.setFrom(emailFromUser);
            //Set recipient Email 设定收件人Email
            messageHelper.setTo(receiver.getEmail());
            messageHelper.setSentDate(new Date());
            //Build email templates 构建邮件模版
            String process = mailService.buildAlertHtmlTemplate(alert);
            //Set Email Content Template 设置邮件内容模版
            messageHelper.setText(process, true);
            javaMailSender.send(mimeMessage);
        } catch (Exception e) {
            throw new AlertNoticeException("[Email Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 1;
    }
}
