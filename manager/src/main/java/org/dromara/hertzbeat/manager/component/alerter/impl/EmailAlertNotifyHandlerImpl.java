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

package org.dromara.hertzbeat.manager.component.alerter.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.component.alerter.AlertNotifyHandler;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.EmailNoticeSender;
import org.dromara.hertzbeat.manager.service.MailService;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import javax.mail.internet.MimeMessage;
import java.util.Date;
import java.util.Properties;
import java.util.ResourceBundle;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 *
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class EmailAlertNotifyHandlerImpl implements AlertNotifyHandler {

    private final JavaMailSender javaMailSender;

    private final MailService mailService;
    
    @Value("${spring.mail.host:smtp.demo.com}")
    private String host;
    
    @Value("${spring.mail.username:demo}")
    private String username;
    
    @Value("${spring.mail.password:demo}")
    private String password;
    
    @Value("${spring.mail.port:465}")
    private Integer port;
    
    @Value("${spring.mail.properties.mail.smtp.ssl.enable:true}")
    private boolean sslEnable = true;

    private final GeneralConfigDao generalConfigDao;

    private final ObjectMapper objectMapper;

    private static final String TYPE = "email";

    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        try {
            //获取sender
            JavaMailSenderImpl sender = (JavaMailSenderImpl) javaMailSender;
            String fromUsername = username;
            try {
                boolean useDatabase = false;
                GeneralConfig emailConfig = generalConfigDao.findByType(TYPE);
                if (emailConfig != null && emailConfig.getContent() != null) {
                    // 若启用数据库配置
                    String content = emailConfig.getContent();
                    EmailNoticeSender emailNoticeSenderConfig = objectMapper.readValue(content, EmailNoticeSender.class);
                    if (emailNoticeSenderConfig.isEnable()) {
                        sender.setHost(emailNoticeSenderConfig.getEmailHost());
                        sender.setPort(emailNoticeSenderConfig.getEmailPort());
                        sender.setUsername(emailNoticeSenderConfig.getEmailUsername());
                        sender.setPassword(emailNoticeSenderConfig.getEmailPassword());
                        Properties props = sender.getJavaMailProperties();
                        props.put("mail.smtp.ssl.enable", emailNoticeSenderConfig.isEmailSsl());
                        fromUsername = emailNoticeSenderConfig.getEmailUsername();  
                        useDatabase = true;
                    }
                } 
                if (!useDatabase) {
                    // 若数据库未配置则启用yml配置
                    sender.setHost(host);
                    sender.setPort(port);
                    sender.setUsername(username);
                    sender.setPassword(password);
                    Properties props = sender.getJavaMailProperties();
                    props.put("mail.smtp.ssl.enable", sslEnable);
                }
            } catch (Exception e) {
                log.error("Type not found {}",e.getMessage());
            }
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            messageHelper.setSubject(bundle.getString("alerter.notify.title"));
            //Set sender Email 设置发件人Email
            messageHelper.setFrom(fromUsername);
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
