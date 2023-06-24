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

import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.component.alerter.AlertNotifyHandler;
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
        context.setVariable("triggerTime", DTF.format(Instant.ofEpochMilli(alert.getLastAlarmTime()).atZone(ZoneId.systemDefault()).toLocalDateTime()));

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
