package com.usthe.manager.service.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import com.usthe.manager.service.MailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import javax.annotation.Resource;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Mailbox sending service interface implementation class
 * 邮箱发送服务接口实现类
 *
 *
 * @version 1.0
 *
 */
@Slf4j
@Service
public class MailServiceImpl implements MailService {

    @Resource
    private TemplateEngine templateEngine;

    @Resource
    private AlerterProperties alerterProperties;

    @Override
    public String buildAlertHtmlTemplate(final Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        monitorId = monitorId == null? "External alarm, no ID" : monitorId;
        monitorName = monitorName == null? "External alarm, no Name" : monitorName;
        // Introduce thymeleaf context parameters to render pages
        // 引入thymeleaf上下文参数渲染页面
        Context context = new Context();
        context.setVariable("target", alert.getTarget());
        context.setVariable("monitorId", monitorId);
        context.setVariable("monitorName", monitorName);
        context.setVariable("priority", CommonUtil.transferAlertPriority(alert.getPriority()));
        context.setVariable("content", alert.getContent());
        context.setVariable("consoleUrl", alerterProperties.getConsoleUrl());
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        context.setVariable("lastTriggerTime", triggerTime);
        return templateEngine.process("mailAlarm", context);
    }
}
