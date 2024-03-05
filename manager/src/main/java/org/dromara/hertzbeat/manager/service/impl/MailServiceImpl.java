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

package org.dromara.hertzbeat.manager.service.impl;

import freemarker.cache.StringTemplateLoader;
import freemarker.template.Configuration;
import freemarker.template.TemplateException;
import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.service.MailService;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.manager.service.NoticeConfigService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;

import javax.annotation.Resource;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * Mailbox sending service interface implementation class
 * 邮箱发送服务接口实现类
 *
 * @author 花城
 * @version 1.0
 */
@Slf4j
@Service
public class MailServiceImpl implements MailService {

    @Resource
    private AlerterProperties alerterProperties;

    @Resource
    protected NoticeConfigService noticeConfigService;

    private ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    private final SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    @Override
    public String buildAlertHtmlTemplate(final Alert alert, NoticeTemplate noticeTemplate) throws IOException, TemplateException {
        freemarker.template.Template templateMail = null;
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_0);
        String monitorId = null;
        String monitorName = null;
        String monitorHost = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
            monitorHost = alert.getTags().get(CommonConstants.TAG_MONITOR_HOST);
        }
        monitorId = monitorId == null ? "External Alarm, No ID" : monitorId;
        monitorName = monitorName == null ? "External Alarm, No Name" : monitorName;
        monitorHost = monitorHost == null ? "External Alarm, No Host" : monitorHost;
        // Introduce context parameters to render pages
        Map<String, String> model = new HashMap<>(16);
        model.put("nameTitle", bundle.getString("alerter.notify.title"));
        model.put("nameMonitorId", bundle.getString("alerter.notify.monitorId"));
        model.put("nameMonitorName", bundle.getString("alerter.notify.monitorName"));
        model.put("nameMonitorHost", bundle.getString("alerter.notify.monitorHost"));
        model.put("target", alert.getTarget());
        model.put("monitorId", monitorId);
        model.put("monitorName", monitorName);
        model.put("monitorHost", monitorHost);
        model.put("nameTarget", bundle.getString("alerter.notify.target"));
        model.put("nameConsole", bundle.getString("alerter.notify.console"));
        model.put("namePriority", bundle.getString("alerter.notify.priority"));
        model.put("priority", bundle.getString("alerter.priority." + alert.getPriority()));
        model.put("nameTriggerTime", bundle.getString("alerter.notify.triggerTime"));
        model.put("lastTriggerTime", simpleDateFormat.format(new Date(alert.getLastAlarmTime())));
        if (CommonConstants.ALERT_STATUS_CODE_RESTORED == alert.getStatus()) {
            model.put("nameRestoreTime", bundle.getString("alerter.notify.restoreTime"));
            model.put("restoreTime", simpleDateFormat.format(new Date(alert.getFirstAlarmTime())));
        }
        model.put("consoleUrl", alerterProperties.getConsoleUrl());
        model.put("nameContent", bundle.getString("alerter.notify.content"));
        model.put("content", alert.getContent());
        if (noticeTemplate == null) {
            noticeTemplate = noticeConfigService.getDefaultNoticeTemplateByType((byte) 1);
        }
        if (noticeTemplate == null) {
            throw new NullPointerException("email does not have mapping default notice template");
        }
        StringTemplateLoader stringLoader = new StringTemplateLoader();
        String templateName = "mailTemplate";
        stringLoader.putTemplate(templateName, noticeTemplate.getContent());
        cfg.setTemplateLoader(stringLoader);
        templateMail = cfg.getTemplate(templateName, Locale.CHINESE);
        return FreeMarkerTemplateUtils.processTemplateIntoString(templateMail, model);
    }

    @EventListener(SystemConfigChangeEvent.class)
    public void onEvent(SystemConfigChangeEvent event) {
        log.info("{} receive system config change event: {}.", this.getClass().getName(), event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }
}
