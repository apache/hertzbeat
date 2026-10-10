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
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Shapes bound monitor evidence for entity read APIs.
 */
@Service
public class EntityMonitorEvidenceReadModelService {

    public Page<MonitorInfo> buildEntityMonitorPage(List<Monitor> monitors, Byte status, String app,
                                                    int pageIndex, int pageSize) {
        PageRequest pageRequest = normalizePageRequest(pageIndex, pageSize);
        if (CollectionUtils.isEmpty(monitors)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        List<MonitorInfo> filteredMonitors = monitors.stream()
                .filter(Objects::nonNull)
                .filter(monitor -> status == null || monitor.getStatus() == status)
                .filter(monitor -> !StringUtils.hasText(app) || app.trim().equalsIgnoreCase(monitor.getApp()))
                .sorted(Comparator
                        .comparingInt((Monitor monitor) -> monitorStatusPriority(monitor.getStatus())).reversed()
                        .thenComparing(Monitor::getGmtUpdate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Monitor::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(MonitorInfo::fromEntity)
                .toList();
        return slicePage(filteredMonitors, pageRequest);
    }

    private int monitorStatusPriority(Byte status) {
        if (Objects.equals(status, CommonConstants.MONITOR_DOWN_CODE)) {
            return 3;
        }
        if (Objects.equals(status, CommonConstants.MONITOR_UP_CODE)) {
            return 2;
        }
        if (Objects.equals(status, CommonConstants.MONITOR_PAUSED_CODE)) {
            return 1;
        }
        return 0;
    }

    private PageRequest normalizePageRequest(int pageIndex, int pageSize) {
        int safePageIndex = Math.max(pageIndex, 0);
        int safePageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        return PageRequest.of(safePageIndex, safePageSize, Sort.unsorted());
    }

    private <T> Page<T> slicePage(List<T> items, PageRequest pageRequest) {
        if (CollectionUtils.isEmpty(items)) {
            return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
        }
        int start = Math.min((int) pageRequest.getOffset(), items.size());
        int end = Math.min(start + pageRequest.getPageSize(), items.size());
        return new PageImpl<>(items.subList(start, end), pageRequest, items.size());
    }
}
