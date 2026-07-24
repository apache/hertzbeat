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

package org.apache.hertzbeat.manager.service.plugin;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.plugin.PluginConfig;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * In-memory plugin definition and encrypted parameter registry.
 */
@Component
public class PluginParameterRegistry {

    private final Map<Long, PluginConfig> definitions = new ConcurrentHashMap<>();

    private final Map<Long, List<PluginParam>> storedParameters = new ConcurrentHashMap<>();

    public void registerDefinition(long pluginMetadataId, PluginConfig config) {
        definitions.put(pluginMetadataId, validatedCopy(config));
    }

    public Optional<PluginConfig> definition(long pluginMetadataId) {
        return Optional.ofNullable(definitions.get(pluginMetadataId)).map(PluginParameterRegistry::copy);
    }

    public void clearDefinitions() {
        definitions.clear();
    }

    public void replaceStoredParameters(long pluginMetadataId, List<PluginParam> params) {
        storedParameters.put(pluginMetadataId, copy(params));
    }

    public void remove(long pluginMetadataId) {
        definitions.remove(pluginMetadataId);
        storedParameters.remove(pluginMetadataId);
    }

    public List<PluginParam> storedParameters(long pluginMetadataId) {
        return copy(storedParameters.getOrDefault(pluginMetadataId, List.of()));
    }

    public List<Configmap> runtimeParameters(long pluginMetadataId) {
        PluginConfig config = definitions.get(pluginMetadataId);
        if (config == null || config.getParams() == null) {
            return List.of();
        }
        Map<String, PluginParam> storedByField = new HashMap<>();
        for (PluginParam stored : storedParameters.getOrDefault(pluginMetadataId, List.of())) {
            storedByField.putIfAbsent(stored.getField(), stored);
        }
        return config.getParams().stream()
                .filter(Objects::nonNull)
                .map(definition -> runtimeCopy(definition, storedByField.get(definition.getField())))
                .flatMap(Optional::stream)
                .toList();
    }

    public PluginContext runtimeContext(long pluginMetadataId) {
        return PluginContext.builder().params(runtimeParameters(pluginMetadataId)).build();
    }

    private static Optional<Configmap> runtimeCopy(RuntimeParamDefine definition, PluginParam param) {
        if (definition == null || param == null) {
            return Optional.empty();
        }
        String value = param.getParamValue();
        byte type = PluginParameterTypes.fromDefinition(definition.getType());
        if (value != null && type == CommonConstants.PARAM_TYPE_PASSWORD && AesUtil.isCiphertext(value)) {
            value = AesUtil.aesDecode(value);
        }
        return Optional.of(new Configmap(definition.getField(), value, type));
    }

    private static List<PluginParam> copy(List<PluginParam> params) {
        return params.stream().map(param -> PluginParam.builder()
                        .pluginMetadataId(param.getPluginMetadataId())
                        .field(param.getField())
                        .paramValue(param.getParamValue())
                        .type(param.getType())
                        .build())
                .toList();
    }

    private static PluginConfig validatedCopy(PluginConfig config) {
        if (config == null) {
            throw new IllegalArgumentException("Plugin parameter definition is invalid");
        }
        PluginConfig result = copy(config);
        Set<String> fields = new HashSet<>();
        for (RuntimeParamDefine definition : result.getParams()) {
            if (definition == null || !StringUtils.hasText(definition.getField())
                    || !StringUtils.hasText(definition.getType()) || !fields.add(definition.getField())) {
                throw new IllegalArgumentException("Plugin parameter definition is invalid");
            }
        }
        return result;
    }

    private static PluginConfig copy(PluginConfig config) {
        PluginConfig result = new PluginConfig();
        List<RuntimeParamDefine> params = config.getParams() == null ? List.of() : config.getParams();
        result.setParams(params.stream().map(PluginParameterRegistry::copy).toList());
        return result;
    }

    private static RuntimeParamDefine copy(RuntimeParamDefine source) {
        if (source == null) {
            return null;
        }
        return RuntimeParamDefine.builder()
                .app(source.getApp())
                .name(source.getName() == null ? null : new HashMap<>(source.getName()))
                .field(source.getField())
                .type(source.getType())
                .required(source.isRequired())
                .defaultValue(source.getDefaultValue())
                .placeholder(source.getPlaceholder())
                .range(source.getRange())
                .limit(source.getLimit())
                .options(source.getOptions() == null ? null : source.getOptions().stream()
                        .map(option -> {
                            if (option == null) {
                                throw new IllegalArgumentException("Plugin parameter definition is invalid");
                            }
                            return new RuntimeParamDefine.Option(option.getLabel(), option.getValue());
                        }).toList())
                .keyAlias(source.getKeyAlias())
                .valueAlias(source.getValueAlias())
                .hide(source.isHide())
                .depend(copyDepend(source.getDepend()))
                .build();
    }

    private static Map<String, List<Object>> copyDepend(Map<String, List<Object>> source) {
        if (source == null) {
            return null;
        }
        Map<String, List<Object>> result = new HashMap<>();
        source.forEach((key, values) -> result.put(key, values == null ? null : List.copyOf(values)));
        return result;
    }
}
