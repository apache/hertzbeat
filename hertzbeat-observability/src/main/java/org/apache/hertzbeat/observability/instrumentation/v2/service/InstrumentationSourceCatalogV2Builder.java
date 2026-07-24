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

import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.RecipeOption;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceEntry;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceGroup;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.Support;
import org.apache.hertzbeat.observability.instrumentation.v2.guide.InstrumentationSourceGuideV2Registry;

/** Builds concrete source entries for the single instrumentation catalog. */
final class InstrumentationSourceCatalogV2Builder {

    private final List<RecipeOption> recipes;
    private final InstrumentationSourceGuideV2Registry templates;

    InstrumentationSourceCatalogV2Builder(
            List<RecipeOption> recipes, InstrumentationSourceGuideV2Registry templates) {
        this.recipes = List.copyOf(recipes);
        this.templates = templates;
    }

    Directory build() {
        List<SourceGroup> groups = List.of(
                group("quick_start"),
                group("applications"),
                group("collectors"),
                group("logs"),
                group("infrastructure"),
                group("cloud"),
                group("databases"),
                group("messaging"));
        List<SourceEntry> sources = List.of(
                source(
                        "quick_start",
                        List.of("quick_start"),
                        Support.SUPPORTED,
                        SourceKind.QUICK_START,
                        List.of("opentelemetry_telemetrygen"),
                        "https://github.com/open-telemetry/opentelemetry-collector-contrib/"
                                + "tree/main/cmd/telemetrygen"),
                application(
                        "java",
                        Support.SUPPORTED,
                        List.of("java_spring_boot_zero_code", "java_java_jar_zero_code")),
                application("dotnet", Support.SUPPORTED, List.of("dotnet_aspnet_core_zero_code")),
                application(
                        "nodejs",
                        Support.SUPPORTED,
                        List.of("nodejs_nodejs_zero_code", "nodejs_express_zero_code")),
                application(
                        "python",
                        Support.SUPPORTED,
                        List.of("python_django_zero_code", "python_flask_zero_code")),
                application(
                        "php",
                        Support.SUPPORTED,
                        List.of("php_php_generic_zero_code", "php_laravel_zero_code")),
                application(
                        "go",
                        Support.SUPPORTED,
                        List.of("go_go_generic_sdk", "go_ebpf_preview")),
                application("other_languages", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                application("ruby", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                application("rust", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                application("elixir", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                application("swift", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                application("cpp", Support.PREVIEW, List.of("generic_generic_sdk_preview")),
                existing(
                        "hertzbeat_hybrid_collector",
                        List.of("collectors"),
                        Support.SUPPORTED,
                        "https://hertzbeat.apache.org/docs/"),
                existing(
                        "opentelemetry_collector",
                        List.of("collectors"),
                        Support.SUPPORTED,
                        "https://opentelemetry.io/docs/collector/"),
                existing(
                        "logstash",
                        List.of("collectors", "logs"),
                        Support.PREVIEW,
                        "https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-tcp"),
                existing(
                        "vector",
                        List.of("collectors", "logs"),
                        Support.PREVIEW,
                        "https://vector.dev/docs/reference/configuration/sinks/opentelemetry/"),
                existing(
                        "hertzbeat_host_metrics",
                        List.of("infrastructure"),
                        Support.SUPPORTED,
                        null),
                existing(
                        "hertzbeat_prometheus",
                        List.of("infrastructure"),
                        Support.SUPPORTED,
                        null),
                existing(
                        "hertzbeat_file_logs",
                        List.of("logs"),
                        Support.SUPPORTED,
                        null),
                unsupported("fluent_bit", "logs"),
                unsupported("fluentd", "logs"),
                unsupported("syslog", "logs"),
                unsupported("http_logs", "logs"),
                unsupported("docker", "infrastructure"),
                unsupported("kubernetes", "infrastructure"),
                unsupported("nginx", "infrastructure"),
                unsupported("postgresql", "databases"),
                unsupported("mysql", "databases"),
                unsupported("redis", "databases"),
                unsupported("mongodb", "databases"),
                unsupported("kafka", "messaging"),
                unsupported("rabbitmq", "messaging"),
                unsupported("aws_ec2", "cloud"),
                unsupported("aws_rds", "cloud"),
                unsupported("aws_lambda", "cloud"),
                unsupported("aws_eks", "cloud"),
                unsupported("azure_vm", "cloud"),
                unsupported("azure_aks", "cloud"),
                unsupported("gcp_compute_engine", "cloud"),
                unsupported("gcp_gke", "cloud"));
        validate(sources);
        return new Directory(groups, sources);
    }

    private SourceGroup group(String id) {
        return new SourceGroup(id, "instrumentation.v2.directory.group." + id);
    }

    private SourceEntry application(String id, Support support, List<String> recipeIds) {
        return source(
                id,
                List.of("applications"),
                support,
                SourceKind.APPLICATION,
                recipeIds,
                "https://opentelemetry.io/docs/languages/");
    }

    private SourceEntry existing(
            String id, List<String> groups, Support support, String documentationUrl) {
        return source(
                id,
                groups,
                support,
                SourceKind.EXISTING_OPENTELEMETRY,
                List.of(id),
                documentationUrl);
    }

    private SourceEntry unsupported(String id, String group) {
        return new SourceEntry(
                id,
                labelKey(id),
                descriptionKey(id),
                iconKey(id),
                List.of(group),
                Support.UNSUPPORTED,
                null,
                List.of(),
                signals(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.UNSUPPORTED),
                null);
    }

    private SourceEntry source(
            String id,
            List<String> groups,
            Support support,
            SourceKind kind,
            List<String> recipeIds,
            String documentationUrl) {
        return new SourceEntry(
                id,
                labelKey(id),
                descriptionKey(id),
                iconKey(id),
                groups,
                support,
                kind,
                recipeIds,
                aggregateSignals(kind, recipeIds),
                documentationUrl);
    }

    private void validate(List<SourceEntry> sources) {
        for (SourceEntry source : sources) {
            for (String recipeId : source.recipeIds()) {
                RecipeOption recipe = requireRecipe(source.sourceKind(), recipeId);
                if (recipe.kind() != source.sourceKind()
                        || source.sourceKind() == SourceKind.EXISTING_OPENTELEMETRY
                        && !templates.supports(recipeId)) {
                    throw new IllegalArgumentException("Instrumentation source recipe is not renderable");
                }
            }
        }
    }

    private SignalCapabilities aggregateSignals(SourceKind kind, List<String> recipeIds) {
        return signals(
                aggregateSignal(kind, recipeIds, Signal.METRICS),
                aggregateSignal(kind, recipeIds, Signal.LOGS),
                aggregateSignal(kind, recipeIds, Signal.TRACES));
    }

    private Capability aggregateSignal(SourceKind kind, List<String> recipeIds, Signal signal) {
        List<Capability> capabilities = recipeIds.stream()
                .map(recipeId -> requireRecipe(kind, recipeId).signals().capability(signal))
                .toList();
        if (capabilities.contains(Capability.SUPPORTED)) {
            return Capability.SUPPORTED;
        }
        return capabilities.contains(Capability.PREVIEW) ? Capability.PREVIEW : Capability.UNSUPPORTED;
    }

    private RecipeOption requireRecipe(SourceKind kind, String recipeId) {
        return recipes.stream()
                .filter(recipe -> recipe.kind() == kind && recipe.id().equals(recipeId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Instrumentation source recipe is unknown"));
    }

    private String labelKey(String id) {
        return "instrumentation.v2.directory.source." + id;
    }

    private String descriptionKey(String id) {
        return labelKey(id) + "_description";
    }

    private String iconKey(String id) {
        return id.replace('_', '-');
    }

    private SignalCapabilities signals(Capability metrics, Capability logs, Capability traces) {
        return new SignalCapabilities(metrics, logs, traces);
    }

    record Directory(List<SourceGroup> groups, List<SourceEntry> sources) {
        Directory {
            groups = List.copyOf(groups);
            sources = List.copyOf(sources);
        }
    }
}
