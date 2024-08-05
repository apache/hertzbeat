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

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.cache.CommonCacheService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.springframework.stereotype.Service;

/**
 * silence alarm
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AlarmSilenceReduce {

    private final AlertSilenceDao alertSilenceDao;

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
                List<TagItem> tags = alertSilence.getTags();
                if (alert.getTags() != null && !alert.getTags().isEmpty()) {
                    Map<String, String> alertTagMap = alert.getTags();
                    match = tags.stream().anyMatch(item -> {
                        if (alertTagMap.containsKey(item.getName())) {
                            String tagValue = alertTagMap.get(item.getName());
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
                if (match && alertSilence.getPriorities() != null && !alertSilence.getPriorities().isEmpty()) {
                    match = alertSilence.getPriorities().stream().anyMatch(item -> item != null && item == alert.getPriority());
                }
            }
            if (match) {
                ZonedDateTime nowDate = ZonedDateTime.now();
                if (alertSilence.getType() == 0) {
                    // once time
                    boolean startMatch = alertSilence.getPeriodStart() == null || nowDate.isAfter(alertSilence.getPeriodStart());
                    boolean endMatch = alertSilence.getPeriodEnd() == null || nowDate.isBefore(alertSilence.getPeriodEnd());
                    if (startMatch && endMatch) {
                        int times = Optional.ofNullable(alertSilence.getTimes()).orElse(0);
                        alertSilence.setTimes(times + 1);
                        alertSilenceDao.save(alertSilence);
                        return false;
                    }
                } else if (alertSilence.getType() == 1) {
                    // cyc time
                    int currentDayOfWeek = nowDate.toLocalDate().getDayOfWeek().getValue();
                    if (alertSilence.getDays() != null && !alertSilence.getDays().isEmpty()) {
                        boolean dayMatch = alertSilence.getDays().stream().anyMatch(item -> item == currentDayOfWeek);
                        if (dayMatch) {
                            if (alertSilence.getPeriodStart() == null || alertSilence.getPeriodEnd() == null) {
                                continue;
                            }
                            LocalTime silentStart = alertSilence.getPeriodStart().toLocalTime();
                            LocalTime silentEnd = alertSilence.getPeriodEnd().toLocalTime();
                            // 判断是否为静默时间段
                            if (isSilentPeriod(silentStart, silentEnd)) {
                                int times = Optional.ofNullable(alertSilence.getTimes()).orElse(0);
                                alertSilence.setTimes(times + 1);
                                alertSilenceDao.save(alertSilence);
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * 是否为静默时间段
     *
     * @param silentStart 静默开始时间
     * @param silentEnd 静默结束时间
     * @return 是/否
     */
    private boolean isSilentPeriod(LocalTime silentStart, LocalTime silentEnd) {
        if (null == silentStart || null == silentEnd) {
            return false;
        }
        LocalTime nowLocalTime = ZonedDateTime.now().toLocalTime();
        log.info("nowLocalTime:{}, silentStart:{}, silentEnd:{}, SystemDefaultTimeZoneId:{}", nowLocalTime, silentStart, silentEnd, ZoneId.systemDefault());
        // 如果静默结束时间小于静默开始时间，意味着静默期跨越了午夜
        if (silentEnd.isBefore(silentStart)) {
            // 当前时间在午夜之前且大于等于静默开始时间，或者在午夜之后且小于静默结束时间
            return nowLocalTime.isAfter(silentStart) || nowLocalTime.isBefore(silentEnd);
        } else {
            // 当前时间在静默开始和结束时间之间
            return nowLocalTime.isAfter(silentStart) && nowLocalTime.isBefore(silentEnd);
        }
    }
}
