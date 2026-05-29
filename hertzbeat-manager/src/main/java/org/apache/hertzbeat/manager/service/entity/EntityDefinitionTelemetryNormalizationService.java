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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Normalizes telemetry identity and monitor-bind evidence declared by entity definitions.
 */
@Service
public class EntityDefinitionTelemetryNormalizationService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String BIND_ACTIVE = "active";

    public EntityDefinition.Telemetry extractDefinitionTelemetry(Map<String, Object> telemetryMap) {
        if (telemetryMap == null) {
            return null;
        }
        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        telemetry.setIdentities(extractDefinitionIdentities(telemetryMap.get("identities")));
        telemetry.setMonitors(extractDefinitionMonitorBinds(telemetryMap.get("monitors")));
        if (CollectionUtils.isEmpty(telemetry.getIdentities())
                && CollectionUtils.isEmpty(telemetry.getMonitors())) {
            return null;
        }
        return telemetry;
    }

    public List<EntityDefinition.Identity> extractDefinitionIdentities(Object identities) {
        if (!(identities instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Identity> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> identityMap = toObjectMap(item);
            String key = asText(identityMap.get("key"));
            String value = asText(identityMap.get("value"));
            if (!StringUtils.hasText(key) || !StringUtils.hasText(value)) {
                continue;
            }
            EntityDefinition.Identity identity = new EntityDefinition.Identity();
            identity.setKey(key.trim());
            identity.setValue(value.trim());
            identity.setType(defaultText(asText(identityMap.get("type")),
                    asText(identityMap.get("source")), SOURCE_MANUAL));
            identity.setPriority(asInteger(identityMap.get("priority")));
            identity.setPrimary(asBoolean(identityMap.get("primary")));
            result.add(identity);
        }
        return result;
    }

    public List<EntityDefinition.MonitorBind> extractDefinitionMonitorBinds(Object monitors) {
        if (!(monitors instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.MonitorBind> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> bindMap = toObjectMap(item);
            Long monitorId = asLong(defaultText(bindMap.containsKey("monitorId") ? "monitorId" : null,
                    bindMap.containsKey("id") ? "id" : null), bindMap);
            if (monitorId == null) {
                continue;
            }
            EntityDefinition.MonitorBind bind = new EntityDefinition.MonitorBind();
            bind.setMonitorId(monitorId);
            bind.setBindType(defaultText(asText(bindMap.get("bindType")), SOURCE_MANUAL));
            bind.setBindSource(defaultText(asText(bindMap.get("bindSource")), SOURCE_MANUAL));
            bind.setStatus(defaultText(asText(bindMap.get("status")), BIND_ACTIVE));
            bind.setScore(asInteger(bindMap.get("score")));
            bind.setMatchContext(toStringListMap(bindMap.get("matchContext")));
            result.add(bind);
        }
        return result;
    }

    private Map<String, Object> toObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private Map<String, List<String>> toStringListMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, List<String>> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            String key = entry.getKey() == null ? null : String.valueOf(entry.getKey());
            if (!StringUtils.hasText(key) || entry.getValue() == null) {
                continue;
            }
            List<String> values = new ArrayList<>();
            if (entry.getValue() instanceof List<?> items) {
                for (Object item : items) {
                    String text = asText(item);
                    if (text != null) {
                        values.add(text);
                    }
                }
            } else {
                String text = asText(entry.getValue());
                if (text != null) {
                    values.add(text);
                }
            }
            if (!values.isEmpty()) {
                result.put(key, values);
            }
        }
        return result;
    }

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean asBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        return Boolean.parseBoolean(String.valueOf(value).trim());
    }

    private Long asLong(String key, Map<String, Object> source) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return asLong(source.get(key));
    }

    private Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String defaultText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
