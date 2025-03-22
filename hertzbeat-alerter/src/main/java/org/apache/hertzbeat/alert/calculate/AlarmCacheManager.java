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

import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * alert cache manager
 */
@Component
public class AlarmCacheManager {

    /**
     * The alarm in the process is triggered
     * key - labels fingerprint
     */
    private final Map<String, SingleAlert> pendingAlertMap;
    /**
     * The not recover alert
     * key - labels fingerprint
     */
    private final Map<String, SingleAlert> firingAlertMap;

    public AlarmCacheManager(SingleAlertDao singleAlertDao) {
        this.pendingAlertMap = new ConcurrentHashMap<>(8);
        this.firingAlertMap = new ConcurrentHashMap<>(8);
        List<SingleAlert> singleAlerts = singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        for (SingleAlert singleAlert : singleAlerts) {
            String fingerprint = AlertUtil.calculateFingerprint(singleAlert.getLabels());
            singleAlert.setId(null);
            this.firingAlertMap.put(fingerprint, singleAlert);
        }
    }

    public void putPending(String fingerPrint, SingleAlert alert) {
        this.pendingAlertMap.put(fingerPrint, alert);
    }

    public SingleAlert getPending(String fingerPrint) {
        return this.pendingAlertMap.get(fingerPrint);
    }

    public SingleAlert removePending(String fingerPrint) {
        return this.pendingAlertMap.remove(fingerPrint);
    }

    public void putFiring(String fingerPrint, SingleAlert alert) {
        this.firingAlertMap.put(fingerPrint, alert);
    }

    public SingleAlert getFiring(String fingerPrint) {
        return this.firingAlertMap.get(fingerPrint);
    }

    public SingleAlert removeFiring(String fingerPrint) {
        return this.firingAlertMap.remove(fingerPrint);
    }
}
