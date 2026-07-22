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

package org.apache.hertzbeat.manager.component.validator.impl;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.springframework.stereotype.Component;

/**
 * Option parameter validator for radio and checkbox types
 */
@Component
public class OptionParamValidator implements ParamValidator {
    @Override
    public boolean support(String type) {
        return "radio".equals(type) || "checkbox".equals(type);
    }

    @Override
    public void validate(ParamDefineInfo paramDefine, MonitorParam param) {
        Map<String, String> canonicalOptions = canonicalOptions(paramDefine.getOptions());
        if ("checkbox".equals(paramDefine.getType())) {
            param.setParamValue(validateCheckbox(param.getParamValue(), canonicalOptions));
            return;
        }
        String selection = param.getParamValue() == null ? "" : param.getParamValue().trim();
        String canonical = canonicalOptions.get(selection.toLowerCase(Locale.ROOT));
        if (selection.isEmpty() || canonical == null) {
            throw invalidOption();
        }
        param.setParamValue(canonical);
    }

    private static String validateCheckbox(String value, Map<String, String> canonicalOptions) {
        if (value == null) {
            throw invalidOption();
        }
        String[] selections = value.split(",", -1);
        Set<String> selected = new HashSet<>();
        List<String> canonicalSelections = new ArrayList<>(selections.length);
        for (String rawSelection : selections) {
            String selection = rawSelection.trim();
            String key = selection.toLowerCase(Locale.ROOT);
            String canonical = canonicalOptions.get(key);
            if (selection.isEmpty() || canonical == null || !selected.add(key)) {
                throw invalidOption();
            }
            canonicalSelections.add(canonical);
        }
        return String.join(",", canonicalSelections);
    }

    private static Map<String, String> canonicalOptions(List<ParamDefineInfo.OptionInfo> options) {
        if (options == null || options.isEmpty()) {
            throw invalidOption();
        }
        Map<String, String> canonical = new LinkedHashMap<>();
        for (ParamDefineInfo.OptionInfo option : options) {
            if (option == null || option.getValue() == null || option.getValue().isBlank()) {
                throw invalidOption();
            }
            String key = option.getValue().toLowerCase(Locale.ROOT);
            if (canonical.putIfAbsent(key, option.getValue()) != null) {
                throw invalidOption();
            }
        }
        return canonical;
    }

    private static IllegalArgumentException invalidOption() {
        return new IllegalArgumentException("Option parameter value is invalid");
    }
}
