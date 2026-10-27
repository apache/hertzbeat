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

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;

import java.util.Locale;
import java.util.Map;

/** Bounded app/metric/field metadata. Never a measurement or external health result. */
public final class AgentHierarchyReadOutput {
    private AgentHierarchyReadOutput() {}

    public static String application(String app) {
        if (app == null || app.isBlank()) return "";
        String value = app.trim().toLowerCase(Locale.ROOT);
        if (!value.matches("[a-z0-9_.:-]{1,128}"))
            throw new IllegalArgumentException("Invalid application identifier");
        return value;
    }

    public static String language(String language) {
        String value = language == null || language.isBlank() ? "en-US" : language.trim();
        if (!value.matches("[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8}){0,4}"))
            throw new IllegalArgumentException("Invalid language tag");
        return value;
    }

    public static Map<String, Object> view(String app, String language, Object rows) {
        var result = AgentManagementOutputSupport.view(rows);
        result.put("readVersion", "app-hierarchy.v1");
        result.put("application", application(app));
        result.put("language", language(language));
        return result;
    }
}
