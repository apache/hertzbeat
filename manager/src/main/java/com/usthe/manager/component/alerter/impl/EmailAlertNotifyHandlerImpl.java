package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import javax.mail.internet.MimeMessage;
import java.util.Date;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class EmailAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final JavaMailSender javaMailSender;
    private final MailService mailService;

    @Value("${spring.mail.username}")
    private String emailFromUser;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            messageHelper.setSubject("TanCloud探云-监控告警");
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
            log.error("[Email Alert] Exception，Exception information={}", e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 1;
    }
}
