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

import jakarta.mail.internet.MimeMessage;
import java.util.Date;
import java.util.Properties;
import java.util.ResourceBundle;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Send alarm information through email.
 * <p>
 * {@code spring.mail} is optional. Spring Boot only auto-configures {@link JavaMailSender}
 * when mail host properties are set; without them this handler still starts and uses a
 * local {@link JavaMailSenderImpl}, which can be configured via yml defaults or the UI
 * (database) mail server settings.
 * </p>
 */
@Component
@Slf4j
public class EmailAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private final JavaMailSenderImpl javaMailSender;

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${spring.mail.port:465}")
    private Integer port;

    @Value("${spring.mail.properties.mail.smtp.ssl.enable:true}")
    private boolean sslEnable = true;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:false}")
    private boolean starttlsEnable = false;

    private final GeneralConfigDao generalConfigDao;

    private static final String TYPE = "email";

    private ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    public EmailAlertNotifyHandlerImpl(ObjectProvider<JavaMailSender> javaMailSenderProvider,
                                       GeneralConfigDao generalConfigDao) {
        // Prefer the Boot-auto-configured sender when spring.mail is present; otherwise keep a
        // local sender so the app can start and email can still be configured via the UI/DB.
        JavaMailSender available = javaMailSenderProvider.getIfAvailable();
        if (available instanceof JavaMailSenderImpl mailSender) {
            this.javaMailSender = mailSender;
        } else {
            this.javaMailSender = new JavaMailSenderImpl();
            log.info("spring.mail is not configured; email notify will require UI/DB mail server settings");
        }
        this.generalConfigDao = generalConfigDao;
    }

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) throws AlertNoticeException {
        try {
            JavaMailSenderImpl sender = javaMailSender;
            String fromUsername = username;
            boolean useDatabase = false;
            try {
                GeneralConfig emailConfig = generalConfigDao.findByType(TYPE);
                if (emailConfig != null && emailConfig.getContent() != null) {
                    // enable database configuration
                    String content = emailConfig.getContent();
                    MailServerConfig emailNoticeSenderConfig = JsonUtil.fromJson(content, MailServerConfig.class);
                    if (emailNoticeSenderConfig != null && emailNoticeSenderConfig.isEnable()) {
                        sender.setHost(emailNoticeSenderConfig.getEmailHost());
                        sender.setPort(emailNoticeSenderConfig.getEmailPort());
                        sender.setUsername(emailNoticeSenderConfig.getEmailUsername());
                        sender.setPassword(emailNoticeSenderConfig.getEmailPassword());
                        Properties props = sender.getJavaMailProperties();
                        props.put("mail.smtp.ssl.enable", emailNoticeSenderConfig.isEmailSsl());
                        props.put("mail.smtp.starttls.enable", emailNoticeSenderConfig.isEmailStarttls());
                        fromUsername = emailNoticeSenderConfig.getEmailUsername();
                        useDatabase = true;
                    }
                }
                if (!useDatabase) {
                    if (!StringUtils.hasText(host) || !StringUtils.hasText(username)) {
                        throw new AlertNoticeException(mailNotConfiguredMessage());
                    }
                    // if the database is not configured, use the yml configuration
                    sender.setHost(host);
                    sender.setPort(port);
                    sender.setUsername(username);
                    sender.setPassword(password);
                    Properties props = sender.getJavaMailProperties();
                    props.put("mail.smtp.ssl.enable", sslEnable);
                    props.put("mail.smtp.starttls.enable", starttlsEnable);
                }
            } catch (AlertNoticeException e) {
                throw e;
            } catch (Exception e) {
                log.error("Type not found {}", e.getMessage());
            }
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            messageHelper.setSubject(bundle.getString("alerter.notify.title"));
            // Set sender Email
            messageHelper.setFrom(fromUsername);
            // Set recipient Email
            messageHelper.setTo(receiver.getEmail());
            messageHelper.setSentDate(new Date());
            // Build email templates
            String process = renderContent(noticeTemplate, alert);
            // Set Email Content Template
            messageHelper.setText(process, true);
            javaMailSender.send(mimeMessage);
        } catch (AlertNoticeException e) {
            throw e;
        } catch (Exception e) {
            throw new AlertNoticeException("[Email Notify Error] " + e.getMessage());
        }
    }

    private static String mailNotConfiguredMessage() {
        return "[Email Notify Error] Mail server is not configured. "
                + "Set spring.mail in application.yml or enable email settings in the UI.";
    }

    @Override
    public byte type() {
        return 1;
    }

    @Override
    @EventListener(SystemConfigChangeEvent.class)
    public void onEvent(SystemConfigChangeEvent event) {
        log.info("{} receive system config change event: {}.", this.getClass().getName(), event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }
}
