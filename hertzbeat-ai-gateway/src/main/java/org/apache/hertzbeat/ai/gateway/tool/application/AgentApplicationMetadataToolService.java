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

package org.apache.hertzbeat.ai.gateway.tool.application;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/** Bounded server application resource labels, not client translation configuration. */
@Service
public class AgentApplicationMetadataToolService {
    private final AppService apps;

    public AgentApplicationMetadataToolService(AppService apps) {
        this.apps = apps;
    }

    @Tool(
            name = "platform.i18n_resources",
            description =
                    "Read a bounded page of native application resource labels in en-US, zh-CN,"
                        + " zh-TW, ja-JP or pt-BR. This does not change the client language."
                        + " Returns at most 100 labels per call.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> i18nResources(String language, int offset, int limit) {
        if (language == null
                || !Set.of("en-US", "zh-CN", "zh-TW", "ja-JP", "pt-BR").contains(language)
                || offset < 0
                || offset > 10000
                || limit < 1
                || limit > 100)
            throw new IllegalArgumentException(
                    "Supported language and bounded pagination are required");
        var labels = apps.getI18nResources(language);
        if (labels == null) throw new IllegalStateException("Native labels unavailable");
        var items =
                labels.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .skip(offset)
                        .limit(limit)
                        .map(entry -> Map.of("key", entry.getKey(), "value", entry.getValue()))
                        .toList();
        var safe = AgentManagementOutputSupport.view(items);
        return Map.of(
                "language",
                language,
                "offset",
                offset,
                "limit",
                limit,
                "total",
                labels.size(),
                "hasMore",
                (long) offset + items.size() < labels.size(),
                "items",
                safe.get("data"),
                "partial",
                safe.get("partial"));
    }
}
