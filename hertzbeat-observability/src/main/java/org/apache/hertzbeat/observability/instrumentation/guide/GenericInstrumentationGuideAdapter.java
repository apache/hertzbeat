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

import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.MethodOption;
import org.springframework.stereotype.Component;

/** Generic official SDK template that defers language-specific packages and APIs to upstream docs. */
@Component
public class GenericInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    private static final String OFFICIAL_LANGUAGE_GUIDE = "https://opentelemetry.io/docs/languages/";

    @Override
    public Language language() {
        return Language.GENERIC;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet(
                        "official-sdk-install-template",
                        "text",
                        "Follow " + OFFICIAL_LANGUAGE_GUIDE
                                + " for the application language. Install the official OpenTelemetry API, SDK, "
                                + "and OTLP exporter packages, and pin language-specific versions in the "
                                + "application dependency manifest.")),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "official-sdk-start-template",
                        "text",
                        "Initialize the official OpenTelemetry SDK before application startup. "
                                + "Build the Resource from OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES; "
                                + "configure the supported signal providers and OTLP exporters from the rendered "
                                + "OTEL_EXPORTER_* environment; register the providers; then start the application. "
                                + "Flush and shut down the providers during application shutdown.")),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "official-sdk-container-template",
                        "text",
                        "Install the same pinned language packages during the application image build. "
                                + "Keep the rendered OTEL_* configuration in the runtime environment.")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "official-sdk-disable-template",
                        "text",
                        "Remove the official SDK initialization, rebuild if required by the language, and restart "
                                + "the application. The application must remain independently runnable.")));
    }
}
