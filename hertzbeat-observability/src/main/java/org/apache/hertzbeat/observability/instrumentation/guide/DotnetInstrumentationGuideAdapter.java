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
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.springframework.stereotype.Component;

/** Official OpenTelemetry .NET Automatic Instrumentation guidance. */
@Component
public class DotnetInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.DOTNET;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        String version = method.component().version();
        boolean windows = request.platform() == Platform.WINDOWS_AMD64;
        String install;
        String start;
        String disable;
        String scriptLanguage;
        if (windows) {
            scriptLanguage = "powershell";
            install = "$moduleUrl = 'https://github.com/open-telemetry/"
                    + "opentelemetry-dotnet-instrumentation/releases/download/v" + version
                    + "/OpenTelemetry.DotNet.Auto.psm1'\n"
                    + "$modulePath = Join-Path $env:TEMP 'OpenTelemetry.DotNet.Auto.psm1'\n"
                    + "Invoke-WebRequest -Uri $moduleUrl -OutFile $modulePath -UseBasicParsing\n"
                    + "Import-Module $modulePath\nInstall-OpenTelemetryCore";
            start = "Import-Module 'C:\\Program Files\\OpenTelemetry .NET AutoInstrumentation\\"
                    + "OpenTelemetry.DotNet.Auto.psm1'\n"
                    + "Register-OpenTelemetryForCurrentSession -OTelServiceName $env:OTEL_SERVICE_NAME\n"
                    + ".\\Application.exe";
            disable = "# Start a new session without Register-OpenTelemetryForCurrentSession, then restart";
        } else {
            scriptLanguage = "bash";
            install = "curl -sSfL https://github.com/open-telemetry/"
                    + "opentelemetry-dotnet-instrumentation/releases/download/v" + version
                    + "/otel-dotnet-auto-install.sh -O\nsh ./otel-dotnet-auto-install.sh";
            start = ". $HOME/.otel-dotnet-auto/instrument.sh\ndotnet Application.dll";
            disable = "# Restart the application without sourcing $HOME/.otel-dotnet-auto/instrument.sh";
        }
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(
                        GuideAdapterSupport.snippet("install-command", scriptLanguage, install)),
                GuideAdapterSupport.start(
                        GuideAdapterSupport.snippet("start-command", scriptLanguage, start)),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config",
                        "dockerfile",
                        "# Run the same pinned upstream install script during the application image build")),
                GuideAdapterSupport.disable(
                        GuideAdapterSupport.snippet("disable-command", scriptLanguage, disable)));
    }
}
