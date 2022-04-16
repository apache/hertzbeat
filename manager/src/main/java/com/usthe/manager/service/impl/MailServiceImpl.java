package com.usthe.manager.service.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.util.CommonUtil;
import com.usthe.manager.service.MailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import javax.annotation.Resource;

/**
 * Mailbox sending service interface implementation class
 * 邮箱发送服务接口实现类
 *
 * @author 花城
 * @version 1.0
 * @date 2022/2/19 6:13 下午
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
        // Introduce thymeleaf context parameters to render pages
        // 引入thymeleaf上下文参数渲染页面
        Context context = new Context();
        context.setVariable("target", alert.getTarget());
        context.setVariable("monitorId", alert.getMonitorId());
        context.setVariable("monitorName", alert.getMonitorName());
        context.setVariable("priority", CommonUtil.transferAlertPriority(alert.getPriority()));
        context.setVariable("content", alert.getContent());
        context.setVariable("consoleUrl", alerterProperties.getConsoleUrl());
        return templateEngine.process("mailAlarm", context);
    }
}
