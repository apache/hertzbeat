/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialComponent;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;

/** Structured guide request and generic-renderer block response. */
public final class InstrumentationGuideV2 {

    private static final int MAX_BLOCKS = 32;
    private static final Set<String> PLACEHOLDER_ALLOWLIST = Set.of(
            "endpoint", "protocol", "serviceName", "serviceNamespace", "environment", "authorizationToken");

    private InstrumentationGuideV2() {
    }

    /** Closed vocabulary supported by the generic React renderer. */
    public enum BlockType {
        COMMAND("command"),
        CODE("code"),
        ENVIRONMENT("environment"),
        DOWNLOAD("download"),
        NOTE("note"),
        WARNING("warning"),
        LINK("link"),
        CHECK("check");

        private final String code;

        BlockType(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Recipe or application selection plus an independently chosen intake profile. */
    public record RenderRequest(
            int schemaVersion,
            SourceKind sourceKind,
            String recipeId,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            String intakeProfileId,
            ServiceIdentity service) {
    }

    /** Complete guide output. */
    public record RenderResponse(
            int schemaVersion,
            SourceKind sourceKind,
            String recipeId,
            IntakeProfile intakeProfile,
            ServiceIdentity service,
            SignalCapabilities signals,
            List<OfficialComponent> components,
            Map<String, SecretPlaceholder> secretPlaceholders,
            List<GuideBlock> blocks) {
        public RenderResponse {
            if (schemaVersion != InstrumentationCatalogV2.SCHEMA_VERSION) {
                throw new IllegalArgumentException("Unsupported Instrumentation v2 schema");
            }
            components = List.copyOf(Objects.requireNonNull(components, "components"));
            secretPlaceholders = Map.copyOf(Objects.requireNonNull(secretPlaceholders, "secretPlaceholders"));
            blocks = List.copyOf(Objects.requireNonNull(blocks, "blocks"));
            if (blocks.size() > MAX_BLOCKS || blocks.stream().anyMatch(Objects::isNull)) {
                throw new IllegalArgumentException("Instrumentation guide blocks are invalid");
            }
        }
    }

    /** One closed-vocabulary renderer block. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record GuideBlock(
            String id,
            BlockType type,
            String titleKey,
            String executionLocationKey,
            String language,
            String content,
            String href,
            List<String> placeholders) {
        public GuideBlock {
            if (id == null || !id.matches("[a-z0-9_]{1,64}") || type == null
                    || titleKey == null || executionLocationKey == null) {
                throw new IllegalArgumentException("Instrumentation guide block metadata is invalid");
            }
            placeholders = List.copyOf(Objects.requireNonNull(placeholders, "placeholders"));
            if (new HashSet<>(placeholders).size() != placeholders.size()
                    || !PLACEHOLDER_ALLOWLIST.containsAll(placeholders)) {
                throw new IllegalArgumentException("Instrumentation guide placeholder is not allowed");
            }
        }
    }

    /** Marker declaration; value is always null and excluded from JSON. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SecretPlaceholder(String marker, String kind, String value) {
        public SecretPlaceholder {
            if (!"${HERTZBEAT_TOKEN}".equals(marker) || !"authorization_token".equals(kind) || value != null) {
                throw new IllegalArgumentException("Instrumentation secret placeholder is invalid");
            }
        }

        public static SecretPlaceholder authorizationToken() {
            return new SecretPlaceholder("${HERTZBEAT_TOKEN}", "authorization_token", null);
        }
    }
}
