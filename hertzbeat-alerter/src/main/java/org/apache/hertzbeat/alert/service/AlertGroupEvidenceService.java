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

package org.apache.hertzbeat.alert.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dto.AlertGroupEvidence;
import org.apache.hertzbeat.alert.dto.AlertGroupStatusEvidence;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Bounded canonical evidence query for persisted alert groups.
 */
@Service
public class AlertGroupEvidenceService {

    private static final int MAX_RAW_IDS = 100;
    private static final Set<String> SUPPORTED_STATUSES = Set.of(
            CommonConstants.ALERT_STATUS_FIRING,
            CommonConstants.ALERT_STATUS_PENDING,
            CommonConstants.ALERT_STATUS_ACKNOWLEDGED,
            CommonConstants.ALERT_STATUS_RESOLVED);

    private final GroupAlertDao groupAlertDao;

    public AlertGroupEvidenceService(GroupAlertDao groupAlertDao) {
        this.groupAlertDao = groupAlertDao;
    }

    @Transactional(readOnly = true)
    public AlertGroupEvidence getEvidence(List<String> ids) {
        List<Long> requestedIds = normalizeIds(ids);
        Map<Long, String> foundStatuses = new HashMap<>();
        for (AlertGroupStatusEvidence evidence : groupAlertDao.findStatusEvidenceByIdIn(requestedIds)) {
            requireSupportedStatus(evidence.status());
            if (evidence.id() == null || foundStatuses.putIfAbsent(evidence.id(), evidence.status()) != null) {
                throw new IllegalStateException();
            }
        }
        List<AlertGroupStatusEvidence> groups = requestedIds.stream()
                .filter(foundStatuses::containsKey)
                .map(id -> new AlertGroupStatusEvidence(id, foundStatuses.get(id)))
                .toList();
        List<Long> missingIds = requestedIds.stream()
                .filter(id -> !foundStatuses.containsKey(id))
                .toList();
        return new AlertGroupEvidence(groups, missingIds, System.currentTimeMillis());
    }

    private static List<Long> normalizeIds(List<String> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > MAX_RAW_IDS) {
            throw new AlertGroupEvidenceRequestException();
        }
        try {
            List<Long> normalizedIds = ids.stream()
                    .map(id -> {
                        if (!StringUtils.hasText(id)) {
                            throw new AlertGroupEvidenceRequestException();
                        }
                        return Long.parseLong(id.trim());
                    })
                    .toList();
            if (normalizedIds.stream().anyMatch(id -> id <= 0)) {
                throw new AlertGroupEvidenceRequestException();
            }
            return normalizedIds.stream().distinct().sorted().toList();
        } catch (NumberFormatException exception) {
            throw new AlertGroupEvidenceRequestException();
        }
    }

    private static void requireSupportedStatus(String status) {
        if (status == null || !SUPPORTED_STATUSES.contains(status)) {
            throw new AlertGroupStatusNotSupportedException();
        }
    }
}
