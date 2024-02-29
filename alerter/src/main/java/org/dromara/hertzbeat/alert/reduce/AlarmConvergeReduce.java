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

import org.dromara.hertzbeat.alert.dao.AlertConvergeDao;
import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.CommonCacheService;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * alarm converge
 *
 * @author tom
 */
@Service
public class AlarmConvergeReduce {

    private final AlertConvergeDao alertConvergeDao;

    private final Map<Integer, Alert> converageAlertMap;

    public AlarmConvergeReduce(AlertConvergeDao alertConvergeDao) {
        this.alertConvergeDao = alertConvergeDao;
        this.converageAlertMap = new ConcurrentHashMap<>(16);
    }

    /**
     * currentAlert converge filter data
     *
     * @param currentAlert currentAlert
     * @return true when not filter
     */
    @SuppressWarnings("unchecked")
    public boolean filterConverge(Alert currentAlert) {
        // ignore monitor status auto recover notice
        if (currentAlert.getTags() != null && currentAlert.getTags().containsKey(CommonConstants.IGNORE)) {
            return true;
        }
        if (currentAlert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
            // restored alert
            int alertHash = Objects.hash(CommonConstants.ALERT_PRIORITY_CODE_CRITICAL)
                    + Arrays.hashCode(currentAlert.getTags().keySet().toArray(new String[0]))
                    + Arrays.hashCode(currentAlert.getTags().values().toArray(new String[0]));
            converageAlertMap.remove(alertHash);
            alertHash = Objects.hash(CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY)
                    + Arrays.hashCode(currentAlert.getTags().keySet().toArray(new String[0]))
                    + Arrays.hashCode(currentAlert.getTags().values().toArray(new String[0]));
            converageAlertMap.remove(alertHash);
            alertHash = Objects.hash(CommonConstants.ALERT_PRIORITY_CODE_WARNING)
                    + Arrays.hashCode(currentAlert.getTags().keySet().toArray(new String[0]))
                    + Arrays.hashCode(currentAlert.getTags().values().toArray(new String[0]));
            converageAlertMap.remove(alertHash);
            return true;
        }
        CommonCacheService<String, Object> convergeCache = CacheFactory.getAlertConvergeCache();
        List<AlertConverge> alertConvergeList = (List<AlertConverge>) convergeCache.get(CommonConstants.CACHE_ALERT_CONVERGE);
        if (alertConvergeList == null) {
            alertConvergeList = alertConvergeDao.findAll();
            // matchAll is in the last
            alertConvergeList.sort((item1, item2) -> {
                if (item1.isMatchAll()) {
                    return 1;
                } else if (item2.isMatchAll()) {
                    return -1;
                } else {
                    return 0;
                }
            });
            convergeCache.put(CommonConstants.CACHE_ALERT_CONVERGE, alertConvergeList);
        }
        for (AlertConverge alertConverge : alertConvergeList) {
            if (!alertConverge.isEnable()) {
                continue;
            }
            boolean match = alertConverge.isMatchAll();
            if (!match) {
                List<TagItem> tags = alertConverge.getTags();
                if (currentAlert.getTags() != null && !currentAlert.getTags().isEmpty()) {
                    Map<String, String> alertTagMap = currentAlert.getTags();
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
                if (match && alertConverge.getPriorities() != null && !alertConverge.getPriorities().isEmpty()) {
                    match = alertConverge.getPriorities().stream().anyMatch(item -> item != null && item == currentAlert.getPriority());
                }
            }
            if (match) {
                long evalInterval = alertConverge.getEvalInterval() * 1000;
                long now = System.currentTimeMillis();
                if (evalInterval <= 0) {
                    return true;
                }
                int alertHash = Objects.hash(currentAlert.getPriority())
                        + Arrays.hashCode(currentAlert.getTags().keySet().toArray(new String[0]))
                        + Arrays.hashCode(currentAlert.getTags().values().toArray(new String[0]));
                Alert preAlert = converageAlertMap.get(alertHash);
                if (preAlert == null) {
                    currentAlert.setTimes(1);
                    currentAlert.setFirstAlarmTime(now);
                    currentAlert.setLastAlarmTime(now);
                    converageAlertMap.put(alertHash, currentAlert.clone());
                    return true;
                } else {
                    if (now - preAlert.getFirstAlarmTime() < evalInterval) {
                        preAlert.setTimes(preAlert.getTimes() + 1);
                        preAlert.setLastAlarmTime(now);
                        return false;
                    } else {
                        currentAlert.setTimes(preAlert.getTimes());
                        if (preAlert.getTimes() == 1) {
                            currentAlert.setFirstAlarmTime(now);
                        } else {
                            currentAlert.setFirstAlarmTime(preAlert.getFirstAlarmTime());
                        }
                        currentAlert.setLastAlarmTime(now);
                        preAlert.setFirstAlarmTime(now);
                        preAlert.setLastAlarmTime(now);
                        preAlert.setTimes(1);
                        return true;
                    }
                }
            }
        }
        return true;
    }
}
