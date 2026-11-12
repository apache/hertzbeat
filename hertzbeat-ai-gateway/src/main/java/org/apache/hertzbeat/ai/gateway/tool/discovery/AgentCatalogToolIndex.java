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

package org.apache.hertzbeat.ai.gateway.tool.discovery;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.springframework.ai.tool.toolsearch.ToolIndex;
import org.springframework.ai.tool.toolsearch.ToolReference;
import org.springframework.ai.tool.toolsearch.ToolSearchRequest;
import org.springframework.ai.tool.toolsearch.ToolSearchResponse;

/** Per-request standard search adapter over the existing paginated model-visible Gateway catalog. */
final class AgentCatalogToolIndex implements ToolIndex {
    private final AgentToolRegistry registry;
    private final int offset;
    private final String query;
    private AgentToolRegistry.DiscoveryPage page;

    AgentCatalogToolIndex(AgentToolRegistry registry, int offset, String query) {
        this.registry = registry;
        this.offset = offset;
        this.query = query;
    }

    @Override
    public ToolSearchResponse search(ToolSearchRequest request) {
        page = registry.discoverablePage(request.categoryFilter(), query, offset);
        return new ToolSearchResponse(page.tools().stream()
                .map(tool -> new ToolReference(tool.getName(), 1.0, tool.getDescription())).toList(), page.total(), null);
    }

    AgentToolRegistry.DiscoveryPage page() {
        return page;
    }

    @Override
    public void indexTool(String sessionId, ToolReference tool) {
        throw new UnsupportedOperationException("Gateway owns the registered tool catalog");
    }

    @Override
    public void clearIndex(String sessionId) {
        // This adapter holds no shared session index.
    }
}
