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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Contract for resolving authenticated OTLP ingest context into downstream correlation data.
 */
class OtlpIngestionRequestContextResolverTest {

    private final OtlpIngestionRequestContextResolver resolver = new OtlpIngestionRequestContextResolver();

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void shouldResolveAuthenticatedWorkspaceIntoCorrelationContext() {
        AuthTokenRequestContext.bindWorkspaceId(" prod-west ");

        OtlpCorrelationContext context = resolver.currentCorrelationContext();

        assertNull(context.ingestId());
        assertNull(context.entityId());
        assertEquals("prod-west", context.workspaceId());
    }

    @Test
    void shouldReturnEmptyCorrelationContextWhenNoWorkspaceIsBound() {
        assertEquals(OtlpCorrelationContext.empty(), resolver.currentCorrelationContext());
    }

    @Test
    void shouldApplyAuthenticatedWorkspaceToResourceAttributes() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        Map<String, String> source = new LinkedHashMap<>();
        source.put("service.name", "checkout");
        source.put(OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE, "spoofed");

        Map<String, String> resolved = resolver.withWorkspaceResourceAttributes(source);

        assertEquals("checkout", resolved.get("service.name"));
        assertEquals("prod-west", resolved.get(OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE));
        assertEquals("spoofed", source.get(OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE));
    }

    @Test
    void shouldLeaveResourceAttributesUnchangedWhenNoWorkspaceIsBound() {
        Map<String, String> source = new LinkedHashMap<>();
        source.put("service.name", "checkout");

        Map<String, String> resolved = resolver.withWorkspaceResourceAttributes(source);

        assertEquals("checkout", resolved.get("service.name"));
        assertFalse(resolved.containsKey(OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE));
    }
}
