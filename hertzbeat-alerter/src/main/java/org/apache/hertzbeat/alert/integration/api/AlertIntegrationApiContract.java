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

package org.apache.hertzbeat.alert.integration.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Structured read contract for external alert integrations.
 */
public final class AlertIntegrationApiContract {

    private AlertIntegrationApiContract() {
    }

    /**
     * How honestly the current guide can describe a runnable integration.
     */
    public enum Readiness {
        @JsonProperty("ready")
        READY,
        @JsonProperty("configuration_required")
        CONFIGURATION_REQUIRED,
        @JsonProperty("guide_blocked")
        GUIDE_BLOCKED
    }

    /**
     * Safe public error codes.
     */
    public enum RequestErrorCode {
        SOURCE_UNSUPPORTED("external_alert_source_unsupported"),
        GUIDE_UNAVAILABLE("external_alert_guide_unavailable");

        private final String code;

        RequestErrorCode(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    /**
     * Catalog response.
     */
    public record CatalogResponse(List<CatalogItem> items) {
        public CatalogResponse {
            items = List.copyOf(items);
        }
    }

    /**
     * Lightweight catalog row.
     */
    public record CatalogItem(
            String source,
            String displayNameKey,
            String iconKey,
            Readiness readiness,
            List<String> limitations) {
        public CatalogItem {
            limitations = List.copyOf(limitations);
        }
    }

    /**
     * One rendered, token-free integration guide.
     */
    public record IntegrationGuide(
            String source,
            String displayNameKey,
            String iconKey,
            String method,
            String ingressPath,
            String payloadShape,
            Map<String, String> requiredHeaders,
            List<String> requiredFields,
            List<String> steps,
            List<String> snippets,
            String acknowledgement,
            Readiness readiness,
            List<String> limitations) {
        public IntegrationGuide {
            requiredHeaders = Map.copyOf(requiredHeaders);
            requiredFields = List.copyOf(requiredFields);
            steps = List.copyOf(steps);
            snippets = List.copyOf(snippets);
            limitations = List.copyOf(limitations);
        }

        public CatalogItem toCatalogItem() {
            return new CatalogItem(source, displayNameKey, iconKey, readiness, limitations);
        }
    }
}
