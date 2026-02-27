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

package org.apache.hertzbeat.alert.calculate;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertCollectorDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * handle collector alarm
 */
@Component
@Slf4j
public class CollectorAlertHandler {

    private static final String KEY_COLLECTOR_NAME = "collectorName";
    private static final String KEY_COLLECTOR_VERSION = "collectorVersion";
    private static final String KEY_COLLECTOR_HOST = "collectorHost";

    private final AlertCollectorDao alertCollectorDao;

    private final AlarmCommonReduce alarmCommonReduce;

    private final AlarmCacheManager alarmCacheManager;

    private ResourceBundle bundle;


    public CollectorAlertHandler(AlarmCommonReduce alarmCommonReduce, AlertCollectorDao alertCollectorDao,
                                 AlarmCacheManager alarmCacheManager) {
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertCollectorDao = alertCollectorDao;
        this.alarmCacheManager = alarmCacheManager;
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }

    /**
     * handle collector online
     *
     * @param identity collector name
     */
    public void online(final String identity) {
        Collector collector = alertCollectorDao.findCollectorByName(identity);
        if (collector == null) {
            return;
        }
        Map<String, String> fingerPrints = new HashMap<>(8);
        fingerPrints.put(KEY_COLLECTOR_NAME, collector.getName());
        fingerPrints.put(KEY_COLLECTOR_VERSION, collector.getVersion());
        fingerPrints.put(KEY_COLLECTOR_HOST, collector.getIp());
        String fingerprint = AlertUtil.calculateFingerprint(fingerPrints);
        SingleAlert firingAlert = alarmCacheManager.removeFiring(fingerprint);
        if (firingAlert != null) {
            firingAlert.setTriggerTimes(1);
            firingAlert.setEndAt(System.currentTimeMillis());
            firingAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
            firingAlert.setContent(this.bundle.getString("alerter.availability.collector.recover"));
            alarmCommonReduce.reduceAndSendAlarm(firingAlert.clone());
        }
    }


    /**
     * handle collector offline
     *
     * @param identity collector name
     */
    public void offline(final String identity) {
        Collector collector = alertCollectorDao.findCollectorByName(identity);
        if (collector == null) {
            return;
        }
        long currentTimeMill = System.currentTimeMillis();
        Map<String, String> fingerPrints = new HashMap<>(8);
        fingerPrints.put(KEY_COLLECTOR_NAME, collector.getName());
        fingerPrints.put(KEY_COLLECTOR_VERSION, collector.getVersion());
        fingerPrints.put(KEY_COLLECTOR_HOST, collector.getIp());
        String fingerprint = AlertUtil.calculateFingerprint(fingerPrints);
        SingleAlert existingAlert = alarmCacheManager.getFiring(fingerprint);
        if (existingAlert == null) {
            SingleAlert newAlert = SingleAlert.builder()
                    .labels(fingerPrints)
                    .annotations(fingerPrints)
                    .content(this.bundle.getString("alerter.availability.collector.offline"))
                    .status(CommonConstants.ALERT_STATUS_FIRING)
                    .triggerTimes(1)
                    .startAt(currentTimeMill)
                    .activeAt(currentTimeMill)
                    .build();
            alarmCacheManager.putFiring(fingerprint, newAlert);
            alarmCommonReduce.reduceAndSendAlarm(newAlert.clone());
        }

    }


    @EventListener(SystemConfigChangeEvent.class)
    public void onSystemConfigChangeEvent(SystemConfigChangeEvent event) {
        log.info("calculate alarm receive system config change event: {}.", event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }

}
