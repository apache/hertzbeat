package com.usthe.manager.component.alerter.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.util.CommonUtil;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import org.springframework.web.client.RestTemplate;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import javax.annotation.Resource;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ResourceBundle;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
abstract class AbstractAlertNotifyHandlerImpl implements AlertNotifyHandler {

    protected final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    protected static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    protected TemplateEngine templateEngine;

    @Resource
    protected RestTemplate restTemplate;

    @Resource
    protected AlerterProperties alerterProperties;

    protected String renderContent(Alert alert) {
        Context context = new Context();
        context.setVariable("title", "[" + bundle.getString("alerter.notify.title") + "]");
        if (alert.getTags() != null) {
            alert.getTags().forEach(context::setVariable);
        }
        context.setVariable("monitorIdLabel", bundle.getString("alerter.notify.monitorId"));
        context.setVariable("monitorNameLabel", bundle.getString("alerter.notify.monitorName"));
        context.setVariable("targetLabel", bundle.getString("alerter.notify.target"));
        context.setVariable("target", alert.getTarget());

        context.setVariable("priorityLabel", bundle.getString("alerter.notify.priority"));
        context.setVariable("priority", bundle.getString("alerter.priority." + alert.getPriority()));

        context.setVariable("triggerTimeLabel", bundle.getString("alerter.notify.triggerTime"));
        context.setVariable("triggerTime", DTF.format(Instant.ofEpochMilli(alert.getLastTriggerTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));

        context.setVariable("contentLabel", bundle.getString("alerter.notify.content"));
        context.setVariable("content", alert.getContent());

        return CommonUtil.removeBlankLine(templateEngine.process(templateName(), context));
    }

    /**
     * Get the Thymeleaf template name
     * 获取Thymeleaf模板名称
     *
     * @return Thymeleaf模板名称
     */
    protected abstract String templateName();

}
