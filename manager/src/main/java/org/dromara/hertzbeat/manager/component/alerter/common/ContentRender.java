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

package org.dromara.hertzbeat.manager.component.alerter.common;

import freemarker.cache.StringTemplateLoader;
import freemarker.template.Configuration;
import freemarker.template.TemplateException;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.service.NoticeConfigService;
import org.springframework.stereotype.Component;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;

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
 * Created by liven on 2024/1/11
 *
 * @author liven
 * @date 2024/1/11
 */

@Slf4j
@Component
public class ContentRender {

    private static final String NUMBER_FORMAT = "0";

    private static final String TEMPLATE_NAME = "freeMakerTemplate";

    protected static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private Configuration cfg;

    private StringTemplateLoader stringLoader;

    private ResourceBundle bundle;

    @Resource
    protected NoticeConfigService noticeConfigService;

    private ContentRender() {
        stringLoader = new StringTemplateLoader();
        cfg = new Configuration(Configuration.VERSION_2_3_23);
        cfg.setNumberFormat(NUMBER_FORMAT);
        bundle = ResourceBundleUtil.getBundle("alerter");
    }

    public String renderContent(NoticeTemplate noticeTemplate, Alert alert, byte type) throws TemplateException, IOException {
        freemarker.template.Template templateRes;
        Map<String, Object> model = buildModel(alert);
        if (noticeTemplate == null) {
            noticeTemplate = noticeConfigService.getDefaultNoticeTemplateByType(type);
        }
        if (noticeTemplate == null) {
            log.error("alert does not have mapping default notice template. type: {}.", type);
            throw new NullPointerException(type + " does not have mapping default notice template");
        }
        String templateName = TEMPLATE_NAME + "-" + noticeTemplate.getName();
        stringLoader.putTemplate(templateName, noticeTemplate.getContent());
        cfg.setTemplateLoader(stringLoader);
        templateRes = cfg.getTemplate(templateName, Locale.CHINESE);
        String template = FreeMarkerTemplateUtils.processTemplateIntoString(templateRes, model);
        return template.replaceAll("((\r\n)|\n)[\\s\t ]*(\\1)+", "$1");
    }

    private Map<String, Object> buildModel(Alert alert) {
        Map<String, Object> model = new HashMap<>(16);
        model.put("title", bundle.getString("alerter.notify.title"));

        if (alert.getTags() != null) {
            String monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            if (monitorId != null) {
                model.put("monitorId", monitorId);
            }
            String monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
            if (monitorName != null) {
                model.put("monitorName", monitorName);
            }
            String thresholdId = alert.getTags().get(CommonConstants.TAG_THRESHOLD_ID);
            if (thresholdId != null) {
                model.put("thresholdId", thresholdId);
            }
        }

        model.put("alarmId", alert.getId());
        model.put("status", alert.getStatus());
        model.put("monitorIdLabel", bundle.getString("alerter.notify.monitorId"));
        model.put("monitorNameLabel", bundle.getString("alerter.notify.monitorName"));
        model.put("target", alert.getTarget());
        model.put("targetLabel", bundle.getString("alerter.notify.target"));
        model.put("priorityLabel", bundle.getString("alerter.notify.priority"));
        model.put("priority", bundle.getString("alerter.priority." + alert.getPriority()));
        model.put("priorityValue", alert.getPriority());
        model.put("triggerTimeLabel", bundle.getString("alerter.notify.triggerTime"));
        model.put("triggerTime", DTF.format(Instant.ofEpochMilli(alert.getLastAlarmTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));
        if (CommonConstants.ALERT_STATUS_CODE_RESTORED == alert.getStatus()) {
            model.put("restoreTimeLabel", bundle.getString("alerter.notify.restoreTime"));
            model.put("restoreTime", DTF.format(Instant.ofEpochMilli(alert.getFirstAlarmTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));
        }
        model.put("timesLabel", bundle.getString("alerter.notify.times"));
        model.put("times", alert.getTimes());
        model.put("contentLabel", bundle.getString("alerter.notify.content"));
        model.put("content", alert.getContent());
        model.put("tagsLabel", bundle.getString("alerter.notify.tags"));
        model.put("tags", alert.getTags());
        return model;
    }
}
