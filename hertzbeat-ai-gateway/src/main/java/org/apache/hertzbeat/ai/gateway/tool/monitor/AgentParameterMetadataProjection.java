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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Fresh model-facing descriptors. Configuration defaults, choices and dependencies are not
 * secrets-safe metadata.
 */
final class AgentParameterMetadataProjection {
    private int remaining = 24000;

    static List<ParamDefineInfo> safe(List<ParamDefineInfo> source) {
        if (source == null) return List.of();
        if (source.size() > 128)
            throw new IllegalArgumentException(
                    "Parameter metadata exceeds the model budget; use the native editor");
        var projection = new AgentParameterMetadataProjection();
        var output = new ArrayList<ParamDefineInfo>();
        for (var value : source) output.add(projection.copy(value));
        return List.copyOf(output);
    }

    private ParamDefineInfo copy(ParamDefineInfo source) {
        if (source == null
                || source.getField() == null
                || !source.getField().matches("[A-Za-z0-9_.:-]{1,128}"))
            throw new IllegalArgumentException("Invalid parameter metadata field");
        var result = new ParamDefineInfo();
        result.setField(text(source.getField(), 128));
        result.setType(text(source.getType(), 64));
        result.setRequired(source.isRequired());
        result.setHide(source.isHide());
        if (source.getLimit() != null && source.getLimit() < 0)
            throw new IllegalArgumentException("Invalid parameter metadata limit");
        result.setLimit(source.getLimit());
        if (source.getRange() != null && source.getRange().matches("\\[-?[0-9]+,-?[0-9]+\\]"))
            result.setRange(text(source.getRange(), 64));
        Map<String, String> names = new LinkedHashMap<>();
        if (source.getName() != null) {
            if (source.getName().size() > 10)
                throw new IllegalArgumentException("Parameter labels exceed the model budget");
            source.getName()
                    .forEach(
                            (key, value) -> {
                                if (key != null && value != null)
                                    names.put(text(key, 32), text(value, 256));
                            });
        }
        result.setName(Map.copyOf(names));
        // Preserve only fixed non-secret transport scalars needed by existing website planning.
        // Never inspect/copy arbitrary text, password defaults, option values, dependency values,
        // placeholders, or creator metadata into model output; the cached native DTO is untouched.
        String field = source.getField().toLowerCase(Locale.ROOT);
        if ((field.equals("port") || field.equals("timeout"))
                && "number".equals(source.getType())) {
            String value = source.getDefaultValue();
            if (value != null && value.matches("[0-9]{1,7}")) {
                long number = Long.parseLong(value);
                long max = field.equals("port") ? 65535 : 3600000;
                if (number >= 0 && number <= max) result.setDefaultValue(value);
            }
        } else if (field.equals("ssl") && "boolean".equals(source.getType())) {
            String value = source.getDefaultValue();
            if ("true".equals(value) || "false".equals(value)) result.setDefaultValue(value);
        }
        return result;
    }

    private String text(String value, int max) {
        if (value == null || value.length() > max || (remaining -= value.length()) < 0)
            throw new IllegalArgumentException(
                    "Parameter metadata exceeds the model budget; use the native editor");
        return GatewayText.redactSecrets(value);
    }
}
