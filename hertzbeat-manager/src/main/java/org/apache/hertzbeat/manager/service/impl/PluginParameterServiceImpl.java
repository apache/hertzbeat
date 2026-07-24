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

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.component.validator.ParamValidatorManager;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.dao.PluginParamDao;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterDefinition;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterInput;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterSaveRequest;
import org.apache.hertzbeat.manager.pojo.dto.PluginParameterValue;
import org.apache.hertzbeat.manager.pojo.dto.PluginParametersVO;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.service.PluginParameterService;
import org.apache.hertzbeat.manager.service.plugin.AfterCommitPublisher;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterRegistry;
import org.apache.hertzbeat.manager.service.plugin.PluginParameterTypes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Validates and persists plugin parameters without exposing persistence entities.
 */
@Service
@RequiredArgsConstructor
public class PluginParameterServiceImpl implements PluginParameterService {

    private static final int MAX_VALUE_LENGTH = 8126;

    private final PluginParamDao pluginParamDao;

    private final PluginMetadataDao metadataDao;

    private final ParamValidatorManager paramValidatorManager;

    private final PluginParameterRegistry registry;

    private final AfterCommitPublisher afterCommitPublisher;

    @PostConstruct
    void loadStoredParameters() {
        try {
            Map<Long, List<PluginParam>> grouped = pluginParamDao.findAll().stream()
                    .collect(Collectors.groupingBy(PluginParam::getPluginMetadataId));
            grouped.forEach(registry::replaceStoredParameters);
        } catch (RuntimeException exception) {
            throw new CommonException("Failed to initialize plugin parameters");
        }
    }

    @Override
    public PluginParametersVO getParameters(Long pluginMetadataId) {
        PluginConfig config = requireConfig(pluginMetadataId);
        List<PluginParam> persisted = pluginParamDao.findParamsByPluginMetadataId(pluginMetadataId);
        Map<String, PluginParam> storedByField = uniqueStoredByField(persisted);
        List<PluginParameterDefinition> definitions = new ArrayList<>();
        List<PluginParameterValue> values = new ArrayList<>();
        for (RuntimeParamDefine runtimeDefine : uniqueDefinitions(config)) {
            PluginParameterDefinition definition = PluginParameterDefinition.fromRuntime(runtimeDefine);
            boolean password = isPassword(runtimeDefine);
            definitions.add(definition);
            PluginParam stored = storedByField.get(runtimeDefine.getField());
            boolean configured = stored != null && StringUtils.hasText(stored.getParamValue());
            String value = password || stored == null ? null : stored.getParamValue();
            values.add(new PluginParameterValue(runtimeDefine.getField(), runtimeDefine.getType(), value, configured));
        }
        return new PluginParametersVO(definitions, values);
    }

    @Override
    @Transactional
    public void save(PluginParameterSaveRequest request) {
        if (request == null || request.getPluginMetadataId() == null || request.getParams() == null) {
            throw new IllegalArgumentException("Plugin parameter request is invalid");
        }
        long pluginMetadataId = request.getPluginMetadataId();
        List<RuntimeParamDefine> definitions = uniqueDefinitions(requireConfig(pluginMetadataId));
        Map<String, RuntimeParamDefine> definitionsByField = definitions.stream()
                .collect(Collectors.toMap(RuntimeParamDefine::getField, Function.identity(), (left, right) -> left,
                        LinkedHashMap::new));
        Map<String, PluginParameterInput> inputsByField = validateInputs(request.getParams(), definitionsByField);
        Map<String, PluginParam> existingByField = uniqueStoredByField(
                pluginParamDao.findParamsByPluginMetadataId(pluginMetadataId));
        List<PluginParam> replacements = new ArrayList<>();
        for (RuntimeParamDefine definition : definitions) {
            PluginParameterInput input = inputsByField.get(definition.getField());
            PluginParam replacement = isPassword(definition)
                    ? passwordReplacement(pluginMetadataId, definition, input, existingByField.get(definition.getField()))
                    : ordinaryReplacement(pluginMetadataId, definition, input);
            if (replacement != null) {
                replacements.add(replacement);
            }
        }
        pluginParamDao.deletePluginParamsByPluginMetadataId(pluginMetadataId);
        pluginParamDao.flush();
        pluginParamDao.saveAll(replacements);
        afterCommitPublisher.publish(() -> registry.replaceStoredParameters(pluginMetadataId, replacements));
    }

    @Override
    @Transactional
    public void deleteByPluginIds(Set<Long> pluginMetadataIds) {
        if (pluginMetadataIds == null || pluginMetadataIds.isEmpty()) {
            return;
        }
        Set<Long> ids = Set.copyOf(pluginMetadataIds);
        pluginParamDao.deletePluginParamsByPluginMetadataIdIn(ids);
        afterCommitPublisher.publish(() -> ids.forEach(registry::remove));
    }

    private PluginConfig requireConfig(Long pluginMetadataId) {
        if (pluginMetadataId == null || !metadataDao.existsById(pluginMetadataId)) {
            throw new IllegalArgumentException("Plugin does not exist");
        }
        return registry.definition(pluginMetadataId)
                .orElseThrow(() -> new IllegalArgumentException("Plugin parameter definition is unavailable"));
    }

    private static List<RuntimeParamDefine> uniqueDefinitions(PluginConfig config) {
        List<RuntimeParamDefine> definitions = config.getParams() == null ? List.of() : config.getParams();
        Set<String> fields = new HashSet<>();
        for (RuntimeParamDefine definition : definitions) {
            if (definition == null || !StringUtils.hasText(definition.getField())
                    || !StringUtils.hasText(definition.getType()) || !fields.add(definition.getField())) {
                throw new IllegalArgumentException("Plugin parameter definition is invalid");
            }
        }
        return definitions;
    }

    private static Map<String, PluginParameterInput> validateInputs(
            List<PluginParameterInput> inputs, Map<String, RuntimeParamDefine> definitionsByField) {
        Map<String, PluginParameterInput> result = new HashMap<>();
        for (PluginParameterInput input : inputs) {
            if (input == null || !StringUtils.hasText(input.getField())
                    || !definitionsByField.containsKey(input.getField())
                    || result.putIfAbsent(input.getField(), input) != null) {
                throw new IllegalArgumentException("Plugin parameter field is invalid");
            }
        }
        return result;
    }

    private PluginParam ordinaryReplacement(
            long pluginMetadataId, RuntimeParamDefine runtimeDefine, PluginParameterInput input) {
        if (input != null && input.getIntent() != null) {
            throw new IllegalArgumentException("Password intent is invalid for this field");
        }
        String value = input == null ? null : input.getValue();
        if (!StringUtils.hasText(value)) {
            if (runtimeDefine.isRequired()) {
                throw new IllegalArgumentException("Required plugin parameter is missing");
            }
            return null;
        }
        return validatedParameter(pluginMetadataId, runtimeDefine, value);
    }

    private PluginParam passwordReplacement(long pluginMetadataId, RuntimeParamDefine runtimeDefine,
            PluginParameterInput input, PluginParam existing) {
        if (input == null || input.getIntent() == null) {
            throw new IllegalArgumentException("Password intent is required");
        }
        return switch (input.getIntent()) {
            case KEEP -> keepPassword(pluginMetadataId, runtimeDefine, input, existing);
            case REPLACE -> replacePassword(pluginMetadataId, runtimeDefine, input);
            case CLEAR -> clearPassword(runtimeDefine, input);
        };
    }

    private static PluginParam keepPassword(long pluginMetadataId, RuntimeParamDefine runtimeDefine,
            PluginParameterInput input, PluginParam existing) {
        if (input.getValue() != null || existing == null || !StringUtils.hasText(existing.getParamValue())) {
            throw new IllegalArgumentException("Password cannot be kept");
        }
        String protectedValue = existing.getParamValue();
        if (!AesUtil.isCiphertext(protectedValue)) {
            protectedValue = AesUtil.aesEncode(protectedValue);
            if (!AesUtil.isCiphertext(protectedValue)) {
                throw new IllegalArgumentException("Existing password could not be protected");
            }
        }
        return PluginParam.builder()
                .pluginMetadataId(pluginMetadataId)
                .field(runtimeDefine.getField())
                .paramValue(protectedValue)
                .type(CommonConstants.PARAM_TYPE_PASSWORD)
                .build();
    }

    private PluginParam replacePassword(
            long pluginMetadataId, RuntimeParamDefine runtimeDefine, PluginParameterInput input) {
        if (!StringUtils.hasText(input.getValue())) {
            throw new IllegalArgumentException("Replacement password is missing");
        }
        PluginParam replacement = validatedParameter(pluginMetadataId, runtimeDefine, input.getValue());
        if (!AesUtil.isCiphertext(replacement.getParamValue())) {
            throw new IllegalArgumentException("Replacement password could not be protected");
        }
        return replacement;
    }

    private static PluginParam clearPassword(RuntimeParamDefine runtimeDefine, PluginParameterInput input) {
        if (runtimeDefine.isRequired() || input.getValue() != null) {
            throw new IllegalArgumentException("Password cannot be cleared");
        }
        return null;
    }

    private PluginParam validatedParameter(long pluginMetadataId, RuntimeParamDefine runtimeDefine, String value) {
        if (value.length() > MAX_VALUE_LENGTH) {
            throw new IllegalArgumentException("Plugin parameter value is too long");
        }
        ParamDefineInfo definition = ParamDefineInfo.fromRuntime(runtimeDefine);
        MonitorParam parameter = new MonitorParam();
        parameter.setField(runtimeDefine.getField());
        parameter.setParamValue(value);
        parameter.setType(PluginParameterTypes.fromDefinition(runtimeDefine.getType()));
        paramValidatorManager.validate(definition, parameter);
        if (parameter.getParamValue() != null && parameter.getParamValue().length() > MAX_VALUE_LENGTH) {
            throw new IllegalArgumentException("Protected plugin parameter value is too long");
        }
        return PluginParam.builder()
                .pluginMetadataId(pluginMetadataId)
                .field(runtimeDefine.getField())
                .paramValue(parameter.getParamValue())
                .type(parameter.getType())
                .build();
    }

    private static boolean isPassword(RuntimeParamDefine definition) {
        return "password".equals(definition.getType());
    }

    private static Map<String, PluginParam> uniqueStoredByField(List<PluginParam> params) {
        Map<String, PluginParam> result = new HashMap<>();
        for (PluginParam param : params) {
            if (param == null || !StringUtils.hasText(param.getField())
                    || result.putIfAbsent(param.getField(), param) != null) {
                throw new IllegalArgumentException("Stored plugin parameters are invalid");
            }
        }
        return result;
    }

}
