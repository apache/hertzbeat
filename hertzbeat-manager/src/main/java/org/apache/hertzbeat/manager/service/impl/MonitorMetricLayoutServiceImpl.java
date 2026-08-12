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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.MonitorMetricLayoutEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.MonitorMetricLayoutDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricHistoryDock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutItem;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutConflictException;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Personal monitor metric layout service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class MonitorMetricLayoutServiceImpl implements MonitorMetricLayoutService {

    private static final int SCHEMA_VERSION = 1;
    private static final int COLUMNS = 12;
    private static final String MISSING_REVISION = "missing";
    private static final Set<Integer> WIDTHS = Set.of(4, 6, 8, 12);

    private final MonitorMetricLayoutDao monitorMetricLayoutDao;

    @Override
    @Transactional(readOnly = true)
    public Optional<MonitorMetricLayout> get(String creator, String application) {
        String normalizedCreator = requireText(creator, "creator");
        String normalizedApplication = normalizeApplication(application);
        return monitorMetricLayoutDao.findByCreatorAndApplication(normalizedCreator, normalizedApplication)
                .map(this::toLayout);
    }

    @Override
    public MonitorMetricLayout save(
            String creator, String application, MonitorMetricLayoutSaveRequest request) {
        String normalizedCreator = requireText(creator, "creator");
        String normalizedApplication = normalizeApplication(application);
        LayoutDocument document = validate(request);
        String serialized = JsonUtil.toJson(document);
        if (serialized == null) {
            throw new IllegalStateException("Monitor metric layout could not be serialized");
        }
        String expectedRevision = requireText(request.expectedRevision(), "expectedRevision");
        Optional<MonitorMetricLayoutEntity> existing = monitorMetricLayoutDao
                .findByCreatorAndApplication(normalizedCreator, normalizedApplication);
        return existing.isEmpty()
                ? create(normalizedCreator, normalizedApplication, expectedRevision, document, serialized)
                : update(existing.get(), expectedRevision, document, serialized);
    }

    @Override
    public void delete(String creator, String application, String expectedRevision) {
        int deleted = monitorMetricLayoutDao.deleteByCreatorAndApplicationAndRevision(
                requireText(creator, "creator"),
                normalizeApplication(application),
                requireText(expectedRevision, "expectedRevision"));
        if (deleted != 1) {
            throw new MonitorMetricLayoutConflictException();
        }
    }

    private MonitorMetricLayout create(
            String creator,
            String application,
            String expectedRevision,
            LayoutDocument document,
            String serialized) {
        if (!MISSING_REVISION.equals(expectedRevision)) {
            throw new MonitorMetricLayoutConflictException();
        }
        LocalDateTime now = LocalDateTime.now();
        String revision = nextRevision();
        MonitorMetricLayoutEntity entity = MonitorMetricLayoutEntity.builder()
                .creator(creator)
                .application(application)
                .schemaVersion(SCHEMA_VERSION)
                .layoutDocument(serialized)
                .revision(revision)
                .createTime(now)
                .updateTime(now)
                .build();
        try {
            monitorMetricLayoutDao.saveAndFlush(entity);
        } catch (DataIntegrityViolationException conflict) {
            throw new MonitorMetricLayoutConflictException();
        }
        return toLayout(application, revision, document);
    }

    private MonitorMetricLayout update(
            MonitorMetricLayoutEntity existing,
            String expectedRevision,
            LayoutDocument document,
            String serialized) {
        if (!expectedRevision.equals(existing.getRevision())) {
            throw new MonitorMetricLayoutConflictException();
        }
        String revision = nextRevision();
        int updated = monitorMetricLayoutDao.updateLayoutIfRevision(
                existing.getCreator(),
                existing.getApplication(),
                serialized,
                SCHEMA_VERSION,
                revision,
                expectedRevision);
        if (updated != 1) {
            throw new MonitorMetricLayoutConflictException();
        }
        return toLayout(existing.getApplication(), revision, document);
    }

    private MonitorMetricLayout toLayout(MonitorMetricLayoutEntity entity) {
        LayoutDocument document = JsonUtil.fromJsonQuietly(entity.getLayoutDocument(), LayoutDocument.class);
        if (document == null) {
            throw new IllegalStateException("Saved monitor metric layout is invalid");
        }
        validate(document);
        return toLayout(entity.getApplication(), entity.getRevision(), document);
    }

    private MonitorMetricLayout toLayout(String application, String revision, LayoutDocument document) {
        return new MonitorMetricLayout(
                application,
                revision,
                document.schemaVersion(),
                document.mode(),
                document.columns(),
                List.copyOf(document.items()),
                document.historyDock());
    }

    private LayoutDocument validate(MonitorMetricLayoutSaveRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("layout is required");
        }
        LayoutDocument document = new LayoutDocument(
                request.schemaVersion(),
                request.mode(),
                request.columns(),
                request.items(),
                request.historyDock());
        validate(document);
        return document;
    }

    private void validate(LayoutDocument document) {
        if (document.schemaVersion() != SCHEMA_VERSION || document.columns() != COLUMNS) {
            throw new IllegalArgumentException("Unsupported monitor metric layout version");
        }
        if (!"auto".equals(document.mode()) && !"custom".equals(document.mode())) {
            throw new IllegalArgumentException("Invalid monitor metric layout mode");
        }
        List<MonitorMetricLayoutItem> items = document.items();
        if (items == null || items.size() > 128 || document.historyDock() == null) {
            throw new IllegalArgumentException("Invalid monitor metric layout document");
        }
        validateHistoryDock(document.historyDock());
        validateItems(items);
    }

    private void validateHistoryDock(MonitorMetricHistoryDock dock) {
        if (dock.height() < 8 || dock.height() > 20) {
            throw new IllegalArgumentException("Invalid monitor metric history dock height");
        }
    }

    private void validateItems(List<MonitorMetricLayoutItem> items) {
        Set<String> groups = new HashSet<>();
        Set<Integer> orders = new HashSet<>();
        for (MonitorMetricLayoutItem item : items) {
            validateItem(item);
            if (!groups.add(item.group()) || !orders.add(item.order())) {
                throw new IllegalArgumentException("Duplicate monitor metric layout item");
            }
        }
        for (int index = 0; index < items.size(); index++) {
            for (int candidate = index + 1; candidate < items.size(); candidate++) {
                if (overlaps(items.get(index), items.get(candidate))) {
                    throw new IllegalArgumentException("Overlapping monitor metric layout items");
                }
            }
        }
    }

    private void validateItem(MonitorMetricLayoutItem item) {
        if (item == null || item.group() == null
                || !item.group().matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid monitor metric group key");
        }
        if (item.x() < 0 || item.y() < 0 || item.y() > 999
                || !WIDTHS.contains(item.w()) || item.x() + item.w() > COLUMNS
                || item.h() < (item.collapsed() ? 4 : 8) || item.h() > 24
                || item.order() < 0 || item.order() > 127) {
            throw new IllegalArgumentException("Invalid monitor metric layout geometry");
        }
    }

    private boolean overlaps(MonitorMetricLayoutItem first, MonitorMetricLayoutItem second) {
        return first.x() < second.x() + second.w()
                && first.x() + first.w() > second.x()
                && first.y() < second.y() + second.h()
                && first.y() + first.h() > second.y();
    }

    private String normalizeApplication(String application) {
        String normalized = requireText(application, "application").toLowerCase(Locale.ROOT);
        if (!normalized.matches("[a-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid monitor application");
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

    private String nextRevision() {
        return UUID.randomUUID().toString();
    }

    private record LayoutDocument(
            int schemaVersion,
            String mode,
            int columns,
            List<MonitorMetricLayoutItem> items,
            MonitorMetricHistoryDock historyDock) {
    }
}
