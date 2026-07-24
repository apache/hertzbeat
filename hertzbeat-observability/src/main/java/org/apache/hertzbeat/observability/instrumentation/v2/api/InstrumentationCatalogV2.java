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

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
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

    /** Complete catalog. */
    public record CatalogResponse(int schemaVersion, List<SourceOption> sources, List<RecipeOption> recipes) {
        public CatalogResponse {
            if (schemaVersion != SCHEMA_VERSION) {
                throw new IllegalArgumentException("Unsupported Instrumentation v2 schema");
            }
            sources = safeList(sources, "sources");
            recipes = safeList(recipes, "recipes");
        }
    }

    /** One top-level decision. */
    public record SourceOption(SourceKind kind, String labelKey, String descriptionKey) {
        public SourceOption {
            Objects.requireNonNull(kind, "kind");
            requireKey(labelKey);
            requireKey(descriptionKey);
        }
    }

    /** A small, selectable recipe rather than rendered tutorial prose. */
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
        Objects.requireNonNull(values, label);
        if (values.size() > MAX_OPTIONS || values.stream().anyMatch(Objects::isNull)
                || new HashSet<>(values).size() != values.size()) {
            throw new IllegalArgumentException("Instrumentation v2 list is invalid");
        }
        return List.copyOf(values);
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
}
