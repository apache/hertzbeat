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

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signal saved view service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class SignalSavedViewServiceImpl implements SignalSavedViewService {

    private static final int MAX_LABEL_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 512;
    private static final int MAX_ROUTE_LENGTH = 2048;
    private static final int MAX_TEXT_BYTES = 65535;
    private static final Map<String, String> SIGNAL_ROUTE_PREFIXES = Map.of(
            "logs", "/log/manage",
            "traces", "/trace/manage",
            "metrics", "/ingestion/otlp/metrics"
    );

    private final SignalSavedViewDao signalSavedViewDao;

    @Override
    @Transactional(readOnly = true)
    public List<SignalSavedView> listSignalSavedViews(String creator, String signal) {
        requireText(creator, "creator");
        String normalizedSignal = normalizeSignal(signal);
        return signalSavedViewDao.findBySignalOrderByUpdateTimeDesc(normalizedSignal)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public SignalSavedView upsertSignalSavedView(String creator, SignalSavedView savedView) {
        String normalizedCreator = requireText(creator, "creator");
        if (savedView == null) {
            throw new IllegalArgumentException("Saved view is required");
        }
        if (savedView.getRevision() != null && savedView.getRevision() < 0) {
            throw new IllegalArgumentException("signal_saved_view_revision_invalid");
        }
        String normalizedSignal = normalizeSignal(savedView.getSignal());
        String viewKey = normalizeViewKey(savedView.getViewKey());
        String route = normalizeRoute(normalizedSignal, savedView.getRoute());
        LocalDateTime now = LocalDateTime.now();
        SignalSavedViewEntity entity = signalSavedViewDao.findBySignalAndViewKey(normalizedSignal, viewKey).orElse(null);
        checkRevision(entity, savedView.getRevision());
        if (entity == null) {
            entity = SignalSavedViewEntity.builder().creator(normalizedCreator).signal(normalizedSignal)
                    .viewKey(viewKey).createTime(now).build();
        }

        entity.setLabel(limit(requireText(savedView.getLabel(), "label"), MAX_LABEL_LENGTH, "label"));
        entity.setDescription(limit(StringUtils.trimToEmpty(savedView.getDescription()), MAX_DESCRIPTION_LENGTH, "description"));
        entity.setRoute(route);
        entity.setQuerySnapshot(limitNullable(savedView.getQuerySnapshot(), MAX_TEXT_BYTES, "querySnapshot"));
        entity.setPayload(limitJsonNullable(savedView.getPayload(), MAX_TEXT_BYTES, "payload"));
        entity.setUpdateTime(now);
        return toDto(signalSavedViewDao.saveAndFlush(entity));
    }

    @Override
    public void deleteSignalSavedView(String creator, String signal, String viewKey, long revision) {
        requireText(creator, "creator");
        if (revision < 0) {
            throw new IllegalArgumentException("signal_saved_view_revision_invalid");
        }
        var entity = signalSavedViewDao.findBySignalAndViewKey(normalizeSignal(signal), normalizeViewKey(viewKey))
                .orElseThrow(SignalSavedViewConflictException::new);
        checkRevision(entity, revision);
        signalSavedViewDao.delete(entity);
        signalSavedViewDao.flush();
    }

    private void checkRevision(SignalSavedViewEntity entity, Long revision) {
        if (entity == null ? revision != null : revision == null || revision < 0 || !revision.equals(entity.getRevision())) {
            throw new SignalSavedViewConflictException();
        }
    }

    private String normalizeSignal(String signal) {
        String normalized = requireText(signal, "signal").toLowerCase(Locale.ROOT);
        if (!SIGNAL_ROUTE_PREFIXES.containsKey(normalized)) {
            throw new IllegalArgumentException("Unsupported signal: " + signal);
        }
        return normalized;
    }

    private String normalizeViewKey(String viewKey) {
        String normalized = requireText(viewKey, "viewKey");
        if (!normalized.matches("[A-Za-z0-9_.:-]{1,128}")) {
            throw new IllegalArgumentException("Invalid saved view key");
        }
        return normalized;
    }

    private String normalizeRoute(String signal, String route) {
        String normalized = limit(requireText(route, "route"), MAX_ROUTE_LENGTH, "route");
        URI uri = URI.create(normalized);
        if (uri.isAbsolute() || uri.getRawAuthority() != null || uri.getRawFragment() != null) {
            throw new IllegalArgumentException("Saved view route must be a local explorer route");
        }
        if (SIGNAL_ROUTE_PREFIXES.get(signal).equals(uri.getRawPath())) {
            return normalized;
        }
        if ("/explore".equals(uri.getRawPath())) {
            List<String> signals = Arrays.stream(StringUtils.defaultString(uri.getRawQuery()).split("&"))
                    .map(parameter -> parameter.split("=", 2))
                    .filter(parts -> "signal".equals(URLDecoder.decode(parts[0], StandardCharsets.UTF_8)))
                    .map(parts -> parts.length == 2 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "")
                    .toList();
            if (signals.size() == 1 && signal.equals(signals.getFirst())) {
                return normalized;
            }
        }
        throw new IllegalArgumentException("Saved view route does not match signal");
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
        if (value.getBytes(StandardCharsets.UTF_8).length > limit) {
            throw new IllegalArgumentException(field + " is too long");
        }
        return value;
    }

    private String limitJsonNullable(String value, int limit, String field) {
        String normalized = StringUtils.trimToNull(value);
        if (normalized == null) {
            return null;
        }
        String limited = limitNullable(normalized, limit, field);
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

    private SignalSavedView toDto(SignalSavedViewEntity entity) {
        return SignalSavedView.builder()
                .id(entity.getId())
                .revision(entity.getRevision())
                .creator(entity.getCreator())
                .signal(entity.getSignal())
                .viewKey(entity.getViewKey())
                .label(entity.getLabel())
                .description(entity.getDescription())
                .route(entity.getRoute())
                .querySnapshot(entity.getQuerySnapshot())
                .payload(entity.getPayload())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }
}
