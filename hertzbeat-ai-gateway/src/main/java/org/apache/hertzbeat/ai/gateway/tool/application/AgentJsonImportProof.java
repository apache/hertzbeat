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

import java.util.Map;

/**
 * Exact native JSON shape-preview binding. This conveys no authority to write or declare
 * completion.
 */
public final class AgentJsonImportProof {
    private AgentJsonImportProof() {}

    public static boolean supports(String tool) {
        return "monitor.import_preview_json".equals(tool)
                || "alert_rule.import_preview_json".equals(tool);
    }

    public static boolean matches(String tool, Map<String, Object> args, Map<String, Object> data) {
        try {
            if (!supports(tool) || !(args.get("content") instanceof String content)) return false;
            var document = AgentJsonImportDocument.parse(content, tool.startsWith("monitor."));
            return "native-json".equals(data.get("format"))
                    && Boolean.FALSE.equals(data.get("persisted"))
                    && Boolean.TRUE.equals(data.get("nativeDomainValidationPending"))
                    && document.hash().equals(data.get("previewHash"))
                    && document.names().equals(data.get("names"))
                    && data.get("count") instanceof Number count
                    && new java.math.BigDecimal(count.toString()).intValueExact()
                            == document.names().size();
        } catch (RuntimeException invalid) {
            return false;
        }
    }
}
