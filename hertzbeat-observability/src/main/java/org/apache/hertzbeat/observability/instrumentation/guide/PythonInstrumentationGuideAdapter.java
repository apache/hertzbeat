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

/** Official OpenTelemetry Python distro guidance. */
@Component
public class PythonInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.PYTHON;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        String packages = packages(method);
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet(
                        "install-command",
                        "bash",
                        "python -m pip install " + packages + "\nopentelemetry-bootstrap -a install")),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "start-command",
                        "bash",
                        "opentelemetry-instrument --logs_exporter otlp python app.py")),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config",
                        "dockerfile",
                        "RUN python -m pip install " + packages + " && opentelemetry-bootstrap -a install")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "disable-command", "bash", "# Start python directly without opentelemetry-instrument")));
    }

    private String packages(MethodOption method) {
        return "opentelemetry-distro==" + method.component().version()
                + " opentelemetry-exporter-otlp=="
                + GuideAdapterSupport.dependencyVersion(method, "opentelemetry-exporter-otlp")
                + " opentelemetry-instrumentation-logging=="
                + GuideAdapterSupport.dependencyVersion(method, "opentelemetry-instrumentation-logging");
    }
}
