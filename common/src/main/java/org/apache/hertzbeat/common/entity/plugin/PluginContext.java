/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.entity.plugin;


import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.SerializationUtils;
import org.apache.hertzbeat.common.entity.job.Configmap;

/**
 * plugin context
 */
@Builder
@Slf4j
public class PluginContext {

    /**
     * params
     */
    private List<Configmap> params;
    private ParamHolder paramHolder;

    public ParamHolder param() {
        if (paramHolder == null) {
            paramHolder = new ParamHolder(params);
        }
        return paramHolder;
    }

    /**
     * management parameter operations
     */
    public static class ParamHolder {

        private final Map<String, Configmap> paramsMap;

        public ParamHolder(List<Configmap> params) {
            if (params == null) {
                paramsMap = Collections.emptyMap();
            } else {
                this.paramsMap = params.stream().collect(Collectors.toMap(Configmap::getKey, configmap -> configmap));
            }
        }


        /**
         * get string param
         *
         * @param paramName    param name;
         * @param defaultValue default value
         * @return param value
         */
        public String getString(String paramName, String defaultValue) {
            Configmap configmap = paramsMap.get(paramName);
            if (configmap == null) {
                return defaultValue;
            }
            return Optional.ofNullable(configmap.getValue()).map(Object::toString).orElse(defaultValue);
        }

        /**
         * get int param
         *
         * @param paramName    param name;
         * @param defaultValue default value
         * @return param value
         */
        public Integer getInteger(String paramName, Integer defaultValue) {
            Configmap configmap = paramsMap.get(paramName);
            if (configmap == null) {
                return defaultValue;
            }
            try {
                return Optional.ofNullable(configmap.getValue()).map(v -> Integer.parseInt(v.toString())).orElse(defaultValue);
            } catch (Exception e) {
                log.warn("int parameter type conversion error paramName:{} value:{} defaultValue:{}", paramName, configmap.getValue(), defaultValue);
                return defaultValue;
            }
        }

        /**
         * get boolean param
         *
         * @param paramName    param name;
         * @param defaultValue default value
         * @return param value
         */
        public Boolean getBoolean(String paramName, Boolean defaultValue) {
            Configmap configmap = paramsMap.get(paramName);
            if (configmap == null) {
                return defaultValue;
            }
            try {
                return Optional.ofNullable(configmap.getValue()).map(v -> Boolean.parseBoolean(v.toString())).orElse(defaultValue);
            } catch (Exception e) {
                log.warn("boolean parameter type conversion error paramName:{} value:{} defaultValue:{}", paramName, configmap.getValue(), defaultValue);
                return defaultValue;
            }
        }

        /**
         * get long param
         *
         * @param paramName    param name;
         * @param defaultValue default value
         * @return param value
         */
        public Long getLong(String paramName, Long defaultValue) {
            Configmap configmap = paramsMap.get(paramName);
            if (configmap == null) {
                return defaultValue;
            }
            try {
                return Optional.ofNullable(configmap.getValue()).map(v -> Long.parseLong(v.toString())).orElse(defaultValue);
            } catch (Exception e) {
                log.warn("long parameter type conversion error paramName:{} value:{} defaultValue:{}", paramName, configmap.getValue(), defaultValue);
                return defaultValue;
            }
        }

        /**
         * get all params
         *
         * @return param list
         */
        public List<Configmap> allParams() {
            return paramsMap.values().stream().map(SerializationUtils::clone).collect(Collectors.toList());
        }
    }
}
