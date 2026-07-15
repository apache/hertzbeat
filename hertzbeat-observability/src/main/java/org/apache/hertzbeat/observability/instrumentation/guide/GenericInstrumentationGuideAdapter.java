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

/** Generic contract that intentionally defers executable commands to a pinned language adapter. */
@Component
public class GenericInstrumentationGuideAdapter implements InstrumentationGuideAdapter {

    @Override
    public Language language() {
        return Language.GENERIC;
    }

    @Override
    public LanguageGuideSteps render(GuideRenderRequest request, MethodOption method) {
        String notice = "Select the concrete language adapter to receive pinned executable commands.";
        return new LanguageGuideSteps(
                GuideAdapterSupport.install(GuideAdapterSupport.snippet(
                        "language-required", "text", notice)),
                GuideAdapterSupport.start(GuideAdapterSupport.snippet(
                        "language-required", "text", notice)),
                GuideAdapterSupport.container(GuideAdapterSupport.snippet(
                        "language-required", "text", notice)),
                GuideAdapterSupport.disable(GuideAdapterSupport.snippet(
                        "language-required", "text", notice)));
    }
}
