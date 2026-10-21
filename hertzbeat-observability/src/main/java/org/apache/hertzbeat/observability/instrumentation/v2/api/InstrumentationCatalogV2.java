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

package org.apache.hertzbeat.observability.instrumentation.v2.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialComponent;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;

/** Typed version 2 source and recipe decision model. */
public final class InstrumentationCatalogV2 {

    public static final int SCHEMA_VERSION = 2;
    private static final int MAX_OPTIONS = 64;
    private static final int MAX_GROUPS = 16;
    private static final int MAX_SOURCES = 256;
    private static final int MAX_REFERENCES = 32;

    private InstrumentationCatalogV2() {
    }

    /** User's existing instrumentation state. */
    public enum SourceKind {
        QUICK_START("quick_start"),
        APPLICATION("application"),
        EXISTING_OPENTELEMETRY("existing_opentelemetry");

        private final String code;

        SourceKind(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Product support state, distinct from each signal's capability. */
    public enum Support {
        SUPPORTED("supported"),
        PREVIEW("preview"),
        UNSUPPORTED("unsupported");

        private final String code;

        Support(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Complete catalog. */
    public record CatalogResponse(
            int schemaVersion,
            List<SourceGroup> groups,
            List<SourceEntry> sources,
            List<RecipeOption> recipes) {
        public CatalogResponse {
            if (schemaVersion != SCHEMA_VERSION) {
                throw new IllegalArgumentException("Unsupported Instrumentation v2 schema");
            }
            groups = safeList(groups, MAX_GROUPS, "groups");
            sources = safeList(sources, MAX_SOURCES, "sources");
            recipes = safeList(recipes, "recipes");
            if (groups.stream().map(SourceGroup::id).distinct().count() != groups.size()
                    || sources.stream().map(SourceEntry::id).distinct().count() != sources.size()
                    || recipes.stream().map(RecipeOption::id).distinct().count() != recipes.size()) {
                throw new IllegalArgumentException("Instrumentation catalog IDs must be unique");
            }
            Set<String> groupIds = groups.stream()
                    .map(SourceGroup::id)
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());
            if (sources.stream()
                    .flatMap(source -> source.groupIds().stream())
                    .anyMatch(groupId -> !groupIds.contains(groupId))) {
                throw new IllegalArgumentException("Instrumentation source group reference is unknown");
            }
        }
    }

    /** One stable catalog group. */
    public record SourceGroup(String id, String labelKey) {
        public SourceGroup {
            requireId(id);
            requireKey(labelKey);
        }
    }

    /** One concrete source-directory entry. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SourceEntry(
            String id,
            String labelKey,
            String descriptionKey,
            String iconKey,
            List<String> groupIds,
            Support support,
            SourceKind sourceKind,
            List<String> recipeIds,
            SignalCapabilities signals,
            String documentationUrl) {
        public SourceEntry {
            requireId(id);
            requireKey(labelKey);
            requireKey(descriptionKey);
            requireIcon(iconKey);
            groupIds = safeIds(groupIds);
            recipeIds = safeIds(recipeIds);
            Objects.requireNonNull(support, "support");
            requireSignals(signals);
            if (groupIds.isEmpty()
                    || support == Support.UNSUPPORTED
                    && (sourceKind != null
                    || !recipeIds.isEmpty()
                    || signals.metrics() != Capability.UNSUPPORTED
                    || signals.logs() != Capability.UNSUPPORTED
                    || signals.traces() != Capability.UNSUPPORTED)
                    || support != Support.UNSUPPORTED && (sourceKind == null || recipeIds.isEmpty())) {
                throw new IllegalArgumentException("Instrumentation source entry is inconsistent");
            }
            if (documentationUrl != null) {
                requireHttps(documentationUrl);
            }
        }
    }

    /** A small, selectable recipe rather than rendered tutorial prose. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RecipeOption(
            String id,
            SourceKind kind,
            String labelKey,
            boolean preview,
            Language language,
            Framework framework,
            Method method,
            List<Environment> environments,
            List<Platform> platforms,
            SignalCapabilities signals,
            List<OfficialComponent> components,
            List<BlockType> blocksPreview) {
        public RecipeOption {
            requireId(id);
            Objects.requireNonNull(kind, "kind");
            requireKey(labelKey);
            environments = safeList(environments, "environments");
            platforms = safeList(platforms, "platforms");
            components = safeList(components, "components");
            blocksPreview = safeList(blocksPreview, "blocksPreview");
        }
    }

    private static <T> List<T> safeList(List<T> values, String label) {
        return safeList(values, MAX_OPTIONS, label);
    }

    private static <T> List<T> safeList(List<T> values, int maximum, String label) {
        Objects.requireNonNull(values, label);
        if (values.size() > maximum || values.stream().anyMatch(Objects::isNull)
                || new HashSet<>(values).size() != values.size()) {
            throw new IllegalArgumentException("Instrumentation v2 list is invalid");
        }
        return List.copyOf(values);
    }

    private static List<String> safeIds(List<String> values) {
        List<String> copied = safeList(values, MAX_REFERENCES, "references");
        copied.forEach(InstrumentationCatalogV2::requireId);
        return copied;
    }

    private static void requireKey(String value) {
        if (value == null || !value.matches("[a-z0-9_.]{1,128}")) {
            throw new IllegalArgumentException("Instrumentation v2 i18n key is invalid");
        }
    }

    private static void requireId(String value) {
        if (value == null || !value.matches("[a-z0-9_]{1,64}")) {
            throw new IllegalArgumentException("Instrumentation v2 recipe ID is invalid");
        }
    }

    private static void requireIcon(String value) {
        if (value == null || !value.matches("[a-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Instrumentation source icon key is invalid");
        }
    }

    private static void requireSignals(SignalCapabilities signals) {
        if (signals == null
                || signals.metrics() == null
                || signals.logs() == null
                || signals.traces() == null) {
            throw new IllegalArgumentException("Instrumentation source signals are invalid");
        }
    }

    private static void requireHttps(String value) {
        try {
            URI uri = URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || uri.getUserInfo() != null
                    || uri.getRawQuery() != null
                    || uri.getFragment() != null) {
                throw new IllegalArgumentException("Instrumentation source documentation URL is invalid");
            }
        } catch (NullPointerException | IllegalArgumentException exception) {
            throw new IllegalArgumentException("Instrumentation source documentation URL is invalid");
        }
    }
}
