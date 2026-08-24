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

package org.apache.hertzbeat.alert.notice;

import freemarker.cache.StringTemplateLoader;
import freemarker.core.TemplateClassResolver;
import freemarker.template.Configuration;
import freemarker.template.TemplateException;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;

/**
 * Renders a {@link NoticeTemplate} against a {@link GroupAlert} using FreeMarker.
 *
 * <p>This is shared between the real notify dispatch path ({@code AlertNotifyHandler}
 * implementations) and the notice template preview endpoint, so both render a template
 * exactly the same way.
 */
public final class NoticeTemplateRenderer {

    private static final String NUMBER_FORMAT = "0";

    private NoticeTemplateRenderer() {
    }

    public static String renderContent(NoticeTemplate noticeTemplate, GroupAlert alert, String consoleUrl,
            ResourceBundle bundle) throws TemplateException, IOException {
        StringTemplateLoader stringLoader = new StringTemplateLoader();
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
        if (consoleUrl != null) {
            model.put("consoleUrl", consoleUrl);
        }
        // TODO Single instance reuse cache considers multiple-threading issues
        String templateName = "freeMakerTemplate";
        stringLoader.putTemplate(templateName, noticeTemplate.getContent());
        cfg.setTemplateLoader(stringLoader);
        freemarker.template.Template templateRes = cfg.getTemplate(templateName, Locale.CHINESE);
        String template = FreeMarkerTemplateUtils.processTemplateIntoString(templateRes, model);
        return template.replaceAll("((\r\n)|\n)[\\s\t ]*(\\1)+", "$1");
    }

    /**
     * Builds a representative {@link GroupAlert} for previewing a template, so a user can see
     * what a real notification would look like without waiting for (or faking) a real alert.
     */
    public static GroupAlert sampleGroupAlert() {
        long now = System.currentTimeMillis();
        SingleAlert singleAlert = SingleAlert.builder()
                .labels(Map.of("alertname", "HighCPUUsage", "instance", "server1.example.com", "severity", "critical"))
                .annotations(Map.of("summary", "High CPU usage detected"))
                .content("CPU usage is above 80% for the last 5 minutes on instance server1.example.com.")
                .status("firing")
                .triggerTimes(1)
                .startAt(now)
                .activeAt(now)
                .build();
        return GroupAlert.builder()
                .groupKey("HighCPUUsage{alertname=\"HighCPUUsage\", instance=\"server1.example.com\"}")
                .status("firing")
                .groupLabels(Map.of("alertname", "HighCPUUsage"))
                .commonLabels(Map.of("alertname", "HighCPUUsage", "instance", "server1.example.com", "severity", "critical"))
                .commonAnnotations(Map.of("summary", "High CPU usage detected"))
                .gmtCreate(LocalDateTime.now())
                .alerts(List.of(singleAlert))
                .build();
    }
}
