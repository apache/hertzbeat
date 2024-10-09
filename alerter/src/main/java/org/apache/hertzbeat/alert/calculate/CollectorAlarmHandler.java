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

import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.AlertCollectorDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.event.CollectorDeletedEvent;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.context.event.EventListener;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_CODE_PENDING;

/**
 * handle collector alarm
 */
@Component
@Slf4j
public class CollectorAlarmHandler {

    private final Map<String, Alert> offlineAlertMap;

    private final AlertService alertService;

    private final AlertCollectorDao alertCollectorDao;

    private final AlarmCommonReduce alarmCommonReduce;

    private final AlerterWorkerPool workerPool;

    private ResourceBundle bundle;

    public CollectorAlarmHandler(AlarmCommonReduce alarmCommonReduce, AlertService alertService, AlertCollectorDao alertCollectorDao,
                                 AlerterWorkerPool workerPool) {
        this.offlineAlertMap = new ConcurrentHashMap<>(16);
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertService = alertService;
        this.alertCollectorDao = alertCollectorDao;
        this.workerPool = workerPool;
        this.bundle = ResourceBundleUtil.getBundle("alerter");
        List<Collector> collectors = this.alertCollectorDao.findCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE);
        if (!CollectionUtils.isEmpty(collectors)) {
            for (Collector collector : collectors) {
                Map<String, String> tags = new HashMap<>(8);
                tags.put(CommonConstants.TAG_COLLECTOR_ID, String.valueOf(collector.getId()));
                tags.put(CommonConstants.TAG_COLLECTOR_NAME, collector.getName());
                this.offlineAlertMap.put(collector.getName(),
                        Alert.builder().tags(tags).target(CommonConstants.AVAILABILITY).status(ALERT_STATUS_CODE_PENDING).build());
            }
        }
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
        long currentTimeMill = System.currentTimeMillis();
        Alert preAlert = offlineAlertMap.remove(identity);
        if (preAlert != null) {
            Map<String, String> tags = preAlert.getTags();
            tags.put(CommonConstants.TAG_COLLECTOR_HOST, collector.getIp());
            tags.put(CommonConstants.TAG_COLLECTOR_VERSION, collector.getVersion());
            String content = this.bundle.getString("alerter.availability.collector.recover");
            Alert resumeAlert = Alert.builder()
                    .tags(tags)
                    .target(CommonConstants.AVAILABILITY_COLLECTOR)
                    .content(content)
                    .priority(CommonConstants.ALERT_PRIORITY_CODE_WARNING)
                    .status(CommonConstants.ALERT_STATUS_CODE_RESTORED)
                    .firstAlarmTime(currentTimeMill)
                    .lastAlarmTime(preAlert.getLastAlarmTime())
                    .build();
            workerPool.executeJob(() -> recoverAlarm(identity, resumeAlert));
        }
    }

    private void recoverAlarm(String identity, Alert restoreAlert) {
        List<Long> alertIds = queryAvailabilityAlerts(identity, restoreAlert)
                .stream()
                .filter(alert -> Objects.equals(alert.getTags().get(CommonConstants.TAG_COLLECTOR_NAME), identity))
                .map(Alert::getId)
                .toList();

        if (!alertIds.isEmpty()) {
            alertService.editAlertStatus(CommonConstants.ALERT_STATUS_CODE_SOLVED, alertIds);

            // Recovery notifications are generated only after an alarm has occurred
            alarmCommonReduce.reduceAndSendAlarm(restoreAlert);
        }
    }

    private List<Alert> queryAvailabilityAlerts(String identity, Alert restoreAlert) {
        //create query condition
        Specification<Alert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();

            Predicate predicateTags = criteriaBuilder.like(root.get("tags").as(String.class), "%" + identity + "%");
            andList.add(predicateTags);

            Predicate predicatePriority = criteriaBuilder.equal(root.get("priority"), CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY);
            andList.add(predicatePriority);

            Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), ALERT_STATUS_CODE_PENDING);
            andList.add(predicateStatus);

            Predicate predicateAlertTime = criteriaBuilder.lessThanOrEqualTo(root.get("lastAlarmTime"), restoreAlert.getLastAlarmTime());
            andList.add(predicateAlertTime);

            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };

        //query results
        return alertService.getAlerts(specification);
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

        Alert preAlert = offlineAlertMap.get(identity);
        if (preAlert == null) {
            Map<String, String> tags = new HashMap<>();
            tags.put(CommonConstants.TAG_COLLECTOR_ID, String.valueOf(collector.getId()));
            tags.put(CommonConstants.TAG_COLLECTOR_NAME, collector.getName());
            tags.put(CommonConstants.TAG_COLLECTOR_HOST, collector.getIp());
            tags.put(CommonConstants.TAG_COLLECTOR_VERSION, collector.getVersion());
            tags.put(CommonConstants.TAG_CODE, "OFFLINE");

            String content =  this.bundle.getString("alerter.availability.collector.offline");
            Alert alert = Alert.builder()
                    .tags(tags)
                    .priority(CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY)
                    .status(CommonConstants.ALERT_STATUS_CODE_PENDING)
                    .target(CommonConstants.AVAILABILITY_COLLECTOR)
                    .content(content)
                    .firstAlarmTime(currentTimeMill)
                    .lastAlarmTime(currentTimeMill)
                    .times(1)
                    .build();
            this.offlineAlertMap.put(identity, alert);
            alarmCommonReduce.reduceAndSendAlarm(alert);
        }
    }


    @EventListener(SystemConfigChangeEvent.class)
    public void onSystemConfigChangeEvent(SystemConfigChangeEvent event) {
        log.info("calculate alarm receive system config change event: {}.", event.getSource());
        this.bundle = ResourceBundleUtil.getBundle("alerter");
    }

    @EventListener(CollectorDeletedEvent.class)
    public void onCollectorDeletedEvent(CollectorDeletedEvent event) {
        log.info("collector alarm handler receive collector {} has been deleted.", event.getIdentity());
        offlineAlertMap.remove(event.getIdentity());
    }
}
