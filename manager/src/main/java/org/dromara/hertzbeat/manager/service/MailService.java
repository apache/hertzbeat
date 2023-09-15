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

package org.dromara.hertzbeat.manager.service;

import freemarker.template.TemplateException;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;

import java.io.IOException;

/**
 * Email delivery service  邮箱发送服务
 *
 * @author 花城
 * @version 1.0
 */
public interface MailService {

    /**
     * Build an alert email template
     * 构建告警邮件模版
     *
     * @param alert          Alarm data element information  告警数据元信息
     * @param noticeTemplate NoticeTemplate information  模板信息
     * @return content of email                邮件内容
     * @throws IOException       IOException information  IO异常
     * @throws TemplateException Freemarker TemplateException information  Freemarker模板异常
     */
    String buildAlertHtmlTemplate(Alert alert, NoticeTemplate noticeTemplate) throws IOException, TemplateException;
}
