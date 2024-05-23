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

package org.apache.hertzbeat.manager.component.alerter;

import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;

/**
 * AlertNotifyHandler interface
 */
public interface AlertNotifyHandler {

    /**
     * send alarm notification
     * @param receiver       Notification configuration information
     * @param noticeTemplate Notification configuration information
     * @param alert          Alarm information
     * @throws AlertNoticeException when send receiver error
     */
    void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException;

    /**
     * notification type
     * @return notification type
     */
    byte type();
}
