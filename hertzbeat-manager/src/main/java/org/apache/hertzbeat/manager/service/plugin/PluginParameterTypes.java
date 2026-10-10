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

import org.apache.hertzbeat.common.constants.CommonConstants;

/**
 * Server-owned runtime type mapping for plugin parameter definitions.
 */
public final class PluginParameterTypes {

    private PluginParameterTypes() {
    }

    public static byte fromDefinition(String type) {
        return switch (type) {
            case "number" -> CommonConstants.PARAM_TYPE_NUMBER;
            case "password" -> CommonConstants.PARAM_TYPE_PASSWORD;
            case "key-value", "metrics-field" -> CommonConstants.PARAM_TYPE_MAP;
            case "array" -> CommonConstants.PARAM_TYPE_ARRAY;
            default -> CommonConstants.PARAM_TYPE_STRING;
        };
    }
}
