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

package org.apache.hertzbeat.manager.service.entity;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Reads monitor-linked alert evidence for observed entities.
 */
@Service
public class EntityAlertEvidenceReadModelService {

    private static final String ALERT_STATUS_ACKNOWLEDGED = "acknowledged";

    private final EntityAlertEvidenceQueryService entityAlertEvidenceQueryService;

    public EntityAlertEvidenceReadModelService(EntityAlertEvidenceQueryService entityAlertEvidenceQueryService) {
        this.entityAlertEvidenceQueryService = entityAlertEvidenceQueryService;
    }

    public List<SingleAlert> queryActiveAlerts(List<Monitor> monitors, int limit) {
        if (CollectionUtils.isEmpty(monitors)) {
            return Collections.emptyList();
        }
        return entityAlertEvidenceQueryService.findActiveAlerts(monitors, limit);
    }

    public List<SingleAlert> queryActiveAlerts(List<Monitor> monitors, int limit, String requestWorkspaceId) {
        if (CollectionUtils.isEmpty(monitors)) {
            return Collections.emptyList();
        }
        return entityAlertEvidenceQueryService.findActiveAlerts(monitors, limit, requestWorkspaceId);
    }

    public Page<SingleAlert> buildEntityAlertPage(List<Monitor> monitors, String status, String severity,
                                                  int pageIndex, int pageSize) {
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        if (CollectionUtils.isEmpty(monitors)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        String statusFilter = normalizeAlertStatusFilter(status);
        String severityFilter = normalizeAlertSeverityFilter(severity);
        List<SingleAlert> filteredAlerts = entityAlertEvidenceQueryService.findAlerts(monitors, statusFilter)
                .stream()
                .filter(alert -> severityFilter == null || severityFilter.equals(resolveAlertSeverity(alert)))
                .sorted(alertEvidenceSort())
                .toList();
        return slicePage(filteredAlerts, pageRequest);
    }

    public Page<SingleAlert> buildEntityAlertPage(List<Monitor> monitors, String status, String severity,
                                                  int pageIndex, int pageSize, String requestWorkspaceId) {
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "gmtUpdate"));
        if (CollectionUtils.isEmpty(monitors)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        String statusFilter = normalizeAlertStatusFilter(status);
        String severityFilter = normalizeAlertSeverityFilter(severity);
        List<SingleAlert> filteredAlerts = entityAlertEvidenceQueryService.findAlerts(
                        monitors, statusFilter, requestWorkspaceId)
                .stream()
                .filter(alert -> severityFilter == null || severityFilter.equals(resolveAlertSeverity(alert)))
                .sorted(alertEvidenceSort())
                .toList();
        return slicePage(filteredAlerts, pageRequest);
    }

    private Comparator<SingleAlert> alertEvidenceSort() {
        return Comparator
                .comparingInt((SingleAlert alert) -> severityPriority(resolveAlertSeverity(alert))).reversed()
                .thenComparing(SingleAlert::getGmtUpdate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(SingleAlert::getId, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private String normalizeAlertStatusFilter(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return CommonConstants.ALERT_STATUS_FIRING;
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (ALERT_STATUS_ACKNOWLEDGED.equals(lowered)) {
            return ALERT_STATUS_ACKNOWLEDGED;
        }
        if (CommonConstants.ALERT_STATUS_RESOLVED.equals(lowered)) {
            return CommonConstants.ALERT_STATUS_RESOLVED;
        }
        return CommonConstants.ALERT_STATUS_FIRING;
    }

    private String normalizeAlertSeverityFilter(String severity) {
        String normalized = trimToNull(severity);
        if (normalized == null || "all".equalsIgnoreCase(normalized)) {
            return null;
        }
        return switch (normalized.toLowerCase(Locale.ROOT)) {
            case "warn" -> "warning";
            case "err" -> "error";
            default -> normalized.toLowerCase(Locale.ROOT);
        };
    }

    private String resolveAlertSeverity(SingleAlert alert) {
        if (alert == null) {
            return "unknown";
        }
        String severity = defaultText(
                trimToNull(alert.getLabels() == null ? null : alert.getLabels().get("severity")),
                defaultText(
                        trimToNull(alert.getLabels() == null ? null : alert.getLabels().get("priority")),
                        trimToNull(alert.getAnnotations() == null ? null : alert.getAnnotations().get("severity"))
                )
        );
        return severity == null ? "unknown" : severity.toLowerCase(Locale.ROOT);
    }

    private int severityPriority(String severity) {
        String normalized = trimToNull(severity);
        if (normalized == null) {
            return 0;
        }
        return switch (normalized.toLowerCase(Locale.ROOT)) {
            case "critical", "fatal", "emergency", "severe" -> 5;
            case "error", "high" -> 4;
            case "warning", "warn", "medium" -> 3;
            case "info", "low" -> 2;
            case "debug", "trace" -> 1;
            default -> 0;
        };
    }

    private PageRequest normalizePageRequest(int pageIndex, int pageSize, Sort sort) {
        int safePageIndex = Math.max(pageIndex, 0);
        int safePageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        return PageRequest.of(safePageIndex, safePageSize, sort);
    }

    private <T> Page<T> slicePage(List<T> items, PageRequest pageRequest) {
        if (CollectionUtils.isEmpty(items)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        int start = Math.min((int) pageRequest.getOffset(), items.size());
        int end = Math.min(start + pageRequest.getPageSize(), items.size());
        return new PageImpl<>(items.subList(start, end), pageRequest, items.size());
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
