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

package org.apache.hertzbeat.manager.service;

import freemarker.template.TemplateException;
import java.io.IOException;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;

/**
 * Email delivery service
 * @version 1.0
 */
public interface MailService {

    /**
     * Build an alert email template
     * @param alert          Alarm data element information
     * @param noticeTemplate NoticeTemplate information
     * @return content of email
     * @throws IOException       IOException information
     * @throws TemplateException Freemarker TemplateException information
     */
    String buildAlertHtmlTemplate(Alert alert, NoticeTemplate noticeTemplate) throws IOException, TemplateException;
}
