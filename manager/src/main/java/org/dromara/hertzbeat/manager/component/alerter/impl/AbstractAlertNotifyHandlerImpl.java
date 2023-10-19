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

import freemarker.cache.StringTemplateLoader;
import freemarker.template.Configuration;
import freemarker.template.TemplateException;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.component.alerter.AlertNotifyHandler;
import org.springframework.context.event.EventListener;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;

/**
 *
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
@Slf4j
abstract class AbstractAlertNotifyHandlerImpl implements AlertNotifyHandler {

    protected static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    protected ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    @Resource
    protected RestTemplate restTemplate;

    @Resource
    protected AlerterProperties alerterProperties;


    protected String renderContent(NoticeTemplate noticeTemplate, Alert alert) throws TemplateException, IOException {

        StringTemplateLoader stringLoader = new StringTemplateLoader();
        freemarker.template.Template templateRes = null;
        Configuration cfg = new Configuration();
        Map<String, String> model = new HashMap<>(16);
        model.put("title", bundle.getString("alerter.notify.title"));

        if (alert.getTags() != null) {
            String monitorId = alert.getTags().get("monitorId");
            if (monitorId != null) {
                model.put("monitorId", monitorId);
            }
            String monitorName = alert.getTags().get("monitorName");
            if (monitorName != null) {
                model.put("monitorName", monitorName);
            }
        }

        model.put("monitorIdLabel", bundle.getString("alerter.notify.monitorId"));
        model.put("monitorNameLabel", bundle.getString("alerter.notify.monitorName"));
        model.put("target", alert.getTarget());
        model.put("targetLabel", bundle.getString("alerter.notify.target"));
        model.put("priorityLabel", bundle.getString("alerter.notify.priority"));
        model.put("priority", bundle.getString("alerter.priority." + alert.getPriority()));
        model.put("triggerTimeLabel", bundle.getString("alerter.notify.triggerTime"));
        model.put("triggerTime", DTF.format(Instant.ofEpochMilli(alert.getLastAlarmTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));
        model.put("contentLabel", bundle.getString("alerter.notify.content"));
        model.put("content", alert.getContent());
        if (noticeTemplate == null) {
            String path = this.getClass().getResource("/").getPath();
            cfg.setDirectoryForTemplateLoading(new File(path + "templates/"));
            cfg.setDefaultEncoding("utf-8");
            templateRes = cfg.getTemplate(templateName() + ".txt");
        } else {
            String templateName = "freemakerTemplate";
            stringLoader.putTemplate(templateName, noticeTemplate.getTemplateContent());
            cfg.setTemplateLoader(stringLoader);
            templateRes = cfg.getTemplate(templateName, Locale.CHINESE);
        }
        String template = FreeMarkerTemplateUtils.processTemplateIntoString(templateRes, model);
        return template.replaceAll("((\r\n)|\n)[\\s\t ]*(\\1)+", "$1");
    }


    /**
     * Get the Thymeleaf template name
     * 获取Thymeleaf模板名称
     *
     * @return Thymeleaf模板名称
     */
    protected abstract String templateName();

    @EventListener(SystemConfigChangeEvent.class)
    public void onEvent(SystemConfigChangeEvent event) {
        log.info("{} receive system config change event: {}.", this.getClass().getName(), event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }

}


