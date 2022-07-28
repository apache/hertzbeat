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

package com.usthe.manager.service.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.service.MailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import javax.annotation.Resource;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ResourceBundle;

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

    private ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public String buildAlertHtmlTemplate(final Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        monitorId = monitorId == null? "External Alarm, No ID" : monitorId;
        monitorName = monitorName == null? "External Alarm, No Name" : monitorName;
        // Introduce thymeleaf context parameters to render pages
        // 引入thymeleaf上下文参数渲染页面
        Context context = new Context();
        context.setVariable("nameTitle", bundle.getString("alerter.notify.title"));
        context.setVariable("nameTarget", bundle.getString("alerter.notify.target"));
        context.setVariable("nameMonitorId", bundle.getString("alerter.notify.monitorId"));
        context.setVariable("nameMonitorName", bundle.getString("alerter.notify.monitorName"));
        context.setVariable("namePriority", bundle.getString("alerter.notify.priority"));
        context.setVariable("nameTriggerTime", bundle.getString("alerter.notify.triggerTime"));
        context.setVariable("nameContent", bundle.getString("alerter.notify.content"));
        context.setVariable("nameConsole", bundle.getString("alerter.notify.console"));
        context.setVariable("target", alert.getTarget());
        context.setVariable("monitorId", monitorId);
        context.setVariable("monitorName", monitorName);
        context.setVariable("priority", bundle.getString("alerter.priority." + alert.getPriority()));
        context.setVariable("content", alert.getContent());
        context.setVariable("consoleUrl", alerterProperties.getConsoleUrl());
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        context.setVariable("lastTriggerTime", triggerTime);
        return templateEngine.process("mailAlarm", context);
    }
}
