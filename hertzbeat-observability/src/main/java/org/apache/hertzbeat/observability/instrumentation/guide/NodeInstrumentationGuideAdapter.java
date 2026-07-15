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

/** Official Node.js automatic instrumentation guidance. */
@Component
public class NodeInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.NODEJS;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet(
                        "install-command",
                        "bash",
                        "npm install --save @opentelemetry/auto-instrumentations-node@"
                                + method.component().version())),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "start-command",
                        "bash",
                        "NODE_OPTIONS='--require @opentelemetry/auto-instrumentations-node/register' node app.js")),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "container-config",
                        "dockerfile",
                        "ENV NODE_OPTIONS=--require\\ @opentelemetry/auto-instrumentations-node/register")),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "disable-command",
                        "bash",
                        "# Remove the OpenTelemetry entry from NODE_OPTIONS, then restart")));
    }
}
