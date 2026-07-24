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

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ComponentVersionPolicy;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.FrameworkOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.LanguageOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialComponent;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.BlockType;
import org.springframework.stereotype.Service;

/** Builds the small v2 decision catalog from the frozen v1 application capability matrix. */
@Service
public class InstrumentationCatalogV2Service {

    private final InstrumentationCatalogService v1Catalog;
    private final CatalogResponse catalog;

    public InstrumentationCatalogV2Service(InstrumentationCatalogService v1Catalog) {
        this.v1Catalog = v1Catalog;
        this.catalog = build(v1Catalog);
    }

    public CatalogResponse catalog() {
        return catalog;
    }

    public RecipeOption requireRecipe(SourceKind kind, String recipeId) {
        return catalog.recipes().stream()
                .filter(recipe -> recipe.kind() == kind && recipe.id().equals(recipeId))
                .findFirst()
                .orElseThrow(() -> new org.apache.hertzbeat.observability.instrumentation.v2.api
                        .InstrumentationV2RequestException(org.apache.hertzbeat.observability.instrumentation.v2.api
                                .InstrumentationV2RequestException.ErrorCode.SELECTION_INVALID));
    }

    public MethodOption requireApplicationMethod(RecipeOption recipe) {
        if (recipe.kind() != SourceKind.APPLICATION) {
            throw new IllegalArgumentException("Application recipe is required");
        }
        return v1Catalog.requireMethod(recipe.language(), recipe.framework(), recipe.method());
    }

    private CatalogResponse build(InstrumentationCatalogService v1Catalog) {
        List<RecipeOption> recipes = new ArrayList<>();
        recipes.add(quickStart());
        for (LanguageOption language : v1Catalog.catalog().languages()) {
            for (FrameworkOption framework : language.frameworks()) {
                for (MethodOption method : framework.methods()) {
                    recipes.add(new RecipeOption(
                            recipeId(language, framework, method),
                            SourceKind.APPLICATION,
                            "instrumentation.v2.recipe." + recipeId(language, framework, method),
                            method.preview(),
                            language.language(),
                            framework.framework(),
                            method.method(),
                            method.environments(),
                            method.platforms(),
                            method.signals(),
                            List.of(method.component()),
                            List.of(BlockType.DOWNLOAD, BlockType.ENVIRONMENT, BlockType.COMMAND, BlockType.CHECK)));
                }
            }
        }
        recipes.add(existingOpenTelemetry());
        return new CatalogResponse(
                2,
                List.of(
                        source(SourceKind.QUICK_START),
                        source(SourceKind.APPLICATION),
                        source(SourceKind.EXISTING_OPENTELEMETRY)),
                recipes);
    }

    private SourceOption source(SourceKind kind) {
        String suffix = kind.code();
        return new SourceOption(
                kind, "instrumentation.v2.source." + suffix, "instrumentation.v2.source." + suffix + ".description");
    }

    private RecipeOption quickStart() {
        OfficialComponent demo = new OfficialComponent(
                "OpenTelemetry telemetrygen",
                "https://github.com/open-telemetry/opentelemetry-collector-contrib/"
                        + "tree/v0.156.0/cmd/telemetrygen",
                "0.156.0",
                ComponentVersionPolicy.PINNED,
                "Apache-2.0",
                "instrumentation.location.application_host",
                true,
                false,
                List.of(),
                List.of());
        return new RecipeOption(
                "opentelemetry_telemetrygen",
                SourceKind.QUICK_START,
                "instrumentation.v2.recipe.opentelemetry_telemetrygen",
                false,
                null,
                null,
                null,
                List.of(Environment.VM),
                List.of(
                        Platform.LINUX_AMD64,
                        Platform.LINUX_ARM64,
                        Platform.MACOS_AMD64,
                        Platform.MACOS_ARM64),
                supportedSignals(),
                List.of(demo),
                List.of(
                        BlockType.DOWNLOAD,
                        BlockType.COMMAND,
                        BlockType.CHECK,
                        BlockType.NOTE));
    }

    private RecipeOption existingOpenTelemetry() {
        OfficialComponent component = new OfficialComponent(
                "OpenTelemetry",
                "https://opentelemetry.io/docs/",
                null,
                ComponentVersionPolicy.LANGUAGE_SPECIFIC,
                "Apache-2.0",
                "instrumentation.location.application_host",
                true,
                false,
                List.of(),
                List.of());
        return new RecipeOption(
                "existing_otlp",
                SourceKind.EXISTING_OPENTELEMETRY,
                "instrumentation.v2.recipe.existing_otlp",
                false,
                null,
                null,
                null,
                List.of(),
                List.of(Platform.ANY),
                supportedSignals(),
                List.of(component),
                List.of(BlockType.ENVIRONMENT, BlockType.CODE, BlockType.COMMAND, BlockType.CHECK));
    }

    private SignalCapabilities supportedSignals() {
        return new SignalCapabilities(
                org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability.SUPPORTED,
                org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability.SUPPORTED,
                org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability.SUPPORTED);
    }

    private String recipeId(LanguageOption language, FrameworkOption framework, MethodOption method) {
        if (language.language()
                == org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language.GO
                && method.method()
                == org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method.EBPF) {
            return "go_ebpf_preview";
        }
        return language.language().name().toLowerCase(Locale.ROOT) + "_"
                + framework.framework().name().toLowerCase(Locale.ROOT) + "_"
                + method.method().name().toLowerCase(Locale.ROOT)
                + (method.preview() ? "_preview" : "");
    }
}
