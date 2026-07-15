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

import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.springframework.stereotype.Component;

/** Official PHP extension, SDK, exporter, and framework instrumentation guidance. */
@Component
public class PhpInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.PHP;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        String frameworkPackage = request.framework() == Framework.LARAVEL
                ? "open-telemetry/opentelemetry-auto-laravel:1.7.0"
                : "open-telemetry/opentelemetry-auto-psr18:1.2.0";
        String install = "pecl install opentelemetry-" + method.component().version() + "\n"
                + "composer require open-telemetry/sdk:1.14.0 open-telemetry/exporter-otlp:1.4.0 "
                + frameworkPackage;
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(
                        GuideAdapterSupport.snippet("install-command", "bash", install),
                        GuideAdapterSupport.snippet(
                                "php-extension",
                                "ini",
                                "[opentelemetry]\nextension=opentelemetry.so")),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "start-command", "bash", "OTEL_PHP_AUTOLOAD_ENABLED=true php application.php")),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config",
                        "dockerfile",
                        "RUN pecl install opentelemetry-" + method.component().version()
                                + " && docker-php-ext-enable opentelemetry\n"
                                + "ENV OTEL_PHP_AUTOLOAD_ENABLED=true")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "disable-command",
                        "bash",
                        "OTEL_PHP_AUTOLOAD_ENABLED=false php application.php")));
    }
}
