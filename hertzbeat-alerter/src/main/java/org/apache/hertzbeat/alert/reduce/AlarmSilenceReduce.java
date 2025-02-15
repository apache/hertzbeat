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

package org.apache.hertzbeat.alert.reduce;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.stereotype.Component;

/**
 * Silence alert handler
 * Refer from prometheus alert silencing mechanism
 */
@Component
@RequiredArgsConstructor
public class AlarmSilenceReduce {

    private final AlertSilenceDao alertSilenceDao;
    private final AlertNoticeDispatch dispatcherAlarm;

    /**
     * Process alert with silence rules
     * If alert matches any active silence rule, it will be silenced
     * @param groupAlert The alert to be processed
     */
    public void silenceAlarm(GroupAlert groupAlert) {
        List<AlertSilence> alertSilenceList = CacheFactory.getAlertSilenceCache();
        if (alertSilenceList == null) {
            alertSilenceList = alertSilenceDao.findAlertSilencesByEnableTrue();
            CacheFactory.setAlertSilenceCache(alertSilenceList);
        }
        
        // Check each silence rule
        for (AlertSilence alertSilence : alertSilenceList) {
            // Check if alert matches silence rule
            boolean match = alertSilence.isMatchAll();
            if (!match && groupAlert.getGroupLabels() != null) {
                Map<String, String> labels = alertSilence.getLabels();
                Map<String, String> alertLabels = groupAlert.getGroupLabels();
                match = labels.entrySet().stream().anyMatch(item -> 
                    alertLabels.containsKey(item.getKey()) && item.getValue().equals(alertLabels.get(item.getKey())));
            }
            
            if (match) {
                LocalDateTime now = LocalDateTime.now();
                if (alertSilence.getType() == 0) {
                    // One-time silence rule
                    if (checkAndSave(now, alertSilence)) {
                        continue;
                    }
                    // Alert is silenced
                    return;
                } else if (alertSilence.getType() == 1) {
                    // Cyclic silence rule
                    int currentDayOfWeek = now.getDayOfWeek().getValue();
                    if (alertSilence.getDays() != null && alertSilence.getDays().contains((byte) currentDayOfWeek) 
                            && !checkAndSave(now, alertSilence)) {
                        // Alert is silenced
                        return;
                    }
                }
            }
        }
        
        // No matching silence rule, forward the alert
        dispatcherAlarm.dispatchAlarm(groupAlert);
    }

    /**
     * Check if alert time is within silence period and update silence rule counter
     * @param now Current time
     * @param alertSilence Silence rule to check
     * @return true if alert should not be silenced, false if alert should be silenced
     */
    private boolean checkAndSave(LocalDateTime now, AlertSilence alertSilence) {
        boolean startMatch = alertSilence.getPeriodStart() == null 
                || now.isAfter(alertSilence.getPeriodStart().toLocalDateTime());
        boolean endMatch = alertSilence.getPeriodEnd() == null 
                || now.isBefore(alertSilence.getPeriodEnd().toLocalDateTime());

        if (startMatch && endMatch) {
            int time = Optional.ofNullable(alertSilence.getTimes()).orElse(0);
            alertSilence.setTimes(time + 1);
            alertSilenceDao.save(alertSilence);
            return false;
        }
        return true;
    }
}
