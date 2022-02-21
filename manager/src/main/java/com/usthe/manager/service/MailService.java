package com.usthe.manager.service;

import com.usthe.common.entity.alerter.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * 邮箱发送服务
 *
 *
 * @version 1.0
 *
 */
public interface MailService {

    /**
     * 构建告警邮件模版
     * @param alert     告警信息
     * @return          邮件内容
     */
    String buildAlertHtmlTemplate(Alert alert);
}
