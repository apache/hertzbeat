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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

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
    private final PersesDashboardDocumentValidator documentValidator;

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
        boolean documentMode = dashboard.getDocument() != null;
        if (documentMode) {
            documentValidator.validate(dashboardKey, dashboard.getDocument());
            if (!PersesDashboardDocumentValidator.VERSION.equals(dashboard.getVersion())) {
                throw new IllegalArgumentException("signal_dashboard_document_version_invalid");
            }
        }
        String title = documentMode ? documentValidator.title(dashboard.getDocument())
                : limit(requireText(dashboard.getTitle(), "title"), MAX_TITLE_LENGTH, "title");
        String description = documentMode ? documentValidator.description(dashboard.getDocument())
                : limit(StringUtils.trimToEmpty(dashboard.getDescription()), MAX_DESCRIPTION_LENGTH, "description");
        String tags = documentMode ? documentValidator.tags(dashboard.getDocument())
                : limit(StringUtils.trimToEmpty(dashboard.getTags()), MAX_TAGS_LENGTH, "tags");
        String layout = documentMode ? null : limitJson(requireText(dashboard.getLayout(), "layout"), MAX_TEXT_LENGTH, "layout");
        String widgets = documentMode ? null : limitJson(requireText(dashboard.getWidgets(), "widgets"), MAX_TEXT_LENGTH, "widgets");
        String variables = documentMode ? null : limitJsonNullable(dashboard.getVariables(), MAX_TEXT_LENGTH, "variables");
        String panelMap = documentMode ? null : limitJsonNullable(dashboard.getPanelMap(), MAX_TEXT_LENGTH, "panelMap");
        String version = documentMode ? PersesDashboardDocumentValidator.VERSION
                : limit(StringUtils.defaultIfBlank(dashboard.getVersion(), "v1"), MAX_VERSION_LENGTH, "version");
        if (documentMode) {
            consistentMetadata(dashboard.getTitle(), title);
            consistentMetadata(dashboard.getDescription(), description);
            consistentMetadata(dashboard.getTags(), tags);
            if (dashboard.getLayout() != null || dashboard.getWidgets() != null
                    || dashboard.getVariables() != null || dashboard.getPanelMap() != null) {
                throw new IllegalArgumentException("signal_dashboard_document_has_legacy_fields");
            }
        }
        SignalDashboardEntity entity = signalDashboardDao.findByDashboardKey(dashboardKey).orElse(null);
        checkRevision(entity, dashboard.getRevision());
        boolean create = entity == null;
        if (create) {
            if (!documentMode) {
                throw new IllegalArgumentException("signal_dashboard_document_required");
            }
            entity = SignalDashboardEntity.builder().creator(normalizedCreator).dashboardKey(dashboardKey)
                    .createTime(LocalDateTime.now()).build();
        } else if (documentMode && entity.getDocument() == null) {
            if (!emptyLegacy(entity) || !Objects.equals(title, entity.getTitle())
                    || !Objects.equals(description, StringUtils.defaultString(entity.getDescription()))
                    || !Objects.equals(tags, StringUtils.defaultString(entity.getTags()))
                    || !legacyTagsMatch(entity.getTags(), dashboard.getDocument())
                    || !exactEmptyConversion(entity, dashboard.getDocument())) {
                throw new IllegalArgumentException("signal_dashboard_legacy_conversion_unsupported");
            }
        } else if (!documentMode && entity.getDocument() != null) {
            throw new IllegalArgumentException("signal_dashboard_legacy_write_blocked");
        }
        entity.setTitle(title);
        entity.setDescription(description);
        entity.setTags(tags);
        if (documentMode) {
            entity.setDocument(dashboard.getDocument().toString());
            if (create) {
                entity.setLayout("[]");
                entity.setWidgets("[]");
            }
        } else {
            entity.setLayout(layout);
            entity.setWidgets(widgets);
            entity.setVariables(variables);
            entity.setPanelMap(panelMap);
        }
        entity.setVersion(version);
        entity.setUpdateTime(LocalDateTime.now());
        return toDto(signalDashboardDao.saveAndFlush(entity));
    }

    @Override
    public void deleteSignalDashboard(String creator, String dashboardKey, long revision) {
        requireText(creator, "creator");
        if (revision < 0) {
            throw new IllegalArgumentException("signal_dashboard_revision_invalid");
        }
        SignalDashboardEntity entity = signalDashboardDao.findByDashboardKey(normalizeDashboardKey(dashboardKey))
                .orElseThrow(SignalDashboardConflictException::new);
        checkRevision(entity, revision);
        signalDashboardDao.delete(entity);
        signalDashboardDao.flush();
    }

    private void checkRevision(SignalDashboardEntity entity, Long revision) {
        if (entity == null ? revision != null : revision == null || revision < 0 || !revision.equals(entity.getRevision())) {
            throw new SignalDashboardConflictException();
        }
    }

    private void consistentMetadata(String supplied, String derived) {
        if (supplied != null && !supplied.equals(derived)) {
            throw new IllegalArgumentException("signal_dashboard_document_metadata_conflict");
        }
    }

    private boolean exactEmptyConversion(SignalDashboardEntity entity, JsonNode document) {
        JsonNode spec = document.path("spec");
        return "30m".equals(spec.path("duration").asText()) && spec.path("variables").isEmpty()
                && spec.path("panels").isEmpty() && !spec.has("timezone") && !spec.has("refreshInterval")
                && spec.path("display").has("description") == (entity.getDescription() != null)
                && document.path("metadata").has("tags") == StringUtils.isNotEmpty(entity.getTags());
    }

    private boolean legacyTagsMatch(String tags, JsonNode document) {
        List<String> oldTags = tags == null || tags.isEmpty() ? List.of() : Arrays.asList(tags.split(",", -1));
        List<String> newTags = new ArrayList<>();
        document.path("metadata").path("tags").forEach(tag -> newTags.add(tag.asText()));
        return oldTags.equals(newTags);
    }

    private boolean emptyLegacy(SignalDashboardEntity entity) {
        return "v1".equals(entity.getVersion()) && emptyFragment(entity.getLayout(), false, false)
                && emptyFragment(entity.getWidgets(), false, false)
                && emptyFragment(entity.getVariables(), true, false)
                && emptyFragment(entity.getPanelMap(), true, true);
    }

    private boolean emptyFragment(String value, boolean optional, boolean object) {
        if (value == null) {
            return optional;
        }
        var node = JsonUtil.fromJsonQuietly(value);
        return node != null && node.isEmpty() && (object ? node.isObject() : node.isArray());
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
                .document(entity.getDocument() == null ? null : JsonUtil.fromJson(entity.getDocument(), JsonNode.class))
                .revision(entity.getRevision())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }
}
