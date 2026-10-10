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
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * alert cache manager
 */
@Component
public class AlarmCacheManager {

    private static final String CUSTOM_FIRING_ROW_KEY = "CUSTOM_FIRING_";

    /**
     * The alarm in the process is triggered
     * rowKey - define id
     * columnKey - labels fingerprint
     */
    private final Table<String, String, SingleAlert> pendingAlertMap;

    /**
     * The not recover alert
     * rowKey - define id
     * columnKey - labels fingerprint
     */
    private final Table<String, String, SingleAlert> firingAlertMap;

    public AlarmCacheManager(SingleAlertDao singleAlertDao) {
        this.pendingAlertMap = Tables.newCustomTable(new ConcurrentHashMap<>(8), ConcurrentHashMap::new);
        this.firingAlertMap = Tables.newCustomTable(new ConcurrentHashMap<>(8), ConcurrentHashMap::new);
        List<SingleAlert> singleAlerts = singleAlertDao.querySingleAlertsByWorkspaceIdAndStatus(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID, CommonConstants.ALERT_STATUS_FIRING);
        for (SingleAlert singleAlert : singleAlerts) {
            String fingerprint = AlertUtil.calculateFingerprint(singleAlert.getLabels());
            String defineId = singleAlert.getLabels().get(CommonConstants.LABEL_DEFINE_ID);
            if (StringUtils.isBlank(defineId)) {
                defineId = CUSTOM_FIRING_ROW_KEY + fingerprint;
            }
            singleAlert.setId(null);
            this.firingAlertMap.put(scopedDefineKey(singleAlert.getWorkspaceId(), defineId), fingerprint, singleAlert);
        }
    }

    public void putPending(Long defineId, String fingerPrint, SingleAlert alert) {
        this.pendingAlertMap.put(scopedDefineKey(alert.getWorkspaceId(), String.valueOf(defineId)), fingerPrint, alert);
    }

    public SingleAlert getPending(Long defineId, String fingerPrint) {
        return getPending(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId, fingerPrint);
    }

    public SingleAlert getPending(String workspaceId, Long defineId, String fingerPrint) {
        return this.pendingAlertMap.get(scopedDefineKey(workspaceId, String.valueOf(defineId)), fingerPrint);
    }

    public void removePending(Long defineId, String fingerPrint) {
        removePending(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId, fingerPrint);
    }

    public void removePending(String workspaceId, Long defineId, String fingerPrint) {
        this.pendingAlertMap.remove(scopedDefineKey(workspaceId, String.valueOf(defineId)), fingerPrint);
    }

    public Map<String, SingleAlert> getPendingAlerts(Long defineId) {
        return getPendingAlerts(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId);
    }

    public Map<String, SingleAlert> getPendingAlerts(String workspaceId, Long defineId) {
        return new HashMap<>(this.pendingAlertMap.row(scopedDefineKey(workspaceId, String.valueOf(defineId))));
    }

    public void putFiring(Long defineId, String fingerPrint, SingleAlert alert) {
        this.firingAlertMap.put(scopedDefineKey(alert.getWorkspaceId(), String.valueOf(defineId)), fingerPrint, alert);
    }

    public Map<String, SingleAlert> getFiringAlerts(Long defineId) {
        return getFiringAlerts(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId);
    }

    public Map<String, SingleAlert> getFiringAlerts(String workspaceId, Long defineId) {
        return new HashMap<>(this.firingAlertMap.row(scopedDefineKey(workspaceId, String.valueOf(defineId))));
    }

    public void putFiring(String fingerPrint, SingleAlert alert) {
        this.firingAlertMap.put(getCustomKey(alert.getWorkspaceId(), fingerPrint), fingerPrint, alert);
    }

    public SingleAlert getFiring(Long defineId, String fingerPrint) {
        return getFiring(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId, fingerPrint);
    }

    public SingleAlert getFiring(String workspaceId, Long defineId, String fingerPrint) {
        SingleAlert singleAlert = this.firingAlertMap.get(scopedDefineKey(workspaceId, String.valueOf(defineId)),
                fingerPrint);
        if (null != singleAlert) {
            return singleAlert;
        }
        return getFiring(workspaceId, fingerPrint);
    }

    public SingleAlert removeFiring(Long defineId, String fingerPrint) {
        return removeFiring(AuthTokenScopes.DEFAULT_WORKSPACE_ID, defineId, fingerPrint);
    }

    public SingleAlert removeFiring(String workspaceId, Long defineId, String fingerPrint) {
        SingleAlert singleAlert = this.firingAlertMap.remove(scopedDefineKey(workspaceId, String.valueOf(defineId)),
                fingerPrint);
        if (null == singleAlert) {
            return this.firingAlertMap.remove(getCustomKey(workspaceId, fingerPrint), fingerPrint);
        }
        return singleAlert;
    }

    public SingleAlert getFiring(String fingerPrint) {
        return getFiring(AuthTokenScopes.DEFAULT_WORKSPACE_ID, fingerPrint);
    }

    public SingleAlert getFiring(String workspaceId, String fingerPrint) {
        return this.firingAlertMap.get(getCustomKey(workspaceId, fingerPrint), fingerPrint);
    }

    private String getCustomKey(String workspaceId, String fingerPrint) {
        return scopedDefineKey(workspaceId, CUSTOM_FIRING_ROW_KEY + fingerPrint);
    }


    public SingleAlert removeFiring(String fingerPrint) {
        return removeFiring(AuthTokenScopes.DEFAULT_WORKSPACE_ID, fingerPrint);
    }

    public SingleAlert removeFiring(String workspaceId, String fingerPrint) {
        return this.firingAlertMap.remove(getCustomKey(workspaceId, fingerPrint), fingerPrint);
    }

    private static String scopedDefineKey(String workspaceId, String defineId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new IllegalArgumentException("workspace_required");
        }
        return workspaceId + '\0' + defineId;
    }
}
