/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.stereotype.Component;

/** Validates the public contract and maps it to the persistence model. */
@Component
public class AlertSilenceContractMapper {

    private static final int MAX_MATCHERS = 32;
    private static final int MAX_MATCHER_KEY_LENGTH = 64;
    private static final int MAX_MATCHER_VALUE_LENGTH = 256;
    private static final int MAX_MATCHER_CONTENT_LENGTH = 1800;

    public AlertSilence toNewEntity(AlertSilenceRequest request) {
        if (request.getId() != null) {
            throw new IllegalArgumentException("id is not allowed when creating an alert silence");
        }
        return apply(request, new AlertSilence());
    }

    public AlertSilence toExistingEntity(AlertSilenceRequest request, AlertSilence existing) {
        Long id = requirePositiveId(request.getId());
        if (!id.equals(existing.getId())) {
            throw new IllegalArgumentException("Alert silence identity does not match");
        }
        AlertSilence target = new AlertSilence();
        target.setId(existing.getId());
        target.setTimes(existing.getTimes());
        target.setCreator(existing.getCreator());
        target.setModifier(existing.getModifier());
        target.setGmtCreate(existing.getGmtCreate());
        target.setGmtUpdate(existing.getGmtUpdate());
        return apply(request, target);
    }

    public AlertSilenceResponse toResponse(AlertSilence entity) {
        Map<String, String> labels = entity.getLabels() == null ? null
                : Map.copyOf(entity.getLabels());
        List<Byte> days = entity.getDays() == null ? null : List.copyOf(entity.getDays());
        return new AlertSilenceResponse(entity.getId(), entity.getName(), entity.isEnable(), entity.isMatchAll(),
                entity.getType(), entity.getTimes(), labels, days, entity.getPeriodStart(), entity.getPeriodEnd(),
                entity.getCreator(), entity.getModifier(), entity.getGmtCreate(), entity.getGmtUpdate());
    }

    public Long requirePositiveId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("A positive alert silence id is required");
        }
        return id;
    }

    private AlertSilence apply(AlertSilenceRequest request, AlertSilence target) {
        target.setName(validateName(request.getName()));
        target.setEnable(require(request.getEnable(), "enable"));
        target.setMatchAll(require(request.getMatchAll(), "matchAll"));
        target.setType(validateType(request.getType()));
        target.setLabels(validateLabels(request.getLabels(), target.isMatchAll()));
        target.setDays(validateDays(request.getDays(), target.getType()));
        validatePeriod(request, target.getType());
        target.setPeriodStart(request.getPeriodStart());
        target.setPeriodEnd(request.getPeriodEnd());
        return target;
    }

    private String validateName(String name) {
        String value = StringUtils.trimToNull(name);
        if (value == null || value.length() > 100) {
            throw new IllegalArgumentException("Alert silence name is invalid");
        }
        return value;
    }

    private Byte validateType(Byte type) {
        if (type == null || type != 0 && type != 1) {
            throw new IllegalArgumentException("Unsupported alert silence type");
        }
        return type;
    }

    private Map<String, String> validateLabels(Map<String, String> labels, boolean matchAll) {
        if (matchAll) {
            if (labels != null && !labels.isEmpty()) {
                throw new IllegalArgumentException("Match-all silence cannot contain matchers");
            }
            return Map.of();
        }
        if (labels == null || labels.isEmpty() || labels.size() > MAX_MATCHERS) {
            throw new IllegalArgumentException("Label matchers are required");
        }
        Map<String, String> normalized = new LinkedHashMap<>();
        int contentLength = 0;
        for (Map.Entry<String, String> entry : labels.entrySet()) {
            String key = StringUtils.trimToNull(entry.getKey());
            String value = StringUtils.trimToNull(entry.getValue());
            if (key == null || key.length() > MAX_MATCHER_KEY_LENGTH
                    || value == null || value.length() > MAX_MATCHER_VALUE_LENGTH) {
                throw new IllegalArgumentException("Label matcher is invalid");
            }
            contentLength += key.length() + value.length();
            normalized.put(key, value);
        }
        if (contentLength > MAX_MATCHER_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Label matchers are too large");
        }
        return normalized;
    }

    private List<Byte> validateDays(List<Byte> days, byte type) {
        if (type == 0) {
            if (days != null && !days.isEmpty()) {
                throw new IllegalArgumentException("One-time silence cannot contain recurring days");
            }
            return List.of();
        }
        if (days == null || days.isEmpty()) {
            throw new IllegalArgumentException("Recurring silence requires days");
        }
        Set<Byte> unique = new LinkedHashSet<>();
        for (Byte day : days) {
            if (day == null || day < 1 || day > 7 || !unique.add(day)) {
                throw new IllegalArgumentException("Recurring silence day is invalid");
            }
        }
        return List.copyOf(unique);
    }

    private void validatePeriod(AlertSilenceRequest request, byte type) {
        if (request.getPeriodStart() == null || request.getPeriodEnd() == null) {
            throw new IllegalArgumentException("Alert silence period is required");
        }
        if (type == 0 && !request.getPeriodEnd().isAfter(request.getPeriodStart())) {
            throw new IllegalArgumentException("One-time silence period is invalid");
        }
        LocalTime start = request.getPeriodStart().toLocalTime();
        LocalTime end = request.getPeriodEnd().toLocalTime();
        if (type == 1 && start.equals(end)) {
            throw new IllegalArgumentException("Recurring silence period is invalid");
        }
    }

    private <T> T require(T value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + " is required");
        }
        return value;
    }
}
