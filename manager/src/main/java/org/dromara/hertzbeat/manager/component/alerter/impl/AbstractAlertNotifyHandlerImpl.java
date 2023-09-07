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
import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.component.alerter.AlertNotifyHandler;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;
import org.springframework.web.client.RestTemplate;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import javax.annotation.Resource;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
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


    protected String renderContent(NoticeTemplate noticeTemplate,Alert alert) throws TemplateException, IOException {
        Context context = new Context();

        StringTemplateLoader stringLoader = new StringTemplateLoader();
        String freemarkerTemplate= noticeTemplate.getTemplateContent();
        String firstTemplate = "firstTemplate";


        stringLoader.putTemplate(firstTemplate, freemarkerTemplate);
        Configuration cfg = new Configuration();
        cfg.setTemplateLoader(stringLoader);
        freemarker.template.Template template1 = cfg.getTemplate(firstTemplate, Locale.CHINESE);

        Map<String, String> model = new HashMap<>();
        model.put("title",  bundle.getString("alerter.notify.title"));

        if (alert.getTags() != null) {
            alert.getTags().forEach(context::setVariable);
        }
        if (alert.getTags()!=null&&alert.getTags().get("monitorId")!=null){
            model.put("monitorId",alert.getTags().get("monitorId"));

        }
        if (alert.getTags()!=null&&alert.getTags().get("monitorName")!=null){
            model.put("monitorName",alert.getTags().get("monitorName"));

        }
        model.put("monitorIdLabel",  bundle.getString("alerter.notify.monitorId"));
        model.put("monitorNameLabel",  bundle.getString("alerter.notify.monitorName"));
        model.put("target",  alert.getTarget());
        model.put("targetLabel",   bundle.getString("alerter.notify.target"));
        model.put("priorityLabel",  bundle.getString("alerter.notify.priority"));
        model.put("priority",   bundle.getString("alerter.priority." + alert.getPriority()));
        model.put("triggerTimeLabel", bundle.getString("alerter.notify.triggerTime"));
        model.put("triggerTime", DTF.format(Instant.ofEpochMilli(alert.getLastAlarmTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));
        model.put("contentLabel", bundle.getString("alerter.notify.content"));
        model.put("content", alert.getContent());


        String template = FreeMarkerTemplateUtils.processTemplateIntoString(template1, model);
        return  template.replaceAll("((\r\n)|\n)[\\s\t ]*(\\1)+", "$1");
    }

    /**
     * Get the Thymeleaf template name
     * 获取Thymeleaf模板名称
     *
     * @return Thymeleaf模板名称
     */
    protected abstract String templateName();

}
