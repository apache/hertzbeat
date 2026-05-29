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

package org.apache.hertzbeat.observability.ingestion.security;

import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.springframework.stereotype.Component;

/**
 * Resolves authenticated OTLP ingest request context for signal enrichment and intake records.
 */
@Component
public class OtlpIngestionRequestContextResolver {

    public OtlpCorrelationContext currentCorrelationContext() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (StringUtils.isBlank(workspaceId)) {
            return OtlpCorrelationContext.empty();
        }
        return new OtlpCorrelationContext(null, null, workspaceId);
    }

    public Map<String, String> withWorkspaceResourceAttributes(Map<String, String> resourceAttributes) {
        Map<String, String> resolved = new LinkedHashMap<>();
        if (resourceAttributes != null) {
            resolved.putAll(resourceAttributes);
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (StringUtils.isNotBlank(workspaceId)) {
            resolved.put(OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID, workspaceId);
        }
        return resolved;
    }
}
