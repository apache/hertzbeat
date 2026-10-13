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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardPanelDraftEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardPanelDraftDao;
import org.apache.hertzbeat.manager.service.SignalDashboardPanelDraftService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signal dashboard panel draft service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class SignalDashboardPanelDraftServiceImpl implements SignalDashboardPanelDraftService {

    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 512;
    private static final int MAX_ROUTE_LENGTH = 2048;
    private static final int MAX_TEXT_LENGTH = 65535;
    private static final Map<String, String> SIGNAL_ROUTE_PREFIXES = Map.of(
            "logs", "/log/manage",
            "traces", "/trace/manage",
            "metrics", "/ingestion/otlp/metrics",
            "alerts", "/alert"
    );
    private static final Map<String, Set<String>> SIGNAL_VISUALIZATIONS = Map.of(
            "logs", Set.of("list", "time-series", "table"),
            "traces", Set.of("list", "trace", "time-series", "table"),
            "metrics", Set.of("graph", "time-series", "table"),
            "alerts", Set.of("list", "table")
    );

    private final SignalDashboardPanelDraftDao signalDashboardPanelDraftDao;

    @Override
    @Transactional(readOnly = true)
    public List<SignalDashboardPanelDraft> listSignalDashboardPanelDrafts(String creator, String signal) {
        String normalizedCreator = requireText(creator, "creator");
        String normalizedSignal = normalizeSignal(signal);
        return signalDashboardPanelDraftDao.findByCreatorAndSignalOrderByUpdateTimeDesc(normalizedCreator, normalizedSignal)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public SignalDashboardPanelDraft upsertSignalDashboardPanelDraft(String creator, SignalDashboardPanelDraft draft) {
        String normalizedCreator = requireText(creator, "creator");
        if (draft == null) {
            throw new IllegalArgumentException("Dashboard panel draft is required");
        }
        String normalizedSignal = normalizeSignal(draft.getSignal());
        String draftKey = normalizeDraftKey(draft.getDraftKey());
        String visualization = normalizeVisualization(normalizedSignal, draft.getVisualization());
        String route = normalizeRoute(normalizedSignal, draft.getRoute());
        LocalDateTime now = LocalDateTime.now();
        SignalDashboardPanelDraftEntity entity = signalDashboardPanelDraftDao
                .findByCreatorAndSignalAndDraftKey(normalizedCreator, normalizedSignal, draftKey)
                .orElseGet(() -> SignalDashboardPanelDraftEntity.builder()
                        .creator(normalizedCreator)
                        .signal(normalizedSignal)
                        .draftKey(draftKey)
                        .createTime(now)
                        .build());

        entity.setTitle(limit(requireText(draft.getTitle(), "title"), MAX_TITLE_LENGTH, "title"));
        entity.setDescription(limit(StringUtils.trimToEmpty(draft.getDescription()), MAX_DESCRIPTION_LENGTH, "description"));
        entity.setVisualization(visualization);
        entity.setRoute(route);
        entity.setQuerySnapshot(limitNullable(draft.getQuerySnapshot(), MAX_TEXT_LENGTH, "querySnapshot"));
        entity.setPayload(limitJsonNullable(draft.getPayload(), MAX_TEXT_LENGTH, "payload"));
        entity.setUpdateTime(now);
        return toDto(signalDashboardPanelDraftDao.save(entity));
    }

    @Override
    public void deleteSignalDashboardPanelDraft(String creator, String signal, String draftKey) {
        signalDashboardPanelDraftDao.deleteByCreatorAndSignalAndDraftKey(
                requireText(creator, "creator"),
                normalizeSignal(signal),
                normalizeDraftKey(draftKey)
        );
    }

    private String normalizeSignal(String signal) {
        String normalized = requireText(signal, "signal").toLowerCase(Locale.ROOT);
        if (!SIGNAL_ROUTE_PREFIXES.containsKey(normalized)) {
            throw new IllegalArgumentException("Unsupported signal: " + signal);
        }
        return normalized;
    }

    private String normalizeDraftKey(String draftKey) {
        String normalized = requireText(draftKey, "draftKey");
        if (!normalized.matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid dashboard panel draft key");
        }
        return normalized;
    }

    private String normalizeVisualization(String signal, String visualization) {
        String normalized = requireText(visualization, "visualization").toLowerCase(Locale.ROOT);
        if (!SIGNAL_VISUALIZATIONS.get(signal).contains(normalized)) {
            throw new IllegalArgumentException("Unsupported dashboard panel visualization: " + visualization);
        }
        return normalized;
    }

    private String normalizeRoute(String signal, String route) {
        String normalized = limit(requireText(route, "route"), MAX_ROUTE_LENGTH, "route");
        String expectedPrefix = SIGNAL_ROUTE_PREFIXES.get(signal);
        if (!normalized.equals(expectedPrefix) && !normalized.startsWith(expectedPrefix + "?")) {
            throw new IllegalArgumentException("Dashboard panel draft route does not match signal");
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
        String limited = limit(normalized, limit, field);
        if (!JsonUtil.isJsonStr(limited)) {
            throw new IllegalArgumentException(field + " must be valid JSON");
        }
        return limited;
    }

    private String limit(String value, int limit, String field) {
        if (value.length() > limit) {
            throw new IllegalArgumentException(field + " is too long");
        }
        return value;
    }

    private SignalDashboardPanelDraft toDto(SignalDashboardPanelDraftEntity entity) {
        return SignalDashboardPanelDraft.builder()
                .id(entity.getId())
                .signal(entity.getSignal())
                .draftKey(entity.getDraftKey())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .visualization(entity.getVisualization())
                .route(entity.getRoute())
                .querySnapshot(entity.getQuerySnapshot())
                .payload(entity.getPayload())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }
}
