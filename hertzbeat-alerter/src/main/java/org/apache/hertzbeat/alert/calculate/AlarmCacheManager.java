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

import com.google.common.collect.Table;
import com.google.common.collect.Tables;
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

    private static final String HISTORICAL_FIRING_ROW_KEY = "HISTORICAL_";

    /**
     * The alarm in the process is triggered
     * key - labels fingerprint
     */
    private final Table<String, String, SingleAlert> pendingAlertMap;

    /**
     * The not recover alert
     * key - labels fingerprint
     */
    private final Table<String, String, SingleAlert> firingAlertMap;

    public AlarmCacheManager(SingleAlertDao singleAlertDao) {
        this.pendingAlertMap = Tables.newCustomTable(new ConcurrentHashMap<>(8), ConcurrentHashMap::new);
        this.firingAlertMap = Tables.newCustomTable(new ConcurrentHashMap<>(8), ConcurrentHashMap::new);
        List<SingleAlert> singleAlerts = singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING);
        for (SingleAlert singleAlert : singleAlerts) {
            String fingerprint = AlertUtil.calculateFingerprint(singleAlert.getLabels());
            String rowKey = singleAlert.getDefineId() == null
                    ? getHistoricalKey(fingerprint) : String.valueOf(singleAlert.getDefineId());
            singleAlert.setId(null);
            this.firingAlertMap.put(rowKey, fingerprint, singleAlert);
        }
    }

    public void putPending(Long defineId, String fingerPrint, SingleAlert alert) {
        this.pendingAlertMap.put(String.valueOf(defineId), fingerPrint, alert);
    }

    public SingleAlert getPending(Long defineId, String fingerPrint) {
        return this.pendingAlertMap.get(String.valueOf(defineId), fingerPrint);
    }

    public void removePending(Long defineId, String fingerPrint) {
        this.pendingAlertMap.remove(String.valueOf(defineId), fingerPrint);
    }

    public void putFiring(Long defineId, String fingerPrint, SingleAlert alert) {
        this.firingAlertMap.put(String.valueOf(defineId), fingerPrint, alert);
    }

    public SingleAlert getFiring(Long defineId, String fingerPrint) {
        SingleAlert singleAlert = this.firingAlertMap.get(String.valueOf(defineId), fingerPrint);
        if (null != singleAlert) {
            return singleAlert;
        }
        String historicalKey = getHistoricalKey(fingerPrint);
        return this.firingAlertMap.get(historicalKey, fingerPrint);
    }

    public SingleAlert removeFiring(Long defineId, String fingerPrint) {
        SingleAlert singleAlert = this.firingAlertMap.remove(String.valueOf(defineId), fingerPrint);
        if (null == singleAlert) {
            String historicalKey = getHistoricalKey(fingerPrint);
            SingleAlert historicalAlert = this.firingAlertMap.get(historicalKey, fingerPrint);
            if (null != historicalAlert) {
                return this.firingAlertMap.remove(historicalKey, fingerPrint);
            }
        }
        return singleAlert;
    }

    private String getHistoricalKey(String fingerPrint) {
        return HISTORICAL_FIRING_ROW_KEY + fingerPrint;
    }
}
