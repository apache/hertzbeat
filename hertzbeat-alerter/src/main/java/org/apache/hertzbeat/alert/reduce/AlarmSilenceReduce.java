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
import org.apache.hertzbeat.alert.notice.DispatcherAlarm;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.cache.CommonCacheService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.stereotype.Service;

/**
 * silence alarm
 */
@Service
@RequiredArgsConstructor
public class AlarmSilenceReduce {

    private final AlertSilenceDao alertSilenceDao;
    private final DispatcherAlarm dispatcherAlarm;

    /**
     * alert silence filter data
     * @param alert alert
     * @return true when not filter
     */
    @SuppressWarnings("unchecked")
    public boolean filterSilence(Alert alert) {
        CommonCacheService<String, Object> silenceCache = CacheFactory.getAlertSilenceCache();
        List<AlertSilence> alertSilenceList = (List<AlertSilence>) silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE);
        if (alertSilenceList == null) {
            alertSilenceList = alertSilenceDao.findAll();
            silenceCache.put(CommonConstants.CACHE_ALERT_SILENCE, alertSilenceList);
        }
        for (AlertSilence alertSilence : alertSilenceList) {
            if (!alertSilence.isEnable()) {
                continue;
            }
            // if match the silence rule, return
            boolean match = alertSilence.isMatchAll();
            if (!match) {
                Map<String, String> labels = alertSilence.getLabels();
                if (alert.getTags() != null && !alert.getTags().isEmpty()) {
                    Map<String, String> alertTagMap = alert.getTags();
                    match = labels.entrySet().stream().anyMatch(item -> {
                        if (alertTagMap.containsKey(item.getKey())) {
                            String tagValue = alertTagMap.get(item.getKey());
                            if (tagValue == null && item.getValue() == null) {
                                return true;
                            } else {
                                return tagValue != null && tagValue.equals(item.getValue());
                            }
                        } else {
                            return false;
                        }
                    });
                } else {
                    match = true;
                }
            }
            if (match) {
                if (alertSilence.getType() == 0) {
                    // once time
                    return checkAndSave(LocalDateTime.now(), alertSilence);
                } else if (alertSilence.getType() == 1) {
                    // cyc time
                    int currentDayOfWeek = LocalDateTime.now().toLocalDate().getDayOfWeek().getValue();
                    if (alertSilence.getDays() != null && !alertSilence.getDays().isEmpty()) {
                        boolean dayMatch = alertSilence.getDays().stream().anyMatch(item -> item == currentDayOfWeek);
                        if (dayMatch) {
                            return checkAndSave(LocalDateTime.now(), alertSilence);
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * Check AlertSilence start and end match, to save alertSilence obj.
     * @param times         LocalDateTime.
     * @param alertSilence  {@link AlertSilence}
     * @return boolean
     */
    private boolean checkAndSave(LocalDateTime times, AlertSilence alertSilence) {

        boolean startMatch = alertSilence.getPeriodStart() == null || times.isAfter(alertSilence.getPeriodStart().toLocalDateTime());
        boolean endMatch = alertSilence.getPeriodEnd() == null || times.isBefore(alertSilence.getPeriodEnd().toLocalDateTime());

        if (startMatch && endMatch) {

            int time = Optional.ofNullable(alertSilence.getTimes()).orElse(0);
            alertSilence.setTimes(time + 1);
            alertSilenceDao.save(alertSilence);
            return false;
        }
        return true;
    }

    public void silenceAlarm(GroupAlert groupAlert) {
        CommonCacheService<String, Object> silenceCache = CacheFactory.getAlertSilenceCache();
        List<AlertSilence> alertSilenceList = (List<AlertSilence>) silenceCache.get(CommonConstants.CACHE_ALERT_SILENCE);
        if (alertSilenceList == null) {
            alertSilenceList = alertSilenceDao.findAll();
            silenceCache.put(CommonConstants.CACHE_ALERT_SILENCE, alertSilenceList);
        }
        for (AlertSilence alertSilence : alertSilenceList) {
            if (!alertSilence.isEnable()) {
                continue;
            }
            // if match the silence rule, return
            boolean match = alertSilence.isMatchAll();
            if (!match) {
                Map<String, String> labels = alertSilence.getLabels();
                if (groupAlert.getGroupLabels() != null && !groupAlert.getGroupLabels().isEmpty()) {
                    Map<String, String> alertLabels = groupAlert.getGroupLabels();
                    match = labels.entrySet().stream().anyMatch(item -> {
                        if (alertLabels.containsKey(item.getKey())) {
                            String tagValue = alertLabels.get(item.getKey());
                            if (tagValue == null && item.getValue() == null) {
                                return true;
                            } else {
                                return tagValue != null && tagValue.equals(item.getValue());
                            }
                        } else {
                            return false;
                        }
                    });
                } else {
                    match = true;
                }
            }
            if (match) {
                if (alertSilence.getType() == 0) {
                    // once time
                    if (checkAndSave(LocalDateTime.now(), alertSilence)) {
                        dispatcherAlarm.dispatchAlarm(groupAlert);
                    } else {
                        return;
                    }
                } else if (alertSilence.getType() == 1) {
                    // cyc time
                    int currentDayOfWeek = LocalDateTime.now().toLocalDate().getDayOfWeek().getValue();
                    if (alertSilence.getDays() != null && !alertSilence.getDays().isEmpty()) {
                        boolean dayMatch = alertSilence.getDays().stream().anyMatch(item -> item == currentDayOfWeek);
                        if (dayMatch && checkAndSave(LocalDateTime.now(), alertSilence)) {
                            dispatcherAlarm.dispatchAlarm(groupAlert);
                        } else {
                            return;
                        }
                    }
                }
            }
        }
        dispatcherAlarm.dispatchAlarm(groupAlert);
    }
}
