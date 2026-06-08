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

package org.apache.hertzbeat.manager.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signal dashboard service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class SignalDashboardServiceImpl implements SignalDashboardService {

    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 512;
    private static final int MAX_TAGS_LENGTH = 512;
    private static final int MAX_VERSION_LENGTH = 32;
    private static final int MAX_TEXT_LENGTH = 65535;

    private final SignalDashboardDao signalDashboardDao;

    @Override
    @Transactional(readOnly = true)
    public List<SignalDashboard> listSignalDashboards(String creator) {
        requireText(creator, "creator");
        return signalDashboardDao.findAllByOrderByUpdateTimeDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public SignalDashboard upsertSignalDashboard(String creator, SignalDashboard dashboard) {
        String normalizedCreator = requireText(creator, "creator");
        if (dashboard == null) {
            throw new IllegalArgumentException("Signal dashboard is required");
        }
        String dashboardKey = normalizeDashboardKey(dashboard.getDashboardKey());
        LocalDateTime now = LocalDateTime.now();
        SignalDashboardEntity entity = signalDashboardDao
                .findByDashboardKey(dashboardKey)
                .orElseGet(() -> SignalDashboardEntity.builder()
                        .creator(normalizedCreator)
                        .dashboardKey(dashboardKey)
                        .createTime(now)
                        .build());

        entity.setTitle(limit(requireText(dashboard.getTitle(), "title"), MAX_TITLE_LENGTH, "title"));
        entity.setDescription(limit(StringUtils.trimToEmpty(dashboard.getDescription()),
                MAX_DESCRIPTION_LENGTH, "description"));
        entity.setTags(limit(StringUtils.trimToEmpty(dashboard.getTags()), MAX_TAGS_LENGTH, "tags"));
        entity.setLayout(limitJson(requireText(dashboard.getLayout(), "layout"), MAX_TEXT_LENGTH, "layout"));
        entity.setWidgets(limitJson(requireText(dashboard.getWidgets(), "widgets"), MAX_TEXT_LENGTH, "widgets"));
        entity.setVariables(limitJsonNullable(dashboard.getVariables(), MAX_TEXT_LENGTH, "variables"));
        entity.setPanelMap(limitJsonNullable(dashboard.getPanelMap(), MAX_TEXT_LENGTH, "panelMap"));
        entity.setVersion(limit(StringUtils.defaultIfBlank(dashboard.getVersion(), "v1"),
                MAX_VERSION_LENGTH, "version"));
        entity.setUpdateTime(now);
        return toDto(signalDashboardDao.save(entity));
    }

    @Override
    public void deleteSignalDashboard(String creator, String dashboardKey) {
        requireText(creator, "creator");
        signalDashboardDao.deleteByDashboardKey(normalizeDashboardKey(dashboardKey));
    }

    private String normalizeDashboardKey(String dashboardKey) {
        String normalized = requireText(dashboardKey, "dashboardKey");
        if (!normalized.matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid signal dashboard key");
        }
        return normalized;
    }

    private String requireText(String value, String field) {
        String normalized = StringUtils.trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException(field + " is required");
        }
        return normalized;
    }

    private String limitNullable(String value, int limit, String field) {
        if (value == null) {
            return null;
        }
        return limit(value, limit, field);
    }

    private String limitJsonNullable(String value, int limit, String field) {
        String normalized = StringUtils.trimToNull(value);
        if (normalized == null) {
            return null;
        }
        return limitJson(normalized, limit, field);
    }

    private String limitJson(String value, int limit, String field) {
        String normalized = limit(value, limit, field);
        if (!JsonUtil.isJsonStr(normalized)) {
            throw new IllegalArgumentException(field + " must be valid JSON");
        }
        return normalized;
    }

    private String limit(String value, int limit, String field) {
        if (value.length() > limit) {
            throw new IllegalArgumentException(field + " is too long");
        }
        return value;
    }

    private SignalDashboard toDto(SignalDashboardEntity entity) {
        return SignalDashboard.builder()
                .id(entity.getId())
                .dashboardKey(entity.getDashboardKey())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .tags(entity.getTags())
                .layout(entity.getLayout())
                .widgets(entity.getWidgets())
                .variables(entity.getVariables())
                .panelMap(entity.getPanelMap())
                .version(entity.getVersion())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }
}
