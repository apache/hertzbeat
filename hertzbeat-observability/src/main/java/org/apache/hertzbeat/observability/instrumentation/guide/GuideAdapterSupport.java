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

package org.apache.hertzbeat.observability.instrumentation.guide;

import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideSnippet;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideStep;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.StepType;

/** Shared construction helpers for language adapters. */
final class GuideAdapterSupport {

    private GuideAdapterSupport() {
    }

    static GuideStep install(GuideSnippet... snippets) {
        return step("install", StepType.INSTALL, "instrumentation.step.install",
                "instrumentation.location.application_host", snippets);
    }

    static GuideStep start(GuideSnippet... snippets) {
        return step("start", StepType.START, "instrumentation.step.start",
                "instrumentation.location.application_process", snippets);
    }

    static GuideStep container(GuideSnippet... snippets) {
        return step("container", StepType.CONTAINER, "instrumentation.step.container",
                "instrumentation.location.container_definition", snippets);
    }

    static GuideStep disable(GuideSnippet... snippets) {
        return step("disable", StepType.DISABLE, "instrumentation.step.disable",
                "instrumentation.location.application_process", snippets);
    }

    static GuideSnippet snippet(String id, String language, String content) {
        return new GuideSnippet(id, language, content, List.of());
    }

    static String dependencyVersion(MethodOption method, String name) {
        return method.component().dependencies().stream()
                .filter(dependency -> name.equals(dependency.name()))
                .map(dependency -> dependency.version())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Catalog dependency is missing: " + name));
    }

    private static GuideStep step(
            String id, StepType type, String titleKey, String locationKey, GuideSnippet... snippets) {
        return new GuideStep(id, type, titleKey, locationKey, List.of(snippets));
    }
}
