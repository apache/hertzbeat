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

package org.apache.hertzbeat.observability.instrumentation.v2.guide;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.GuideBlock;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.springframework.stereotype.Component;

/** Small recipe-keyed registry for backend-owned non-application guide templates. */
@Component
public class InstrumentationSourceGuideV2Registry {

    private final Map<String, Function<GuideContext, List<GuideBlock>>> templates;

    public InstrumentationSourceGuideV2Registry() {
        Function<GuideContext, List<GuideBlock>> openTelemetry =
                context -> InstrumentationSourceGuideV2Templates.openTelemetry(context);
        this.templates = Map.of(
                "hertzbeat_hybrid_collector",
                context -> InstrumentationSourceGuideV2Templates.hybridCollector(context),
                "opentelemetry_collector",
                openTelemetry,
                "existing_otlp",
                openTelemetry,
                "logstash",
                context -> InstrumentationSourceGuideV2Templates.logstash(context),
                "vector",
                context -> InstrumentationSourceGuideV2Templates.vector(context),
                "hertzbeat_host_metrics",
                context -> InstrumentationSourceGuideV2Templates.hostMetrics(context),
                "hertzbeat_prometheus",
                context -> InstrumentationSourceGuideV2Templates.prometheus(context),
                "hertzbeat_file_logs",
                context -> InstrumentationSourceGuideV2Templates.fileLogs(context));
    }

    public static InstrumentationSourceGuideV2Registry official() {
        return new InstrumentationSourceGuideV2Registry();
    }

    public boolean supports(String recipeId) {
        return templates.containsKey(recipeId);
    }

    public List<GuideBlock> render(String recipeId, GuideContext context) {
        Function<GuideContext, List<GuideBlock>> template = templates.get(recipeId);
        if (template == null) {
            throw new InstrumentationV2RequestException(ErrorCode.SELECTION_INVALID);
        }
        return List.copyOf(template.apply(Objects.requireNonNull(context, "context")));
    }

    /** Safe server-resolved values available to templates. */
    public record GuideContext(
            String endpoint,
            String protocol,
            ServiceIdentity service,
            Authentication authentication) {
        public GuideContext {
            Objects.requireNonNull(endpoint, "endpoint");
            Objects.requireNonNull(protocol, "protocol");
            Objects.requireNonNull(service, "service");
            Objects.requireNonNull(authentication, "authentication");
        }
    }
}
