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

import freemarker.cache.StringTemplateLoader;
import freemarker.core.TemplateClassResolver;
import freemarker.template.Configuration;
import freemarker.template.TemplateException;
import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.apache.hertzbeat.alert.notice.AlertNotifyHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;
import org.springframework.web.client.RestTemplate;

/**
 * Abstract alert notify handler implementation.
 */
@Slf4j
abstract class AbstractAlertNotifyHandlerImpl implements AlertNotifyHandler {

    private static final String NUMBER_FORMAT = "0";
    protected ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    @Autowired
    protected RestTemplate restTemplate;
    @Autowired
    protected AlerterProperties alerterProperties;


    protected String renderContent(NoticeTemplate noticeTemplate, GroupAlert alert) throws TemplateException, IOException {
        StringTemplateLoader stringLoader = new StringTemplateLoader();
        freemarker.template.Template templateRes;
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_0);
        cfg.setNumberFormat(NUMBER_FORMAT);
        cfg.setNewBuiltinClassResolver(TemplateClassResolver.SAFER_RESOLVER);
        Map<String, Object> model = new HashMap<>(16);
        model.put("title", bundle.getString("alerter.notify.title"));
        model.put("status", alert.getStatus());
        model.put("groupLabels", alert.getGroupLabels());
        model.put("commonLabels", alert.getCommonLabels());
        model.put("commonAnnotations", alert.getCommonAnnotations());
        model.put("alerts", alert.getAlerts());
        if (alerterProperties != null) {
            model.put("consoleUrl", alerterProperties.getConsoleUrl());   
        }
        // TODO Single instance reuse cache considers multiple-threading issues
        String templateName = "freeMakerTemplate";
        stringLoader.putTemplate(templateName, noticeTemplate.getContent());
        cfg.setTemplateLoader(stringLoader);
        templateRes = cfg.getTemplate(templateName, Locale.CHINESE);
        String template = FreeMarkerTemplateUtils.processTemplateIntoString(templateRes, model);
        return template.replaceAll("((\r\n)|\n)[\\s\t ]*(\\1)+", "$1");
    }

    protected String escapeJsonStr(String jsonStr){
        if (jsonStr == null) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        for (char c : jsonStr.toCharArray()) {
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    sb.append(c);
            }
        }
        return sb.toString();
    }

    @EventListener(SystemConfigChangeEvent.class)
    public void onEvent(SystemConfigChangeEvent event) {
        log.info("{} receive system config change event: {}.", this.getClass().getName(), event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }
}
