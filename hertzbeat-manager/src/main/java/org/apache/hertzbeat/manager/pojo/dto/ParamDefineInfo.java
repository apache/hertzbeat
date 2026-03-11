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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;

/**
 * Manager-side parameter definition DTO detached from JPA annotations.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParamDefineInfo {

    private Long id;

    private String app;

    private Map<String, String> name;

    private String field;

    private String type;

    private boolean required;

    private String defaultValue;

    private String placeholder;

    private String range;

    private Short limit;

    private List<OptionInfo> options;

    private String keyAlias;

    private String valueAlias;

    private boolean hide;

    private String creator;

    private String modifier;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;

    private Map<String, List<Object>> depend;

    public static ParamDefineInfo fromEntity(ParamDefine paramDefine) {
        if (paramDefine == null) {
            return null;
        }
        ParamDefineInfo info = new ParamDefineInfo();
        info.setId(paramDefine.getId());
        info.setApp(paramDefine.getApp());
        info.setName(paramDefine.getName());
        info.setField(paramDefine.getField());
        info.setType(paramDefine.getType());
        info.setRequired(paramDefine.isRequired());
        info.setDefaultValue(paramDefine.getDefaultValue());
        info.setPlaceholder(paramDefine.getPlaceholder());
        info.setRange(paramDefine.getRange());
        info.setLimit(paramDefine.getLimit());
        info.setOptions(paramDefine.getOptions() == null ? null
                : paramDefine.getOptions().stream().map(OptionInfo::fromEntity).toList());
        info.setKeyAlias(paramDefine.getKeyAlias());
        info.setValueAlias(paramDefine.getValueAlias());
        info.setHide(paramDefine.isHide());
        info.setCreator(paramDefine.getCreator());
        info.setModifier(paramDefine.getModifier());
        info.setGmtCreate(paramDefine.getGmtCreate());
        info.setGmtUpdate(paramDefine.getGmtUpdate());
        info.setDepend(paramDefine.getDepend());
        return info;
    }

    public static ParamDefineInfo fromRuntime(RuntimeParamDefine runtimeParamDefine) {
        if (runtimeParamDefine == null) {
            return null;
        }
        ParamDefineInfo info = new ParamDefineInfo();
        info.setApp(runtimeParamDefine.getApp());
        info.setName(runtimeParamDefine.getName());
        info.setField(runtimeParamDefine.getField());
        info.setType(runtimeParamDefine.getType());
        info.setRequired(runtimeParamDefine.isRequired());
        info.setDefaultValue(runtimeParamDefine.getDefaultValue());
        info.setPlaceholder(runtimeParamDefine.getPlaceholder());
        info.setRange(runtimeParamDefine.getRange());
        info.setLimit(runtimeParamDefine.getLimit());
        info.setOptions(runtimeParamDefine.getOptions() == null ? null
                : runtimeParamDefine.getOptions().stream().map(OptionInfo::fromRuntime).toList());
        info.setKeyAlias(runtimeParamDefine.getKeyAlias());
        info.setValueAlias(runtimeParamDefine.getValueAlias());
        info.setHide(runtimeParamDefine.isHide());
        info.setDepend(runtimeParamDefine.getDepend());
        return info;
    }

    /**
     * DTO version of parameter options.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OptionInfo {
        private String label;
        private String value;

        public static OptionInfo fromEntity(ParamDefine.Option option) {
            return option == null ? null : new OptionInfo(option.getLabel(), option.getValue());
        }

        public static OptionInfo fromRuntime(RuntimeParamDefine.Option option) {
            return option == null ? null : new OptionInfo(option.getLabel(), option.getValue());
        }
    }
}
