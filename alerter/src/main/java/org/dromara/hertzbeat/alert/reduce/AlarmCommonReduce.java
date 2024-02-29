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

package org.dromara.hertzbeat.alert.reduce;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dao.AlertMonitorDao;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.Tag;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * reduce alarm and send alert data
 *
 * @author tom
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlarmCommonReduce {

    private final AlarmSilenceReduce alarmSilenceReduce;
	
    private final AlarmConvergeReduce alarmConvergeReduce;

    private final CommonDataQueue dataQueue;

    private final AlertMonitorDao alertMonitorDao;

    public void reduceAndSendAlarm(Alert alert) {
        alert.setTimes(1);
        Map<String, String> tags = alert.getTags();
        if (tags == null) {
            tags = new HashMap<>(8);
            alert.setTags(tags);
        }
        String monitorIdStr = tags.get(CommonConstants.TAG_MONITOR_ID);
        if (monitorIdStr == null) {
            log.debug("receiver extern alarm message: {}", alert);
        } else {
            long monitorId = Long.parseLong(monitorIdStr);
            List<Tag> tagList = alertMonitorDao.findMonitorIdBindTags(monitorId);
            for (Tag tag : tagList) {
                if (!tags.containsKey(tag.getName())) {
                    tags.put(tag.getName(), tag.getValue());
                }
            }
        }
        // converge -> silence
        if (alarmConvergeReduce.filterConverge(alert) && alarmSilenceReduce.filterSilence(alert)) {
            dataQueue.sendAlertsData(alert);
        }
    }

}
