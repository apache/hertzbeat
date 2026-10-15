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

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;

/**
 * Safe plugin-owned parameter definition detached from persistence metadata.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PluginParameterDefinition {

    private String app;
    private Map<String, String> name;
    private String field;
    private String type;
    private boolean required;
    private String defaultValue;
    private String placeholder;
    private String range;
    private Short limit;
    private List<Option> options;
    private String keyAlias;
    private String valueAlias;
    private boolean hide;
    private Map<String, List<Object>> depend;

    public static PluginParameterDefinition fromRuntime(RuntimeParamDefine source) {
        PluginParameterDefinition result = new PluginParameterDefinition();
        result.setApp(source.getApp());
        result.setName(source.getName());
        result.setField(source.getField());
        result.setType(source.getType());
        result.setRequired(source.isRequired());
        result.setDefaultValue(source.getDefaultValue());
        result.setPlaceholder(source.getPlaceholder());
        result.setRange(source.getRange());
        result.setLimit(source.getLimit());
        result.setOptions(source.getOptions() == null ? null : source.getOptions().stream()
                .map(option -> new Option(option.getLabel(), option.getValue())).toList());
        result.setKeyAlias(source.getKeyAlias());
        result.setValueAlias(source.getValueAlias());
        result.setHide(source.isHide());
        result.setDepend(source.getDepend());
        if ("password".equals(source.getType())) {
            result.setDefaultValue(null);
            result.setPlaceholder(null);
        }
        return result;
    }

    /**
     * Safe option projection for plugin parameter controls.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Option {
        private String label;
        private String value;
    }
}
