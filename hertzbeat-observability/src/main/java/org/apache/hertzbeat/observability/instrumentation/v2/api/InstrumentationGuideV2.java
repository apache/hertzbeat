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
import java.net.URI;
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
    private static final Set<String> SECRET_PLACEHOLDER_ALLOWLIST = Set.of("authorizationToken");

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
            if (blocks.stream().map(GuideBlock::id).distinct().count() != blocks.size()) {
                throw new IllegalArgumentException("Instrumentation guide block IDs must be unique");
            }
            validateSecretPlaceholders(secretPlaceholders, blocks);
        }
    }

    /** One closed-vocabulary renderer block. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record GuideBlock(
            String id,
            BlockType type,
            String titleKey,
            String bodyKey,
            String executionLocationKey,
            String language,
            String content,
            String href,
            List<String> placeholders) {
        public GuideBlock {
            if (id == null || !id.matches("[a-z0-9_]{1,64}") || type == null
                    || !safeKey(titleKey) || !safeKey(executionLocationKey)
                    || bodyKey != null && !safeKey(bodyKey)) {
                throw new IllegalArgumentException("Instrumentation guide block metadata is invalid");
            }
            placeholders = List.copyOf(Objects.requireNonNull(placeholders, "placeholders"));
            if (new HashSet<>(placeholders).size() != placeholders.size()
                    || !SECRET_PLACEHOLDER_ALLOWLIST.containsAll(placeholders)) {
                throw new IllegalArgumentException("Instrumentation guide placeholder is not allowed");
            }
            switch (type) {
                case COMMAND, CODE, ENVIRONMENT, DOWNLOAD -> {
                    if (language == null || language.isBlank() || content == null || content.isBlank()
                            || content.stripLeading().startsWith("instrumentation.") || bodyKey != null
                            || type != BlockType.DOWNLOAD && href != null) {
                        throw new IllegalArgumentException("Copyable guide block is invalid");
                    }
                    if (href != null) {
                        requireHttpsHref(href);
                    }
                }
                case LINK -> {
                    if (content != null || language != null || bodyKey != null || !placeholders.isEmpty()) {
                        throw new IllegalArgumentException("Link guide block is invalid");
                    }
                    requireHttpsHref(href);
                }
                case NOTE, WARNING, CHECK -> {
                    if (bodyKey == null || content != null || language != null || href != null
                            || !placeholders.isEmpty()) {
                        throw new IllegalArgumentException("Explanatory guide block is invalid");
                    }
                }
                default -> throw new IllegalArgumentException("Guide block type is invalid");
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

    private static void validateSecretPlaceholders(
            Map<String, SecretPlaceholder> placeholders, List<GuideBlock> blocks) {
        if (!SECRET_PLACEHOLDER_ALLOWLIST.containsAll(placeholders.keySet())
                || placeholders.values().stream().anyMatch(Objects::isNull)
                || new HashSet<>(placeholders.values().stream().map(SecretPlaceholder::marker).toList()).size()
                != placeholders.size()) {
            throw new IllegalArgumentException("Instrumentation secret declarations are invalid");
        }
        Set<String> referenced = new HashSet<>();
        for (GuideBlock block : blocks) {
            for (String name : block.placeholders()) {
                SecretPlaceholder placeholder = placeholders.get(name);
                if (placeholder == null || block.content() == null
                        || !block.content().contains(placeholder.marker())) {
                    throw new IllegalArgumentException("Instrumentation secret reference is invalid");
                }
                referenced.add(name);
            }
            for (Map.Entry<String, SecretPlaceholder> entry : placeholders.entrySet()) {
                if (block.content() != null && block.content().contains(entry.getValue().marker())
                        && !block.placeholders().contains(entry.getKey())) {
                    throw new IllegalArgumentException("Instrumentation secret marker is undeclared");
                }
            }
        }
        if (!referenced.containsAll(placeholders.keySet())) {
            throw new IllegalArgumentException("Every instrumentation secret must be referenced");
        }
        if (!placeholders.containsKey("authorizationToken") && blocks.stream()
                .map(GuideBlock::content)
                .filter(Objects::nonNull)
                .anyMatch(content -> content.contains("${HERTZBEAT_TOKEN}"))) {
            throw new IllegalArgumentException("Instrumentation secret marker is undeclared");
        }
    }

    private static boolean safeKey(String value) {
        return value != null && value.matches("[a-z0-9_.]{1,160}");
    }

    private static void requireHttpsHref(String value) {
        try {
            URI uri = URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException("Instrumentation guide href is invalid");
            }
        } catch (NullPointerException | IllegalArgumentException exception) {
            throw new IllegalArgumentException("Instrumentation guide href is invalid");
        }
    }
}
