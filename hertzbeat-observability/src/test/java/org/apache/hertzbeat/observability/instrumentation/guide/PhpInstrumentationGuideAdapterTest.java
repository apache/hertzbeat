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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.stream.Collectors;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Capability;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ComponentVersionPolicy;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialComponent;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.OfficialDependency;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalCapabilities;
import org.junit.jupiter.api.Test;

class PhpInstrumentationGuideAdapterTest {

    @Test
    void rendersComposerPackagesAndVersionsFromCatalogDependencies() {
        MethodOption method = new MethodOption(
                Method.ZERO_CODE,
                "instrumentation.method.zero_code",
                false,
                List.of(Environment.DOCKER),
                List.of(Platform.LINUX_AMD64),
                new SignalCapabilities(Capability.UNSUPPORTED, Capability.UNSUPPORTED, Capability.SUPPORTED),
                new OfficialComponent(
                        "OpenTelemetry PHP extension",
                        "https://pecl.php.net/package/opentelemetry/9.8.7",
                        "9.8.7",
                        ComponentVersionPolicy.PINNED,
                        "Apache-2.0",
                        "instrumentation.location.application_host",
                        true,
                        false,
                        List.of(
                                dependency("open-telemetry/sdk", "7.6.5"),
                                dependency("open-telemetry/exporter-otlp", "6.5.4"),
                                dependency("open-telemetry/opentelemetry-auto-laravel", "5.4.3")),
                        List.of()));

        var steps = new PhpInstrumentationGuideAdapter().render(request(), method);
        String rendered = steps.install().snippets().stream()
                .map(snippet -> snippet.content())
                .collect(Collectors.joining("\n"));

        assertTrue(rendered.contains("pecl install opentelemetry-9.8.7"));
        assertTrue(rendered.contains("open-telemetry/sdk:7.6.5"));
        assertTrue(rendered.contains("open-telemetry/exporter-otlp:6.5.4"));
        assertTrue(rendered.contains("open-telemetry/opentelemetry-auto-laravel:5.4.3"));
        assertFalse(rendered.contains("1.14.0"));
        assertFalse(rendered.contains("1.4.0"));
        assertFalse(rendered.contains("1.7.0"));
    }

    private OfficialDependency dependency(String name, String version) {
        return new OfficialDependency(
                name,
                "https://packagist.org/packages/" + name,
                version,
                "Apache-2.0",
                "instrumentation.dependency.test",
                true,
                false);
    }

    private GuideRenderRequest request() {
        return new GuideRenderRequest(
                1,
                org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language.PHP,
                Framework.LARAVEL,
                Method.ZERO_CODE,
                Environment.DOCKER,
                Platform.LINUX_AMD64,
                null,
                null);
    }
}
