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

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.dto.AlertInhibitResponse;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.springframework.stereotype.Component;

/** Validates the public contract and maps it to the persistence model. */
@Component
public class AlertInhibitContractMapper {

    private static final int MAX_MATCHERS = 32;
    private static final int MAX_EQUAL_LABELS = 32;
    private static final int MAX_LABEL_KEY_LENGTH = 64;
    private static final int MAX_LABEL_VALUE_LENGTH = 256;
    private static final int MAX_LABEL_CONTENT_LENGTH = 1800;

    public AlertInhibit toNewEntity(AlertInhibitRequest request) {
        if (request == null || request.getId() != null) {
            throw new IllegalArgumentException("id is not allowed when creating an alert inhibit");
        }
        return apply(request, new AlertInhibit());
    }

    public AlertInhibit toExistingEntity(AlertInhibitRequest request, AlertInhibit existing) {
        if (request == null) {
            throw new IllegalArgumentException("Alert inhibit request is required");
        }
        Long id = requirePositiveId(request.getId());
        if (!id.equals(existing.getId())) {
            throw new IllegalArgumentException("Alert inhibit identity does not match");
        }
        AlertInhibit target = new AlertInhibit();
        target.setId(existing.getId());
        target.setCreator(existing.getCreator());
        target.setModifier(existing.getModifier());
        target.setGmtCreate(existing.getGmtCreate());
        target.setGmtUpdate(existing.getGmtUpdate());
        return apply(request, target);
    }

    public AlertInhibitResponse toResponse(AlertInhibit entity) {
        return new AlertInhibitResponse(entity.getId(), entity.getName(),
                copyMap(entity.getSourceLabels()), copyMap(entity.getTargetLabels()),
                entity.getEqualLabels() == null ? List.of() : List.copyOf(entity.getEqualLabels()),
                Boolean.TRUE.equals(entity.getEnable()), entity.getCreator(), entity.getModifier(),
                entity.getGmtCreate(), entity.getGmtUpdate());
    }

    public Long requirePositiveId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("A positive alert inhibit id is required");
        }
        return id;
    }

    private AlertInhibit apply(AlertInhibitRequest request, AlertInhibit target) {
        String name = StringUtils.trimToNull(request.getName());
        if (name == null || name.length() > 100) {
            throw new IllegalArgumentException("Alert inhibit name is invalid");
        }
        if (request.getEnable() == null) {
            throw new IllegalArgumentException("Alert inhibit enable is required");
        }
        target.setName(name);
        target.setEnable(request.getEnable());
        target.setSourceLabels(validateMatchers(request.getSourceLabels()));
        target.setTargetLabels(validateMatchers(request.getTargetLabels()));
        target.setEqualLabels(validateEqualLabels(request.getEqualLabels()));
        return target;
    }

    private Map<String, String> validateMatchers(Map<String, String> matchers) {
        if (matchers == null || matchers.isEmpty() || matchers.size() > MAX_MATCHERS) {
            throw new IllegalArgumentException("Alert inhibit matchers are invalid");
        }
        Map<String, String> normalized = new LinkedHashMap<>();
        int contentLength = 0;
        for (Map.Entry<String, String> entry : matchers.entrySet()) {
            String key = StringUtils.trimToNull(entry.getKey());
            String value = StringUtils.trimToNull(entry.getValue());
            if (key == null || key.length() > MAX_LABEL_KEY_LENGTH
                    || value == null || value.length() > MAX_LABEL_VALUE_LENGTH) {
                throw new IllegalArgumentException("Alert inhibit matcher is invalid");
            }
            contentLength += key.length() + value.length();
            normalized.put(key, value);
        }
        if (contentLength > MAX_LABEL_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Alert inhibit matchers are too large");
        }
        return normalized;
    }

    private List<String> validateEqualLabels(List<String> equalLabels) {
        if (equalLabels == null || equalLabels.isEmpty() || equalLabels.size() > MAX_EQUAL_LABELS) {
            throw new IllegalArgumentException("Alert inhibit equal labels are invalid");
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String candidate : equalLabels) {
            String label = StringUtils.trimToNull(candidate);
            if (label == null || label.length() > MAX_LABEL_KEY_LENGTH || !normalized.add(label)) {
                throw new IllegalArgumentException("Alert inhibit equal label is invalid");
            }
        }
        return List.copyOf(normalized);
    }

    private Map<String, String> copyMap(Map<String, String> labels) {
        return labels == null ? Map.of() : Map.copyOf(labels);
    }
}
