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

/** Official OpenTelemetry Java Agent guidance. */
@Component
public class JavaInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.JAVA;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        var artifact = method.component().artifacts().getFirst();
        boolean windows = request.platform() == Platform.WINDOWS_AMD64;
        boolean macos = request.platform() == Platform.MACOS_AMD64
                || request.platform() == Platform.MACOS_ARM64;
        String install;
        String start;
        String disable;
        String scriptLanguage;
        if (windows) {
            scriptLanguage = "powershell";
            install = "$agentUrl = '" + artifact.downloadUrl() + "'\n"
                    + "Invoke-WebRequest -Uri $agentUrl -OutFile opentelemetry-javaagent.jar\n"
                    + "$expectedSha256 = '" + artifact.digest() + "'\n"
                    + "$actualSha256 = (Get-FileHash opentelemetry-javaagent.jar -Algorithm SHA256).Hash.ToLower()\n"
                    + "if ($actualSha256 -ne $expectedSha256) { throw 'Java Agent checksum mismatch' }";
            start = "$env:JAVA_TOOL_OPTIONS='-javaagent:C:\\otel\\opentelemetry-javaagent.jar'\n"
                    + "java -jar application.jar";
            disable = "# Remove -javaagent from JAVA_TOOL_OPTIONS, then restart the application";
        } else {
            scriptLanguage = "bash";
            String verificationCommand = macos ? "shasum -a 256 -c -" : "sha256sum -c -";
            install = "curl -fL -o opentelemetry-javaagent.jar " + artifact.downloadUrl() + "\n"
                    + "echo '" + artifact.digest() + "  opentelemetry-javaagent.jar' | " + verificationCommand;
            start = "JAVA_TOOL_OPTIONS='-javaagent:/opt/opentelemetry-javaagent.jar' "
                    + "java -jar application.jar";
            disable = "# Remove -javaagent from JAVA_TOOL_OPTIONS, then restart the application";
        }
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(
                        GuideAdapterSupport.snippet("install-and-verify-command", scriptLanguage, install)),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "start-command",
                        scriptLanguage,
                        start)),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config",
                        "dockerfile",
                        "COPY opentelemetry-javaagent.jar /opt/opentelemetry-javaagent.jar\n"
                                + "ENV JAVA_TOOL_OPTIONS=-javaagent:/opt/opentelemetry-javaagent.jar")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "disable-command",
                        scriptLanguage,
                        disable)));
    }
}
